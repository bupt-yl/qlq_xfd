import DataBus from '../runtime/databus.js'
import { CONFIG, COLORS } from '../base/config.js'

const databus = new DataBus()

export default class Player {
  constructor() {
    const info = wx.getSystemInfoSync()
    const screenWidth = info.windowWidth
    const screenHeight = info.windowHeight
    
    this.width = 44
    this.height = 40
    this.x = screenWidth / 2 - this.width / 2
    this.y = screenHeight - 100
    this.invulTimer = 0; this.shield = false; this.shieldAlpha = 0; this.wingmen = 0
    this.activeWeapons = databus.activeWeapons || ['normal']
    
    // === 核心修改：属性计算 ===
    if (databus.currentPlaneIndex >= databus.ownedPlanes.length) databus.currentPlaneIndex = 0
    const currentPlane = databus.ownedPlanes[databus.currentPlaneIndex]
    
    // 获取基础属性
    const rank = currentPlane ? currentPlane.rank : 'R'
    const level = currentPlane.level || 1
    
    const baseHp = CONFIG.baseHp[rank] || 100
    // 新增：获取基础攻击倍率 (1, 3, 7)
    const baseAtk = CONFIG.baseAttack[rank] || 1 
    
    // 等级成长系数 (Level 1 = 1.0, Level 2 = 1.1)
    const growth = 1 + (level - 1) * CONFIG.levelGrowth
    
    this.maxHp = Math.floor(baseHp * growth)
    
    // 最终伤害 = 品质倍率 * 等级成长
    // 例如 SSR Lv.1 = 7 * 1.0 = 7.0 倍伤害
    // 例如 R   Lv.1 = 1 * 1.0 = 1.0 倍伤害
    this.damageMultiplier = baseAtk * growth
    
    // 初始化当前血量
    databus.hp = this.maxHp
    
    console.log(`Player: ${rank} Lv.${level}, HP:${this.maxHp}, Dmg:x${this.damageMultiplier.toFixed(2)}`)
  }

  update(input) {
    const info = wx.getSystemInfoSync()
    // 允许传入 input 对象包含 x,y
    let ix = input.x !== undefined ? input.x : this.x + this.width/2
    let iy = input.y !== undefined ? input.y : this.y + this.height/2
    
    let targetX = Math.max(0, Math.min(info.windowWidth - this.width, ix - this.width / 2))
    let targetY = Math.max(0, Math.min(info.windowHeight - this.height, iy - this.height / 2))
    
    this.x += (targetX - this.x) * 0.15
    this.y += (targetY - this.y) * 0.15
    
    if (this.shield) this.shieldAlpha = 0.5 + Math.sin(databus.frame * 0.1) * 0.2
    if (this.invulTimer > 0) this.invulTimer--
  }

  render(ctx) {
    if (this.invulTimer > 0 && Math.floor(databus.frame / 4) % 2 === 0) return
    
    if (this.wingmen > 0) {
      ctx.fillStyle = COLORS.wingman
      this.drawWingman(ctx, this.x - 25 + Math.sin(databus.frame * 0.1) * 5, this.y + 15)
      if (this.wingmen > 1) this.drawWingman(ctx, this.x + this.width + 15 + Math.sin(databus.frame * 0.1 + Math.PI) * 5, this.y + 15)
      if (this.wingmen > 2) this.drawWingman(ctx, this.x + this.width / 2 - 10, this.y + 40 + Math.cos(databus.frame * 0.1) * 3)
    }
    
    if (this.shield) {
      ctx.beginPath(); ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 45, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(116, 185, 255, ${this.shieldAlpha})`; ctx.lineWidth = 3; ctx.stroke()
    }

    const currentPlane = databus.ownedPlanes[databus.currentPlaneIndex]
    let color = COLORS.qualityR
    if (currentPlane) {
        if (currentPlane.rank === 'SSR') color = COLORS.qualitySSR
        else if (currentPlane.rank === 'SR') color = COLORS.qualitySR
    }

    ctx.save(); ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 15
    ctx.beginPath(); ctx.moveTo(this.x + this.width/2, this.y); ctx.lineTo(this.x + this.width, this.y + this.height); ctx.lineTo(this.x + this.width/2, this.y + this.height - 15); ctx.lineTo(this.x, this.y + this.height); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(this.x + this.width/2, this.y + 25, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  }

  drawWingman(ctx, x, y) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10, y + 20); ctx.lineTo(x - 10, y + 20); ctx.fill() }
  addWeapon(type) {
    this.activeWeapons.push(type); if (this.activeWeapons.length > CONFIG.maxActiveWeapons) this.activeWeapons.shift()
  }
}