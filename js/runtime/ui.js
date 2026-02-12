import { CONFIG, COLORS, PLANES_DB } from '../base/config.js'
import DataBus from './databus.js'

const databus = new DataBus()
const screenWidth = wx.getSystemInfoSync().windowWidth
const screenHeight = wx.getSystemInfoSync().windowHeight

export default class UI {
  constructor() {
    this.previewPlaneIndex = 0 // 机库预览索引
  }

  // === 统一的渲染入口 ===
  render(ctx, player) {
    if (databus.gameStatus === 'start') {
      this.renderStartScreen(ctx, player)
    } else if (databus.gameStatus === 'switch_plane') {
      this.renderSwitchPlaneScreen(ctx)
    } else if (databus.gameStatus === 'summon') {
      this.renderSummonScreen(ctx)
    } else if (databus.gameStatus === 'over') {
      this.renderGameOver(ctx)
    } else if (databus.gameStatus === 'playing') {
      this.renderHUD(ctx, player)
    }
  }

  // === 1. 开始屏幕 ===
  renderStartScreen(ctx, player) {
    this.drawBg(ctx, '#2d3436')
    ctx.fillStyle = '#6C63FF'; ctx.font = 'bold 40px Arial'; ctx.textAlign='center'; ctx.fillText('霓虹突击', screenWidth/2, screenHeight*0.2)
    
    let current = databus.ownedPlanes[databus.currentPlaneIndex]
    let color = COLORS['quality'+current.rank]
    
    ctx.fillStyle = color; ctx.font = 'bold 24px Arial'
    ctx.fillText(`当前: ${current.name} (Lv.${current.level||1})`, screenWidth/2, screenHeight*0.3)
    ctx.fillStyle = '#ccc'; ctx.font = '16px Arial'
    ctx.fillText(`Rank: ${current.rank} | HP: ${player.maxHp} | 攻: x${player.damageMultiplier.toFixed(1)}`, screenWidth/2, screenHeight*0.35)
    
    this.drawRes(ctx)
    this.drawBtn(ctx, screenWidth/2, screenHeight*0.45, '开始战斗')
    this.drawBtn(ctx, screenWidth/2, screenHeight*0.55, '机库 / 升级', '#555')
    this.drawBtn(ctx, screenWidth/2, screenHeight*0.65, '神殿召唤', '#e17055')
  }

  // === 2. 机库屏幕 ===
  renderSwitchPlaneScreen(ctx) {
    this.drawBg(ctx, '#2d3436')
    ctx.fillStyle = '#fff'; ctx.font = 'bold 36px Arial'; ctx.textAlign='center'
    ctx.fillText('皇家机库', screenWidth/2, screenHeight*0.15)
    this.drawRes(ctx) // 显示资源

    let plane = databus.ownedPlanes[this.previewPlaneIndex]
    let color = COLORS['quality'+plane.rank]
    
    ctx.shadowColor = color; ctx.shadowBlur = 20
    ctx.fillStyle = color; ctx.font = 'bold 80px Arial'
    ctx.fillText('✈️', screenWidth/2, screenHeight*0.30)
    ctx.shadowBlur = 0
    
    ctx.fillStyle = color; ctx.font = 'bold 30px Arial'
    ctx.fillText(plane.name, screenWidth/2, screenHeight*0.42)
    ctx.fillStyle = '#fff'; ctx.font = 'bold 24px Arial'
    ctx.fillText(`${plane.rank} 级战机 - Lv.${plane.level || 1}`, screenWidth/2, screenHeight*0.47)
    
    // 预览属性计算
    let baseHp = CONFIG.baseHp[plane.rank]
    let growth = 1 + ((plane.level||1) - 1) * CONFIG.levelGrowth
    let curHp = Math.floor(baseHp * growth)
    
    ctx.fillStyle = '#ccc'; ctx.font = '20px Arial'
    ctx.fillText(`生命值: ${curHp}`, screenWidth/2, screenHeight*0.53)
    ctx.fillText(`攻击力: ${(growth*100).toFixed(0)}%`, screenWidth/2, screenHeight*0.57)

    // 升级按钮
    let maxLv = CONFIG.maxLevel[plane.rank]
    if (plane.level < maxLv) {
        let cost = CONFIG.upgradeCostBase * plane.level
        let can = databus.crystals >= cost
        this.drawBtn(ctx, screenWidth/2, screenHeight*0.65, `升级 (需💎${cost})`, can ? '#e17055' : '#636e72')
    } else {
        ctx.fillStyle = '#e17055'; ctx.font = 'bold 24px Arial'
        ctx.fillText('已达到最大等级', screenWidth/2, screenHeight*0.65)
    }

    // 箭头
    ctx.fillStyle = '#fff'; ctx.font = 'bold 40px Arial'
    ctx.fillText('◀', screenWidth/2 - 120, screenHeight*0.35)
    ctx.fillText('▶', screenWidth/2 + 120, screenHeight*0.35)

    let isEquipped = (this.previewPlaneIndex === databus.currentPlaneIndex)
    this.drawBtn(ctx, screenWidth/2, screenHeight*0.75, isEquipped?'已出战':'出战', isEquipped?'#00b894':'#0984e3')
    this.drawBtn(ctx, screenWidth/2, screenHeight*0.85, '返回', '#555')
  }

  // === 3. 召唤屏幕 ===
  renderSummonScreen(ctx) {
    this.drawBg(ctx, 'rgba(0,0,0,0.9)')
    this.drawRes(ctx)

    if (this.summonResult) {
        let plane = this.summonResult
        let color = COLORS['quality'+plane.rank]
        ctx.shadowColor = color; ctx.shadowBlur = 20
        ctx.fillStyle = color; ctx.font = 'bold 60px Arial'; ctx.textAlign='center'
        ctx.fillText(plane.rank, screenWidth/2, screenHeight*0.4)
        ctx.shadowBlur = 0
        ctx.fillStyle = '#fff'; ctx.font = 'bold 30px Arial'
        ctx.fillText(plane.name, screenWidth/2, screenHeight*0.5)
        this.drawBtn(ctx, screenWidth/2, screenHeight*0.75, '收下', '#00b894')
    } else {
        ctx.fillStyle = '#e17055'; ctx.font = 'bold 36px Arial'; ctx.textAlign='center'
        ctx.fillText('神殿召唤', screenWidth/2, screenHeight*0.2)
        ctx.fillStyle = '#fff'; ctx.font = '16px Arial'
        ctx.fillText('SSR (10%) - 初始HP 500', screenWidth/2, screenHeight*0.4)
        ctx.fillText('SR  (40%) - 初始HP 300', screenWidth/2, screenHeight*0.45)
        ctx.fillText('R   (50%) - 初始HP 100', screenWidth/2, screenHeight*0.5)
        
        let color = databus.coins >= CONFIG.gachaCost ? '#e17055' : '#636e72'
        this.drawBtn(ctx, screenWidth/2, screenHeight*0.7, `召唤 (${CONFIG.gachaCost}币)`, color)
        this.drawBtn(ctx, screenWidth/2, screenHeight*0.85, '返回', '#555')
    }
  }

  // === 4. 游戏结束 ===
  renderGameOver(ctx) {
    this.drawBg(ctx, 'rgba(0,0,0,0.8)')
    ctx.fillStyle = '#FF5252'; ctx.font = 'bold 40px Arial'; ctx.textAlign='center'; ctx.fillText('GAME OVER', screenWidth/2, screenHeight*0.3)
    ctx.fillStyle = '#fff'; ctx.font = '24px Arial'; ctx.fillText(`SCORE: ${databus.score}`, screenWidth/2, screenHeight*0.4)
    ctx.fillStyle = '#FFD700'; ctx.font = '20px Arial'
    ctx.fillText(`获得金币: +${Math.floor(databus.score * 0.1)}`, screenWidth/2, screenHeight*0.46)

    if(databus.canRevive) this.drawBtn(ctx, screenWidth/2, screenHeight*0.6, '看广告复活', '#00b894')
    this.drawBtn(ctx, screenWidth/2, screenHeight*0.75, '返回主页')
  }

  // === 5. 战斗HUD ===
  renderHUD(ctx, player) {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'left'
    ctx.fillText(`SCORE: ${databus.score}`, 20, 40)
    ctx.fillText(`HP: ${databus.hp}/${player.maxHp}`, 20, 70) 
    
    let weapons = player.activeWeapons
    weapons.forEach((w, i) => { 
        let c = COLORS['bullet'+w.charAt(0).toUpperCase()+w.slice(1)]
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(screenWidth-20 - i*15, 60, 5, 0, Math.PI*2); ctx.fill() 
    })
  }

  // === 辅助方法 ===
  drawBg(ctx, color) { ctx.fillStyle = color; ctx.fillRect(0,0,screenWidth,screenHeight) }
  
  drawRes(ctx) {
      ctx.fillStyle = '#FFD700'; ctx.font = '20px Arial'; ctx.textAlign = 'left'
      ctx.fillText(`💰 ${databus.coins}  💎 ${databus.crystals}`, 20, 40); ctx.textAlign = 'center'
  }

  drawBtn(ctx, x, y, text, color='#FF6B6B') {
      ctx.fillStyle = color; ctx.fillRect(x-100, y-25, 200, 50)
      ctx.fillStyle = '#fff'; ctx.font = '20px Arial'; ctx.textBaseline='middle'; ctx.textAlign='center'; ctx.fillText(text, x, y)
  }

  // === 触摸交互处理 (返回操作指令) ===
  onTouch(x, y) {
      const isBtn = (bx, by) => Math.abs(x - bx) < 100 && Math.abs(y - by) < 30
      
      if (databus.gameStatus === 'start') {
          if (isBtn(screenWidth/2, screenHeight*0.45)) return 'CMD_START'
          if (isBtn(screenWidth/2, screenHeight*0.55)) {
              this.previewPlaneIndex = databus.currentPlaneIndex
              return 'CMD_OPEN_HANGAR'
          }
          if (isBtn(screenWidth/2, screenHeight*0.65)) return 'CMD_OPEN_SUMMON'
      } 
      else if (databus.gameStatus === 'switch_plane') {
          // 箭头
          if (Math.abs(y - screenHeight*0.4) < 40) {
              let len = databus.ownedPlanes.length
              if (Math.abs(x - (screenWidth/2 - 120)) < 40) { // 加宽了触摸范围
                  this.previewPlaneIndex = (this.previewPlaneIndex - 1 + len) % len
              } else if (Math.abs(x - (screenWidth/2 + 120)) < 40) {
                  this.previewPlaneIndex = (this.previewPlaneIndex + 1) % len
              }
          }
          if (isBtn(screenWidth/2, screenHeight*0.65)) return 'CMD_UPGRADE'
          if (isBtn(screenWidth/2, screenHeight*0.75)) return 'CMD_EQUIP'
          if (isBtn(screenWidth/2, screenHeight*0.85)) return 'CMD_BACK'
      }
      else if (databus.gameStatus === 'summon') {
          if (this.summonResult) {
              if (isBtn(screenWidth/2, screenHeight*0.75)) {
                  this.summonResult = null // UI内部消化
              }
          } else {
              if (isBtn(screenWidth/2, screenHeight*0.7)) return 'CMD_DO_SUMMON'
              if (isBtn(screenWidth/2, screenHeight*0.85)) return 'CMD_BACK'
          }
      }
      else if (databus.gameStatus === 'over') {
          if (databus.canRevive && isBtn(screenWidth/2, screenHeight*0.6)) return 'CMD_REVIVE_AD'
          if (isBtn(screenWidth/2, screenHeight*0.75)) return 'CMD_BACK'
      }
      return null
  }
}