import { COLORS, CONFIG } from '../base/config.js'

export default class Enemy {
  // rank: 0(小), 1(中), 2(Boss)
  // levelConfig: 当前关卡的配置对象
  // timeFactor: 时间强度系数 (1.0 ~ 2.0+), 仅影响小怪
  constructor(rank, levelConfig, timeFactor = 1) {
    const info = wx.getSystemInfoSync()
    const w = info.windowWidth
    this.rank = rank
    this.remove = false
    
    // 基础倍率 (关卡倍率 * 时间倍率)
    // Boss 不受时间系数影响 (timeFactor对于Boss传进来应该是1，或者在这里忽略)
    let finalMulti = levelConfig.hpScale * (rank === 2 ? 1 : timeFactor)
    
    if (rank === 2) { // BOSS
      this.width = 120; this.height = 100
      this.x = w/2 - this.width/2; this.y = -150
      this.maxHp = Math.floor(levelConfig.bossHp); 
      this.hp = this.maxHp
      this.speed = 1; this.color = COLORS.boss
      this.state = 'entering'; this.moveDir = 1
      this.damage = Math.floor(50 * levelConfig.dmgScale) // Boss基础伤害50
    } 
    else if (rank === 1) { // Medium
      this.width = 50; this.height = 50
      this.x = Math.random() * (w - this.width); this.y = -60
      this.maxHp = Math.floor(40 * finalMulti); this.hp = this.maxHp
      this.speed = Math.random() * 0.5 + 0.5 + (timeFactor - 1); // 随时间稍微变快
      this.color = COLORS.enemyMedium
      this.damage = Math.floor(20 * levelConfig.dmgScale * timeFactor)
    } 
    else { // Small
      this.width = 35; this.height = 35
      this.x = Math.random() * (w - this.width); this.y = -50
      this.maxHp = Math.floor(10 * finalMulti); this.hp = this.maxHp 
      this.speed = Math.random() * 2 + 2.5 + (timeFactor - 1);
      this.color = COLORS.enemySmall
      this.damage = Math.floor(10 * levelConfig.dmgScale * timeFactor)
    }

    this.bulletDmg = this.damage // 子弹伤害等于碰撞伤害
    this.canShoot = rank > 0
    this.shootTimer = Math.random() * 100
  }

  update() {
    const h = wx.getSystemInfoSync().windowHeight
    const w = wx.getSystemInfoSync().windowWidth
    
    if (this.rank === 2) {
      if (this.state === 'entering') { this.y += this.speed; if (this.y > 100) this.state = 'fighting' } 
      else { this.x += this.moveDir * 1.5; if (this.x <= 0 || this.x + this.width >= w) this.moveDir *= -1 }
    } else {
      this.y += this.speed; if (this.y > h) this.remove = true
    }
    if(this.canShoot) this.shootTimer--
  }

  render(ctx) {
    ctx.save(); ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 10;
    if (this.rank === 2) {
      ctx.font = '80px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('🤡', this.x + this.width / 2, this.y + this.height / 2)
      // Boss血条
      ctx.fillStyle = '#555'; ctx.fillRect(0, 0, wx.getSystemInfoSync().windowWidth, 10)
      ctx.fillStyle = '#FF5252'; ctx.fillRect(0, 0, wx.getSystemInfoSync().windowWidth * (this.hp/this.maxHp), 10)
    } else {
      ctx.beginPath(); ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
  }
}

export class EnemyBullet {
  constructor(x, y, vx, vy, damage) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.damage = damage; this.radius = 5; this.remove = false
  }
  update() { this.x += this.vx; this.y += this.vy; if (this.y > 2000) this.remove = true }
  render(ctx) { ctx.save(); ctx.fillStyle = COLORS.enemyBullet; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
}