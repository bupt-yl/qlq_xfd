import Player from '../player/index.js'
import Enemy, { EnemyBullet } from '../npc/enemy.js'
import { Bullet, Drop, Particle, FloatingText, TrapBomb } from './props.js'
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
    
    // 【重要修改】删除了这里的胜利判定逻辑
    // 之前这里会导致 Boss 还没刷出来就直接判胜
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
          
          let damage = b.damage || 1
          e.hp -= damage
          
          // 击中特效
          if(b.type === 'heavy') this.createExplosion(b.x, b.y, '#ff7675', 5)
          else this.createExplosion(b.x, b.y, '#fff', 1)

          // 敌人死亡逻辑
          if (e.hp <= 0) {
            e.remove = true
            this.addScore(e.rank === 2 ? 1000 : 100, e.x, e.y)
            this.createExplosion(e.x + e.width/2, e.y + e.height/2, e.color, 15)
            
            // 掉落物品
            if (Math.random() < CONFIG.dropChance || e.rank === 2) {
                databus.drops.push(new Drop(e.x, e.y))
            }

            // 【核心修复】：只有当死掉的是 Boss (rank === 2) 时，才通关
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

    // 玩家 vs 掉落物
    databus.drops.forEach(d => { if(!d.remove && this.isColliding(p, d)) { d.remove = true; this.handleDrop(d) } })
    
    // 玩家 vs 敌人 (撞击)
    databus.enemies.forEach(e => { 
        if (!e.remove && this.isColliding(p, e)) { 
            e.hp -= 10; 
            if(e.hp<=0) {
                e.remove=true;
                this.createExplosion(e.x,e.y,e.color,20)
                // 如果撞死的是 Boss，也算赢
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

  // ... 以下保持原样 ...
  shootLogic() {
    let p = this.player 
    if (databus.frame % 10 === 0) {
      p.activeWeapons.forEach((t, i) => {
        let offset = (i - (p.activeWeapons.length - 1)/2) * 20
        databus.bullets.push(new Bullet(p.x + p.width/2 + offset, p.y, t, 0, 12, databus.score, p.damageMultiplier))
      })
    }
    if (databus.frame % 12 === 0 && p.wingmen > 0) {
        databus.bullets.push(new Bullet(p.x - 20, p.y + 10, 'normal', 0, 12, databus.score, p.damageMultiplier))
        if(p.wingmen > 1) databus.bullets.push(new Bullet(p.x + p.width + 10, p.y + 10, 'normal', 0, 12, databus.score, p.damageMultiplier))
        if(p.wingmen > 2) databus.bullets.push(new Bullet(p.x + p.width/2 - 3, p.y + 35, 'normal', Math.PI, 6, databus.score, p.damageMultiplier))
    }
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
      if (d.type === 'crystal') { databus.crystals += 1; this.addFloatingText("+💎", d.x, d.y, '#00cec9', 24); databus.saveData() }
      else if (d.type === 'health') { let heal=50; if(databus.hp<this.player.maxHp){databus.hp=Math.min(this.player.maxHp, databus.hp+heal); this.addFloatingText(`+${heal}`,d.x,d.y,'#00b894',20)} }
      else if (d.type === 'shield') this.player.shield = true
      else if (d.type === 'wingman') { if(this.player.wingmen<CONFIG.maxWingmen)this.player.wingmen++ }
      else { this.player.addWeapon(d.type); this.addFloatingText(`+${d.type.toUpperCase()}`, d.x, d.y, '#ff7675', 16) }
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