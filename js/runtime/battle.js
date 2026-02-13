import Player from '../player/index.js'
import Enemy, { EnemyBullet } from '../npc/enemy.js'
import { Bullet, Drop, Particle, FloatingText, TrapBomb, UPGRADE_DEFINITIONS, getAvailableUpgrades } from './props.js'
import DataBus from './databus.js'
import { CONFIG } from '../base/config.js'

const databus = new DataBus()
const w = wx.getSystemInfoSync().windowWidth

export default class Battle {
  constructor() {
    this.player = new Player()
  }

  restart() {
    this.player = new Player()
    databus.levelTime = 0
    databus.bossActive = false // 确保重置为 false
    
    // 开局提示
    databus.floatingTexts.push(new FloatingText(`LEVEL ${databus.currentLevel}`, w/2, 300, '#fff', 50))
    console.log(`=== Battle Start: Level ${databus.currentLevel} ===`)
  }

  update() {
    // 如果正在选择强化，暂停所有游戏逻辑
    if (databus.isChoosingUpgrade) {
      return
    }

    if (databus.shakeTimer > 0) databus.shakeTimer--

    // 防止 NaN
    if (typeof databus.levelTime !== 'number' || isNaN(databus.levelTime)) {
        databus.levelTime = 0
    }

    // 只有在 BOSS 没激活前，时间才走
    if (!databus.bossActive) {
        databus.levelTime++
    }

    this.levelLogic()
    this.player.update({x: this.player.x + this.player.width/2, y: this.player.y + this.player.height/2})
    this.shootLogic()
    this.collisionDetection()
    this.updateEntities()
  }

  // === 关卡进度控制 ===
  levelLogic() {
      let lvIdx = databus.currentLevel - 1
      if (lvIdx >= CONFIG.LEVELS.length) lvIdx = CONFIG.LEVELS.length - 1
      let levelConfig = CONFIG.LEVELS[lvIdx] || CONFIG.LEVELS[0]
      
      // 算出当前秒数
      let timeSec = Math.floor(databus.levelTime / 60)
      
      // 1. 刷小怪阶段 (时间未到 且 Boss未激活)
      if (timeSec < CONFIG.bossSpawnTime) {
          let progress = timeSec / CONFIG.bossSpawnTime
          let timeFactor = 1 + Math.pow(progress, 2)
          if (isNaN(timeFactor)) timeFactor = 1
          
          // 随着时间推移，出怪越来越快
          let spawnRate = Math.floor(50 / timeFactor)
          
          if (databus.frame % spawnRate === 0) {
              let rank = Math.random() < 0.15 ? 1 : 0
              databus.enemies.push(new Enemy(rank, levelConfig, timeFactor))
          }
          
          // 最后5秒倒计时提示
          if (timeSec > CONFIG.bossSpawnTime - 6 && databus.frame % 60 === 0) {
              let count = CONFIG.bossSpawnTime - timeSec
              if (count > 0) {
                  databus.floatingTexts.push(new FloatingText(`${count}`, w/2, 200, '#ff0000', 40))
              }
          }
      } 
      // 2. 时间到，召唤BOSS
      else if (!databus.bossActive) {
          console.log('Time is up! Spawning Boss...')
          this.spawnBoss(levelConfig)
      }
  }

  spawnBoss(levelConfig) {
      // 1. 立即标记 Boss 状态为激活，停止计时和小怪刷新
      databus.bossActive = true
      
      // 2. 清理场上所有小怪，给 Boss 腾地方
      databus.enemies.forEach(e => {
          e.hp = 0; e.remove = true
          this.createExplosion(e.x, e.y, e.color, 10)
      })
      
      // 3. 显示警告
      databus.floatingTexts.push(new FloatingText("WARNING!", w/2, 300, '#FF5252', 60))
      
      // 4. 延迟 2 秒后真正生成 Boss 对象
      setTimeout(() => {
          // 再次检查游戏状态，防止玩家已退出
          if (databus.gameStatus === 'playing') {
              console.log('Boss Entity Created!')
              // Rank 2 代表 Boss
              databus.enemies.push(new Enemy(2, levelConfig, 1))
          }
      }, 2000)
  }

  collisionDetection() {
    const p = this.player
          // 子弹 vs 敌人
          databus.bullets.forEach(b => {
      databus.enemies.forEach(e => {
        if (!b.remove && !e.remove && this.isColliding(b, e)) {
          b.remove = true
          if(b.type === 'plasma') b.remove = false

          // 计算伤害：基础伤害 + 强化加成
          let damage = b.damage || 1

          // 子弹强化流派加成
          if (databus.upgrades.bulletDamage > 0) {
            damage *= (1 + databus.upgrades.bulletDamage * UPGRADE_DEFINITIONS.bulletDamage.bonusPerLevel)
          }

          // 激光聚焦加成（修复：同时支持 laser 和 其他武器）
          if (databus.upgrades.laserFocus > 0) {
            // 如果玩家装备了激光武器，激光武器获得额外加成
            const hasLaser = databus.activeWeapons.some(w => w === 'laser')
            if (b.type === 'laser' || hasLaser) {
              const laserBonus = 1 + databus.upgrades.laserFocus * UPGRADE_DEFINITIONS.laserFocus.bonusPerLevel
              damage *= (b.type === 'laser' ? laserBonus : 1 + (laserBonus - 1) * 0.5)
            }
          }

          // 暴击系统
          if (databus.upgrades.criticalHit > 0 && Math.random() < databus.criticalRate) {
            damage *= 1.5 // 暴击伤害 +50%
            this.addFloatingText('暴击!', b.x, b.y - 20, '#ffd700', 18)
          }

          e.hp -= damage

          // 击中特效
          if(b.type === 'heavy') this.createExplosion(b.x, b.y, '#ff7675', 5)
          else this.createExplosion(b.x, b.y, '#fff', 1)

          // 敌人死亡逻辑
          if (e.hp <= 0) {
            e.remove = true
            this.addScore(e.rank === 2 ? 1000 : 100, e.x, e.y)
            this.createExplosion(e.x + e.width/2, e.y + e.height/2, e.color, 15)

            // 护盾回复机制
            if (databus.upgrades.shieldRegen > 0) {
              const shieldChance = databus.upgrades.shieldRegen * UPGRADE_DEFINITIONS.shieldRegen.bonusPerLevel
              if (Math.random() < shieldChance && !this.player.shield) {
                this.player.shield = true
                this.addFloatingText('护盾!', this.player.x, this.player.y - 30, '#74b9ff', 20)
              }
            }

            // 经验升级系统：击杀敌人获得经验
            if (e.rank !== 2) {  // Boss 不给经验
              const leveledUp = databus.addUpgradeExp(1)

              if (leveledUp) {
                // 升级了，显示提示
                this.addFloatingText(`强化等级提升! Lv.${databus.upgradeLevel}`, this.player.x, this.player.y - 60, '#ffd700', 28)
                // 打开强化选择界面
                this.openUpgradeSelection()
              }
            }

            // Boss死亡通关
            if (e.rank === 2) {
                console.log('Boss Killed! Level Clear.')
                this.levelClear()
            }
          }
        }
      })
      // 子弹 vs 炸弹
      databus.bombs.forEach(bomb => {
          if(!b.remove && !bomb.remove && Math.hypot(bomb.x - b.x, bomb.y - b.y) < bomb.radius + 5) {
              b.remove = true; this.triggerBomb(bomb)
          }
      })
    })

    // 玩家 vs 掉落物（保留其他类型的掉落，如道具等）
    databus.drops.forEach(d => {
      if(!d.remove && this.isColliding(p, d)) {
        d.remove = true
        this.handleDrop(d)
      }
    })

    // 玩家 vs 敌人 (撞击)
    databus.enemies.forEach(e => {
        if (!e.remove && this.isColliding(p, e)) {
            e.hp -= 10;
            if(e.hp<=0) {
                e.remove=true;
                this.createExplosion(e.x,e.y,e.color,20)
                if (e.rank === 2) this.levelClear()
            }
            let damage = e.damage || 10
            this.playerHit(damage)
        }
    })

    // 玩家 vs 敌方子弹
    databus.enemyBullets.forEach(eb => {
        if(!eb.remove && Math.hypot(eb.x - (p.x+p.width/2), eb.y - (p.y+p.height/2)) < p.width/2) {
            eb.remove = true;
            let damage = eb.damage || 10
            this.playerHit(damage)
        }
    })
  }
  
  levelClear() {
      // 防止重复触发
      if (databus.gameStatus === 'level_success') return
      
      databus.gameStatus = 'level_success'
      databus.bossActive = false
      
      let rewardCoins = 200 * databus.currentLevel
      let rewardCrystal = 5 * databus.currentLevel
      databus.coins += rewardCoins
      databus.crystals += rewardCrystal
      
      if (databus.currentLevel >= databus.maxLevelReached) {
          databus.maxLevelReached = databus.currentLevel + 1
      }
      databus.saveData()
  }

  shootLogic() {
    let p = this.player

    // 计算射速间隔（基础间隔 / 射速倍率）
    const baseFireInterval = 10
    const fireInterval = Math.max(3, Math.floor(baseFireInterval / databus.fireRateMultiplier))

    if (databus.frame % fireInterval === 0) {
      // 计算多重射击：基础武器数量 + 多重弹幕加成
      let totalWeapons = p.activeWeapons.length + databus.upgrades.multiShot

      p.activeWeapons.forEach((t, i) => {
        for (let m = 0; m < totalWeapons; m++) {
          let offsetX = (m - (totalWeapons - 1) / 2) * 15 + (i - (p.activeWeapons.length - 1) / 2) * 20
          databus.bullets.push(new Bullet(
            p.x + p.width/2 + offsetX,
            p.y,
            t,
            0,
            12,
            databus.score,
            p.damageMultiplier
          ))
        }
      })
    }

    // 护卫机射击
    if (databus.frame % 12 === 0 && p.wingmen > 0) {
        databus.bullets.push(new Bullet(p.x - 20, p.y + 10, 'normal', 0, 12, databus.score, p.damageMultiplier))
        if(p.wingmen > 1) databus.bullets.push(new Bullet(p.x + p.width + 10, p.y + 10, 'normal', 0, 12, databus.score, p.damageMultiplier))
        if(p.wingmen > 2) databus.bullets.push(new Bullet(p.x + p.width/2 - 3, p.y + 35, 'normal', Math.PI, 6, databus.score, p.damageMultiplier))
    }

    // 敌人射击
    databus.enemies.forEach(e => {
      if (e.shootTimer <= 0) {
        let bx = e.x + e.width/2, by = e.y + e.height
        let dmg = e.bulletDmg || 10
        if(e.rank === 2) {
            let rnd = Math.floor(Math.random()*3)
            if(rnd===0) for(let i=-2; i<=2; i++) databus.enemyBullets.push(new EnemyBullet(bx, by, i*2, 5, dmg))
            else if(rnd===1) for(let i=0; i<8; i++) {
                let a = (Math.PI*2/8)*i
                databus.enemyBullets.push(new EnemyBullet(bx, by+20, Math.cos(a)*5, Math.sin(a)*5, dmg))
            } else {
                let dx=p.x-bx, dy=p.y-by, d=Math.sqrt(dx*dx+dy*dy)
                if(d > 0) databus.enemyBullets.push(new EnemyBullet(bx, by, (dx/d)*7, (dy/d)*7, dmg))
            }
            e.shootTimer = 40
        } else {
            databus.enemyBullets.push(new EnemyBullet(bx, by, 0, 6, dmg))
            if(e.rank===1) {
                databus.enemyBullets.push(new EnemyBullet(bx, by, -1.5, 5, dmg))
                databus.enemyBullets.push(new EnemyBullet(bx, by, 1.5, 5, dmg))
            }
            e.shootTimer = 100
        }
      }
    })
  }

  updateEntities() {
    databus.bullets = databus.bullets.filter(b => { b.update(databus.enemies); return !b.remove })
    databus.enemies = databus.enemies.filter(e => { e.update(); return !e.remove })
    databus.enemyBullets = databus.enemyBullets.filter(eb => { eb.update(); return !eb.remove })
    databus.drops = databus.drops.filter(d => { d.update(this.player); return !d.remove })
    databus.particles = databus.particles.filter(p => { p.update(); return p.life > 0 })
    databus.floatingTexts = databus.floatingTexts.filter(t => { t.update(); return t.life > 0 })
  }
  render(ctx) {
      databus.drops.forEach(d => d.render(ctx))
      databus.enemies.forEach(e => e.render(ctx))
      databus.bullets.forEach(b => b.render(ctx))
      databus.enemyBullets.forEach(b => b.render(ctx))
      databus.particles.forEach(p => p.render(ctx))
      this.player.render(ctx)
      databus.floatingTexts.forEach(t => t.render(ctx))
  }
  isColliding(a, b) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y }
  playerHit(damage) {
      if(this.player.invulTimer > 0) return
      if(this.player.shield) { this.player.shield = false; databus.shakeTimer = 10; return }
      if (isNaN(damage)) damage = 10
      databus.hp -= damage
      databus.shakeTimer = 20
      this.player.invulTimer = 90
      this.addFloatingText(`-${damage}`, this.player.x, this.player.y, '#ff0000', 24)
      if(databus.hp <= 0) { databus.hp = 0; this.endGame() }
  }
  endGame() {
      databus.gameStatus = 'over'
      let earned = Math.floor(databus.score * 0.1)
      databus.coins += earned
      databus.saveData()
  }
  handleDrop(d) {
      // 处理其他类型的掉落（如道具等）
      // 强化宝箱已经移除，不再使用掉落机制
      if (d.type === 'crystal') {
          databus.crystals += 1
          this.addFloatingText("+💎", d.x, d.y, '#00cec9', 24)
          databus.saveData()
      }
      else if (d.type === 'health') {
          let heal=50
          if(databus.hp<this.player.maxHp){
              databus.hp=Math.min(this.player.maxHp, databus.hp+heal)
              this.addFloatingText(`+${heal}`,d.x,d.y,'#00b894',20)
          }
      }
      else if (d.type === 'shield') {
          this.player.shield = true
      }
      else if (d.type === 'wingman') {
          if(this.player.wingmen<CONFIG.maxWingmen) this.player.wingmen++
      }
  }

  // 打开强化选择界面
  openUpgradeSelection() {
      // 传入当前等级，过滤掉已满级的强化
      const upgrades = getAvailableUpgrades(3, databus.upgrades)

      // 如果没有可用的强化，给予额外奖励
      if (upgrades.length === 0) {
          // 所有强化都满级了，给予大量生命值恢复和金币奖励
          let heal = Math.floor(this.player.maxHp * 0.5)
          databus.hp = Math.min(this.player.maxHp, databus.hp + heal)
          this.addFloatingText(`+${heal} HP`, this.player.x, this.player.y - 50, '#00b894', 24)

          let bonusCoins = 50 * databus.currentLevel
          databus.coins += bonusCoins
          this.addFloatingText(`+${bonusCoins}💰`, this.player.x, this.player.y - 80, '#ffd700', 24)
          return
      }

      // 打开强化选择界面
      databus.isChoosingUpgrade = true
      databus.availableUpgrades = upgrades
  }

  // 应用强化
  applyUpgrade(upgradeId) {
      const upgrade = databus.upgrades
      const def = UPGRADE_DEFINITIONS[upgradeId]

      if (!def || upgrade[upgradeId] >= def.maxLevel) {
          console.warn('Invalid upgrade or max level reached:', upgradeId)
          return
      }

      // 应用强化
      upgrade[upgradeId]++

      // 特殊处理：更新派生属性
      if (upgradeId === 'fireRate') {
          databus.fireRateMultiplier = 1 + upgrade.fireRate * def.bonusPerLevel
      } else if (upgradeId === 'criticalHit') {
          databus.criticalRate = upgrade.criticalHit * def.bonusPerLevel
      }

      // 检查是否达到满级，给予额外奖励
      if (upgrade[upgradeId] === def.maxLevel) {
          this.addFloatingText(`${def.icon} 满级!`, this.player.x, this.player.y - 50, '#ffd700', 28)
          // 满级额外奖励：恢复30%生命值
          let heal = Math.floor(this.player.maxHp * 0.3)
          databus.hp = Math.min(this.player.maxHp, databus.hp + heal)
          this.addFloatingText(`+${heal} HP`, this.player.x, this.player.y, '#00b894', 20)
      } else {
          this.addFloatingText(`${def.icon} +1`, this.player.x, this.player.y - 50, '#ffeaa7', 24)
      }

      // 退出选择界面
      databus.isChoosingUpgrade = false
      databus.availableUpgrades = []
  }
  triggerBomb(bomb) {
      bomb.remove = true; databus.shakeTimer = 20
      this.createExplosion(bomb.x, bomb.y, '#ff4757', 30)
      this.addFloatingText("BOOM!", bomb.x, bomb.y, '#ff4757', 30)
      databus.enemies.forEach(e => { if(Math.hypot(e.x - bomb.x, e.y - bomb.y) < 250) { e.hp -= 200; if(e.hp <= 0) { e.remove = true; this.addScore(200, e.x, e.y); if(e.rank===2) databus.bossActive=false } } })
  }
  addScore(s, x, y) { databus.score += s; databus.floatingTexts.push(new FloatingText(`+${s}`, x, y, '#ffeaa7', 20)) }
  createExplosion(x, y, color, count) { for(let i=0; i<count; i++) databus.particles.push(new Particle(x, y, color)) }
  addFloatingText(text, x, y, color, size) { databus.floatingTexts.push(new FloatingText(text, x, y, color, size)) }
}