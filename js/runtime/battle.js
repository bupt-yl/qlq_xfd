import Player from '../player/index.js'
import Enemy, { EnemyBullet } from '../npc/enemy.js'
import { Bullet, Drop, Particle, FloatingText, TrapBomb } from './props.js'
import DataBus from './databus.js'
import { CONFIG, COLORS } from '../base/config.js'

const databus = new DataBus()
const screenWidth = wx.getSystemInfoSync().windowWidth
const screenHeight = wx.getSystemInfoSync().windowHeight

export default class Battle {
  constructor() {
    this.player = new Player()
  }

  restart() {
    this.player = new Player() // 重新生成玩家（应用最新属性）
    // 敌人、子弹等清理工作在 databus.reset() 中完成，Main会调用
  }

  // 每一帧的更新逻辑
  update() {
    if (databus.shakeTimer > 0) databus.shakeTimer--
    
    this.enemyGenerate()
    // 玩家移动逻辑在 Main 里处理了 input 坐标，这里只需要 update
    // 但为了解耦，最好把 input 传进来，或者 Main 直接改 player 坐标
    // 暂时假设 Main 还是控制 player.x/y，这里只做状态更新
    this.player.update({x: this.player.x + this.player.width/2, y: this.player.y + this.player.height/2}) // 稍微hack一下，保持兼容

    this.shootLogic()
    this.collisionDetection()
    this.updateEntities()
  }

  render(ctx) {
    // 绘制所有实体
    databus.bombs.forEach(b => b.render(ctx))
    databus.drops.forEach(d => d.render(ctx))
    databus.enemies.forEach(e => e.render(ctx))
    databus.bullets.forEach(b => b.render(ctx))
    databus.enemyBullets.forEach(b => b.render(ctx))
    databus.particles.forEach(p => p.render(ctx))
    this.player.render(ctx)
    databus.floatingTexts.forEach(t => t.render(ctx))
  }

  updateEntities() {
    databus.bullets = databus.bullets.filter(b => { b.update(databus.enemies); return !b.remove })
    databus.enemies = databus.enemies.filter(e => { e.update(); return !e.remove })
    databus.enemyBullets = databus.enemyBullets.filter(eb => { eb.update(); return !eb.remove })
    databus.drops = databus.drops.filter(d => { d.update(this.player); return !d.remove })
    databus.bombs = databus.bombs.filter(b => { b.update(); return !b.remove })
    databus.particles = databus.particles.filter(p => { p.update(); return p.life > 0 })
    databus.floatingTexts = databus.floatingTexts.filter(t => { t.update(); return t.life > 0 })
  }

  enemyGenerate() {
    if (databus.bossActive) return
    if (databus.frame % 50 === 0) {
      let rank = (Math.random() < 0.25 && databus.score > 500) ? 1 : 0
      databus.enemies.push(new Enemy(rank, databus.score))
    }
    if (databus.frame % 240 === 0) databus.bombs.push(new TrapBomb())
    
    if (!databus.bossActive && databus.score > CONFIG.bossSpawnScore && !databus.enemies.some(e => e.rank === 2)) {
       if(databus.score % 5000 < 200) this.spawnBoss()
    }
  }

  spawnBoss() {
    databus.bossActive = true
    databus.enemies = databus.enemies.filter(e => e.rank === 1)
    databus.floatingTexts.push(new FloatingText("BOSS COMING!", screenWidth/2, screenHeight/2, '#FF5252', 40))
    setTimeout(() => {
      if (databus.gameStatus === 'playing') databus.enemies.push(new Enemy(2, databus.score))
    }, 1500)
  }

  shootLogic() {
    let p = this.player 
    // 玩家射击
    if (databus.frame % 10 === 0) {
      p.activeWeapons.forEach((t, i) => {
        let offset = (i - (p.activeWeapons.length - 1)/2) * 20
        databus.bullets.push(new Bullet(p.x + p.width/2 + offset, p.y, t, 0, 12, databus.score, p.damageMultiplier))
      })
    }
    // 僚机
    if (databus.frame % 12 === 0 && p.wingmen > 0) {
        databus.bullets.push(new Bullet(p.x - 20, p.y + 10, 'normal', 0, 12, databus.score, p.damageMultiplier))
        if(p.wingmen > 1) databus.bullets.push(new Bullet(p.x + p.width + 10, p.y + 10, 'normal', 0, 12, databus.score, p.damageMultiplier))
        if(p.wingmen > 2) databus.bullets.push(new Bullet(p.x + p.width/2 - 3, p.y + 35, 'normal', Math.PI, 6, databus.score, p.damageMultiplier))
    }
    
    // 敌人射击
    databus.enemies.forEach(e => {
      if (e.shootTimer <= 0) {
        let bx = e.x + e.width/2, by = e.y + e.height
        
        // === 修改：子弹伤害也乘以倍率 (从 e.bulletDmgMulti 获取) ===
        // 如果 enemy.js 没存 bulletDmgMulti，可以用 e.damage / 基础伤害 反推，或者直接用 damage 属性
        // 但最稳妥的是直接读取我们在 Enemy 构造函数里存的 bulletDmgMulti
        let multi = e.bulletDmgMulti || 1
        let baseDmg = e.rank === 2 ? CONFIG.enemyDamage.laser : CONFIG.enemyDamage.bullet
        let finalDmg = Math.floor(baseDmg * multi)

        if(e.rank === 2) {
            let rnd = Math.floor(Math.random()*3)
            if(rnd===0) for(let i=-2; i<=2; i++) databus.enemyBullets.push(new EnemyBullet(bx, by, i*2, 5, finalDmg))
            else if(rnd===1) for(let i=0; i<8; i++) {
                let a = (Math.PI*2/8)*i
                databus.enemyBullets.push(new EnemyBullet(bx, by+20, Math.cos(a)*5, Math.sin(a)*5, finalDmg))
            } else {
                let dx=p.x-bx, dy=p.y-by, d=Math.sqrt(dx*dx+dy*dy)
                if(d > 0) databus.enemyBullets.push(new EnemyBullet(bx, by, (dx/d)*7, (dy/d)*7, finalDmg))
            }
            e.shootTimer = 40 / e.speedDivisor
        } else if (e.rank === 1) {
            databus.enemyBullets.push(new EnemyBullet(bx, by, 0, 6, finalDmg)); 
            databus.enemyBullets.push(new EnemyBullet(bx, by, -1.5, 5, finalDmg)); 
            databus.enemyBullets.push(new EnemyBullet(bx, by, 1.5, 5, finalDmg))
            e.shootTimer = 90 / e.speedDivisor
        } else {
            databus.enemyBullets.push(new EnemyBullet(bx, by, 0, 5, finalDmg))
            e.shootTimer = 100 / e.speedDivisor
        }
      }
    })
  }

  collisionDetection() {
    const p = this.player
    // 子弹打敌人
    databus.bullets.forEach(b => {
      databus.enemies.forEach(e => {
        if (!b.remove && !e.remove && this.isColliding(b, e)) {
          b.remove = true
          if(b.type === 'plasma') b.remove = false
          e.hp -= b.damage
          if(b.type === 'heavy') {
              this.createExplosion(b.x, b.y, '#ff7675', 5)
              databus.enemies.forEach(sub=>{ if(Math.hypot(sub.x-e.x, sub.y-e.y)<100) sub.hp-=8 })
          } else this.createExplosion(b.x, b.y, '#fff', 1)

          if (e.hp <= 0) {
            e.remove = true
            let add = e.rank === 2 ? 1000 : (e.rank === 1 ? 100 : 10)
            this.addScore(add, e.x, e.y)
            this.createExplosion(e.x + e.width/2, e.y + e.height/2, e.color, 15)
            if (Math.random() < CONFIG.dropChance || e.rank === 2) databus.drops.push(new Drop(e.x, e.y))
            if (e.rank === 2) { databus.bossActive = false; databus.shakeTimer = 30 }
          }
        }
      })
      databus.bombs.forEach(bomb => {
          if(!b.remove && !bomb.remove && Math.hypot(bomb.x - b.x, bomb.y - b.y) < bomb.radius + 5) {
              b.remove = true; this.triggerBomb(bomb)
          }
      })
    })

    // 捡道具
    databus.drops.forEach(d => {
        if(!d.remove && this.isColliding(p, d)) { d.remove = true; this.handleDrop(d) }
    })
    
    // 玩家受伤 (撞机、子弹、陷阱)
    databus.enemies.forEach(e => { if (!e.remove && this.isColliding(p, e)) { e.hp -= 10; if(e.hp<=0){e.remove=true;this.createExplosion(e.x,e.y,e.color,20)}; this.playerHit(e.damage) } })
    databus.enemyBullets.forEach(eb => { if(!eb.remove && Math.hypot(eb.x - (p.x+p.width/2), eb.y - (p.y+p.height/2)) < p.width/2) { eb.remove = true; this.playerHit(eb.damage) } })
    databus.bombs.forEach(b => { if(!b.remove && Math.hypot(b.x - (p.x+p.width/2), b.y - (p.y+p.height/2)) < b.radius + p.width/2) { b.remove = true; this.addFloatingText("TRAP!", b.x, b.y, '#ff0000', 20); this.playerHit(30) } })
  }

  isColliding(a, b) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y }

  playerHit(damage) {
      if(this.player.invulTimer > 0) return
      if(this.player.shield) { this.player.shield = false; databus.shakeTimer = 10; return }
      
      databus.hp -= damage
      databus.shakeTimer = 20
      this.player.invulTimer = 90
      this.addFloatingText(`-${damage}`, this.player.x, this.player.y, '#ff0000', 24)

      if(databus.hp <= 0) {
          databus.hp = 0
          this.endGame()
      }
  }

  endGame() {
      databus.gameStatus = 'over'
      let earned = Math.floor(databus.score * 0.1)
      databus.coins += earned
      databus.saveData()
      wx.setStorageSync('highScore', Math.max(databus.highScore, databus.score))
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