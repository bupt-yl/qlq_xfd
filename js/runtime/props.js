import { COLORS } from '../base/config.js'

// Bullet 类保持不变
export class Bullet {
  constructor(x, y, type, angle = 0, speed = 12, currentScore = 0, powerMultiplier = 1) {
    this.x = x; this.y = y; this.type = type; this.angle = angle; this.speed = speed; this.remove = false
    this.moveLogic = 'straight'
    let dmgMultiplier = (1 + (Math.floor(currentScore / 10000) * 0.08)) * powerMultiplier
    
    if (type === 'laser') { this.width = 5; this.height = 40; this.speed = 22; this.damage = 4.0 * dmgMultiplier; this.color = COLORS.bulletLaser; } 
    else if (type === 'heavy') { this.width = 16; this.height = 16; this.speed = 6; this.damage = 25 * dmgMultiplier; this.color = COLORS.bulletHeavy; } 
    else if (type === 'homing') { this.width = 8; this.height = 12; this.speed = 8; this.damage = 2 * dmgMultiplier; this.color = COLORS.bulletHoming; this.moveLogic = 'homing'; } 
    else if (type === 'plasma') { this.width = 12; this.height = 8; this.speed = 10; this.damage = 3 * dmgMultiplier; this.color = COLORS.bulletPlasma; this.moveLogic = 'sine'; this.startX = x; } 
    else if (type === 'rapid') { this.width = 4; this.height = 12; this.speed = 18; this.damage = 0.8 * dmgMultiplier; this.color = COLORS.bulletRapid; } 
    else if (type === 'snipe') { this.width = 6; this.height = 25; this.speed = 25; this.damage = 8 * dmgMultiplier; this.color = COLORS.bulletSnipe; } 
    else if (type === 'shuriken') { this.width = 10; this.height = 10; this.speed = 9; this.damage = 2.5 * dmgMultiplier; this.color = COLORS.bulletShuriken; this.moveLogic = 'spin'; } 
    else if (type === 'bubble') { this.width = 18; this.height = 18; this.speed = 5; this.damage = 5 * dmgMultiplier; this.color = COLORS.bulletBubble; } 
    else if (type === 'pulse') { this.width = 8; this.height = 20; this.speed = 14; this.damage = 3.5 * dmgMultiplier; this.color = COLORS.bulletPulse; } 
    else { this.width = 6; this.height = 14; this.speed = 12; this.damage = 1 * dmgMultiplier; this.color = COLORS.bulletNormal; }
  }

  update(enemies) {
    // ... 略 ... (保持原样)
    const info = wx.getSystemInfoSync()
    const w = info.windowWidth
    if (this.moveLogic === 'homing') {
      let target = null; let minDist = Infinity
      enemies.forEach(e => { let d = (e.x - this.x) ** 2 + (e.y - this.y) ** 2; if (d < minDist && !e.remove) { minDist = d; target = e } })
      if (target) {
        let angle = Math.atan2((target.y + target.height / 2) - this.y, (target.x + target.width / 2) - this.x)
        this.x += (Math.cos(angle) * this.speed * 0.2 + Math.sin(this.angle) * this.speed * 0.8)
        this.y += (Math.sin(angle) * this.speed * 0.2 - Math.cos(this.angle) * this.speed * 0.8)
      } else { this.y -= this.speed }
    } else if (this.moveLogic === 'sine') { this.y -= this.speed; this.x = this.startX + Math.sin(this.y * 0.05) * 30 } 
    else { this.y -= this.speed; this.x += Math.sin(this.angle) * 3 }
    if (this.y < -50 || this.x < -50 || this.x > w + 50) this.remove = true
  }

  render(ctx) {
    ctx.save(); ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 5
    if (this.moveLogic === 'spin') { ctx.translate(this.x + this.width/2, this.y + this.height/2); ctx.rotate(Date.now() / 100); ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height) } 
    else if (this.type === 'bubble') { ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(this.x, this.y, this.width/2, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke() } 
    else { ctx.fillRect(this.x, this.y, this.width, this.height) }
    ctx.restore()
  }
}

// 肉鸽强化选项定义
export const UPGRADE_DEFINITIONS = {
  bulletDamage: {
    name: '子弹强化',
    icon: '💥',
    description: '提升所有子弹伤害 15%',
    maxLevel: 5,
    bonusPerLevel: 0.15,
    maxBonusDescription: '满级：伤害 +100%'
  },
  fireRate: {
    name: '极速射击',
    icon: '⚡',
    description: '提升射击速度 10%',
    maxLevel: 5,
    bonusPerLevel: 0.10,
    maxBonusDescription: '满级：射速 +50%'
  },
  laserFocus: {
    name: '激光聚焦',
    icon: '🔆',
    description: '武器伤害 +25%',
    maxLevel: 5,
    bonusPerLevel: 0.25,
    maxBonusDescription: '满级：武器伤害 +125%'
  },
  multiShot: {
    name: '多重弹幕',
    icon: '🎯',
    description: '增加同时发射的子弹数量',
    maxLevel: 5,
    bonusPerLevel: 1,
    maxBonusDescription: '满级：同时发射 +5发子弹'
  },
  shieldRegen: {
    name: '护盾回复',
    icon: '🛡️',
    description: '击杀敌人有 5% 概率获得护盾',
    maxLevel: 5,
    bonusPerLevel: 0.05,
    maxBonusDescription: '满级：25% 概率获得护盾'
  },
  criticalHit: {
    name: '致命打击',
    icon: '⭐',
    description: '暴击率 +8%，暴击伤害 +50%',
    maxLevel: 5,
    bonusPerLevel: 0.08,
    maxBonusDescription: '满级：暴击率 +40%'
  }
}

// 获取可用的强化选项（排除已满级的）
export function getAvailableUpgrades(count = 3, currentLevels) {
  const keys = Object.keys(UPGRADE_DEFINITIONS)
  // 过滤掉已满级的强化
  const availableKeys = keys.filter(key => {
    const def = UPGRADE_DEFINITIONS[key]
    const currentLevel = currentLevels[key] || 0
    return currentLevel < def.maxLevel
  })

  // 如果没有可用的强化选项，返回空数组
  if (availableKeys.length === 0) {
    return []
  }

  // 如果可选项不足请求的数量，只返回实际可用的数量
  const actualCount = Math.min(count, availableKeys.length)

  const shuffled = availableKeys.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, actualCount).map(key => ({
    id: key,
    ...UPGRADE_DEFINITIONS[key]
  }))
}

export class Drop {
  constructor(x, y) {
    this.x = x; this.y = y; this.width = 32; this.height = 32; this.speed = 2; this.remove = false

    // 10% 概率掉落生命值，其他不掉落
    const rand = Math.random()
    if (rand < 0.10) {
      this.type = 'health'
      this.icon = '💚'
    } else {
      this.type = 'none'
      this.remove = true // 其他情况不生成掉落物
    }
  }
  update(player) {
    this.y += this.speed
    if (player) {
      let dx = player.x - this.x; let dy = player.y - this.y
      if (Math.sqrt(dx * dx + dy * dy) < 150) {
          this.x += dx * 0.1; this.y += dy * 0.1
      }
    }
    if (this.y > 1000) this.remove = true
  }
  render(ctx) {
    ctx.save(); ctx.translate(this.x + 16, this.y + 16)

    let color = COLORS.dropWeapon
    if (this.type === 'crystal') {
      color = COLORS.crystal
    } else if (this.type === 'health') {
      color = COLORS.dropHealth
    } else if (this.type === 'shield') {
      color = COLORS.shield
    } else if (this.type === 'wingman') {
      color = COLORS.wingman
    }

    ctx.fillStyle = color
    ctx.shadowColor = color
    ctx.shadowBlur = 15
    ctx.beginPath()
    ctx.arc(0, 0, 16, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#fff'
    ctx.font = '20px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(this.icon, 0, 2)
    ctx.restore()
  }
}

// TrapBomb, Particle, FloatingText 保持原样，为了完整性建议保留
export class TrapBomb {
  constructor() { this.x = Math.random() * 350 + 25; this.y = -50; this.radius = 25; this.rotation = 0; this.remove = false; this.speed = 1.5 }
  update() { this.y += this.speed; this.rotation += 0.02; if(this.y > 1000) this.remove = true }
  render(ctx) {
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rotation)
    ctx.fillStyle = COLORS.trapBomb; ctx.shadowColor = '#000'; ctx.shadowBlur = 10
    ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 3
    for(let i=0; i<8; i++) { ctx.rotate(Math.PI/4); ctx.beginPath(); ctx.moveTo(0, -this.radius); ctx.lineTo(0, -this.radius - 5); ctx.stroke(); }
    ctx.rotate(-this.rotation); ctx.fillStyle = '#ff0000'; ctx.font = 'bold 20px Arial'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⚠️', 0, 2)
    ctx.restore()
  }
}
export class Particle {
  constructor(x, y, color) { this.x = x; this.y = y; this.vx = (Math.random()-0.5)*8; this.vy = (Math.random()-0.5)*8; this.life = 1; this.color = color; this.size = Math.random()*4+2 }
  update() { this.x += this.vx; this.y += this.vy; this.life -= 0.03; this.size *= 0.92 }
  render(ctx) { ctx.save(); ctx.globalAlpha = Math.max(0, this.life); ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
}
export class FloatingText {
  constructor(text, x, y, color, size) { this.text = text; this.x = x; this.y = y; this.color = color; this.size = size; this.life = 1.0 }
  update() { this.y -= 1; this.life -= 0.02 }
  render(ctx) { ctx.save(); ctx.globalAlpha = Math.max(0, this.life); ctx.fillStyle = this.color; ctx.font = `bold ${this.size}px Arial`; ctx.fillText(this.text, this.x, this.y); ctx.restore() }
}