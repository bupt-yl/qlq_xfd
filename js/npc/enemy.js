import { COLORS, CONFIG } from '../base/config.js'

export default class Enemy {
  constructor(rank, currentScore) {
    const info = wx.getSystemInfoSync()
    const screenWidth = info.windowWidth
    this.rank = rank
    this.remove = false
    
    // 强度系数计算：每 100 分提升一级
    let diff = Math.floor(currentScore / 100)
    
    // 属性成长倍率：每级增加 10% (1.0, 1.1, 1.2 ...)
    let powerMulti = 1 + (diff * 0.10)
    
    // 速度系数：每级增加 5% 速度 (上限3倍)
    let spdDiv = 1 + Math.min(diff * 0.05, 2.0)

    if (rank === 2) { // BOSS
      this.width = 120; this.height = 100
      this.x = screenWidth/2 - this.width/2; this.y = -150
      this.maxHp = Math.floor(600 * powerMulti); this.hp = this.maxHp
      this.speed = 1; this.color = COLORS.boss
      this.state = 'entering'; this.moveDir = 1
      // === 修改：攻击力随积分提升 ===
      this.damage = Math.floor(CONFIG.enemyDamage.boss * powerMulti)
    } else if (rank === 1) { // Medium
      this.width = 50; this.height = 50
      this.x = Math.random() * (screenWidth - this.width); this.y = -60
      this.maxHp = Math.floor(40 * powerMulti); this.hp = this.maxHp
      this.speed = Math.random() * 0.5 + 0.5; this.color = COLORS.enemyMedium
      this.damage = Math.floor(CONFIG.enemyDamage.medium * powerMulti)
    } else { // Small
      this.width = 35; this.height = 35
      this.x = Math.random() * (screenWidth - this.width); this.y = -50
      this.maxHp = Math.floor(10 * powerMulti); this.hp = this.maxHp 
      this.speed = Math.random() * 2 + 2.5; this.color = COLORS.enemySmall
      this.damage = Math.floor(CONFIG.enemyDamage.small * powerMulti)
    }

    // 将当前的伤害倍率存下来，传给子弹用
    this.bulletDmgMulti = powerMulti

    this.canShoot = rank > 0
    this.baseShootTimer = Math.random() * 60 + 60
    this.shootTimer = this.baseShootTimer / spdDiv
    this.speedDivisor = spdDiv
  }

  update() {
    const info = wx.getSystemInfoSync()
    const screenWidth = info.windowWidth
    const screenHeight = info.windowHeight
    if (this.rank === 2) {
      if (this.state === 'entering') { this.y += this.speed; if (this.y > 80) this.state = 'fighting' } 
      else { this.x += this.moveDir * 1.5; if (this.x <= 0 || this.x + this.width >= screenWidth) this.moveDir *= -1 }
    } else {
      this.y += this.speed; if (this.y > screenHeight) this.remove = true
    }
    if(this.canShoot) this.shootTimer--
  }

  render(ctx) {
    ctx.save(); ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 10; ctx.strokeStyle = '#000'; ctx.lineWidth = 2
    if (this.rank === 2) {
      ctx.font = '80px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('🤡', this.x + this.width / 2, this.y + this.height / 2)
    } else {
      ctx.beginPath(); ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.moveTo(this.x, this.y + this.height / 2); ctx.lineTo(this.x - 5, this.y + this.height); ctx.lineTo(this.x + 10, this.y + this.height); ctx.fill()
      ctx.beginPath(); ctx.moveTo(this.x + this.width, this.y + this.height / 2); ctx.lineTo(this.x + this.width + 5, this.y + this.height); ctx.lineTo(this.x + this.width - 10, this.y + this.height); ctx.fill()
    }
    if (this.rank === 1 && this.hp < this.maxHp) {
      ctx.fillStyle = '#2d3436'; ctx.fillRect(this.x, this.y - 10, this.width, 6)
      ctx.fillStyle = '#fdcb6e'; ctx.fillRect(this.x, this.y - 10, this.width * (this.hp / this.maxHp), 6)
    }
    ctx.restore()
  }
}

export class EnemyBullet {
  constructor(x, y, vx, vy, damage = 10) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.radius = 5; this.remove = false
    this.damage = damage
  }

  update() {
    const info = wx.getSystemInfoSync()
    this.x += this.vx; this.y += this.vy
    if (this.y > info.windowHeight) this.remove = true
  }

  render(ctx) {
    ctx.save(); ctx.fillStyle = COLORS.enemyBullet; ctx.shadowColor = COLORS.enemyBullet; ctx.shadowBlur = 5
    ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  }
}