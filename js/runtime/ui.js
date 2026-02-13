import { CONFIG, COLORS } from '../base/config.js'
import DataBus from './databus.js'
import { UPGRADE_DEFINITIONS } from './props.js'

const databus = new DataBus()
const screenWidth = wx.getSystemInfoSync().windowWidth
const screenHeight = wx.getSystemInfoSync().windowHeight

export default class UI {
  constructor() {
    this.previewPlaneIndex = 0 
    
    // === 预加载飞机图片 ===
    this.planeImg = wx.createImage()
    this.planeImg.src = 'images/hero.png'
  }

  render(ctx, player) {
    if (databus.gameStatus === 'start') {
      this.renderStartScreen(ctx, player)
    } else if (databus.gameStatus === 'switch_plane') {
      this.renderSwitchPlaneScreen(ctx)
    } else if (databus.gameStatus === 'summon') {
      this.renderSummonScreen(ctx)
    } else if (databus.gameStatus === 'over') {
      this.renderGameOver(ctx)
    } else if (databus.gameStatus === 'level_success') {
      this.renderLevelSuccess(ctx)
    } else if (databus.gameStatus === 'playing') {
      this.renderHUD(ctx, player)
      // 肉鸽强化选择界面
      if (databus.isChoosingUpgrade) {
        this.renderUpgradeSelection(ctx)
      }
    }
  }

  // === 辅助：绘制染色后的飞机图片 ===
  drawPlaneModel(ctx, x, y, color) {
      if (!this.planeImg.complete) return // 图片还没加载好就不画

      const width = 100
      const height = 100
      
      ctx.save()
      ctx.translate(x, y)
      
      // 1. 绘制外发光 (光环)
      ctx.shadowColor = color
      ctx.shadowBlur = 30
      ctx.beginPath()
      ctx.arc(0, 0, 40, 0, Math.PI*2)
      ctx.fillStyle = color
      ctx.globalAlpha = 0.3
      ctx.fill()
      ctx.globalAlpha = 1.0
      
      // 2. 绘制飞机图片
      // 为了让飞机有品质颜色，我们使用 'source-atop' 混合模式简单模拟
      // 或者直接画图，然后在上面盖一层半透明的颜色
      ctx.drawImage(this.planeImg, -width/2, -height/2, width, height)
      
      // 染色层
      ctx.globalCompositeOperation = 'source-atop'
      ctx.fillStyle = color
      ctx.globalAlpha = 0.3 // 染色浓度
      ctx.fillRect(-width/2, -height/2, width, height)
      
      // 恢复混合模式
      ctx.globalCompositeOperation = 'source-over'
      ctx.restore()
  }

  renderSwitchPlaneScreen(ctx) {
      this.drawBg(ctx, '#2d3436')
      ctx.fillStyle = '#fff'; ctx.font = 'bold 36px Arial'; ctx.textAlign='center'
      ctx.fillText('皇家机库', screenWidth/2, screenHeight*0.15)
      this.drawRes(ctx)

      let plane = databus.ownedPlanes[this.previewPlaneIndex]
      let color = COLORS['quality'+plane.rank]
      
      // === 使用图片绘制飞机 ===
      this.drawPlaneModel(ctx, screenWidth/2, screenHeight*0.35, color)
      
      ctx.shadowColor = color; ctx.shadowBlur = 10
      ctx.fillStyle = color; ctx.font = 'bold 30px Arial'
      ctx.fillText(plane.name, screenWidth/2, screenHeight*0.48)
      ctx.shadowBlur = 0
      
      ctx.fillStyle = '#fff'; ctx.font = 'bold 24px Arial'
      ctx.fillText(`${plane.rank} 级战机 - Lv.${plane.level || 1}`, screenWidth/2, screenHeight*0.53)
      
      // 属性计算
      let baseHp = CONFIG.baseHp[plane.rank]
      let growth = 1 + ((plane.level||1) - 1) * CONFIG.levelGrowth
      let curHp = Math.floor(baseHp * growth)
      
      ctx.fillStyle = '#ccc'; ctx.font = '20px Arial'
      ctx.fillText(`生命值: ${curHp}`, screenWidth/2, screenHeight*0.6)
      ctx.fillText(`攻击力: ${(growth*100).toFixed(0)}%`, screenWidth/2, screenHeight*0.64)

      // 升级按钮
      let maxLv = CONFIG.maxLevel[plane.rank]
      if (plane.level < maxLv) {
        let cost = CONFIG.upgradeCostBase * plane.level
        let can = databus.crystals >= cost
        this.drawBtn(ctx, screenWidth/2, screenHeight*0.72, `升级 (需💎${cost})`, can ? '#e17055' : '#636e72')
      } else {
        ctx.fillStyle = '#e17055'; ctx.font = 'bold 24px Arial'
        ctx.fillText('已达到最大等级', screenWidth/2, screenHeight*0.72)
      }
      
      // 箭头
      ctx.fillStyle = '#fff'; ctx.font = 'bold 40px Arial'
      ctx.fillText('◀', screenWidth/2 - 120, screenHeight*0.35)
      ctx.fillText('▶', screenWidth/2 + 120, screenHeight*0.35)

      let isEquipped = (this.previewPlaneIndex === databus.currentPlaneIndex)
      this.drawBtn(ctx, screenWidth/2, screenHeight*0.82, isEquipped?'已出战':'出战', isEquipped?'#00b894':'#0984e3')
      this.drawBtn(ctx, screenWidth/2, screenHeight*0.92, '返回', '#555')
  }

  // === 以下是其他界面渲染方法，保持不变 ===

  renderHUD(ctx, player) {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'left'
    ctx.fillText(`Level ${databus.currentLevel}`, 20, 30)
    let timeLeft = Math.max(0, CONFIG.bossSpawnTime - Math.floor(databus.levelTime/60))
    if (!databus.bossActive) ctx.fillText(`Boss: ${timeLeft}s`, 120, 30)
    else { ctx.fillStyle = '#FF5252'; ctx.fillText(`BOSS FIGHT`, 120, 30) }
    ctx.fillStyle = '#fff'; ctx.fillText(`HP: ${databus.hp}/${player.maxHp}`, 20, 60)
    ctx.textAlign = 'right'; ctx.fillText(`Score: ${databus.score}`, screenWidth - 20, 30)

    // 显示升级进度条
    const expRequired = databus.getUpgradeExpRequired()
    const expProgress = databus.killsThisLevel / expRequired
    const barWidth = 150
    const barHeight = 20
    const barX = screenWidth - 20 - barWidth
    const barY = 50

    // 进度条背景
    ctx.fillStyle = '#2d3436'
    ctx.fillRect(barX, barY, barWidth, barHeight)

    // 进度条填充
    ctx.fillStyle = '#ffd700'
    ctx.fillRect(barX, barY, barWidth * expProgress, barHeight)

    // 边框
    ctx.strokeStyle = '#ffd700'
    ctx.lineWidth = 2
    ctx.strokeRect(barX, barY, barWidth, barHeight)

    // 文本
    ctx.fillStyle = '#fff'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`升级 Lv.${databus.upgradeLevel} ${databus.killsThisLevel}/${expRequired}`, barX + barWidth / 2, barY + 15)

    // 显示强化等级
    let yOffset = 85
    const upgradeTypes = ['bulletDamage', 'fireRate', 'laserFocus', 'multiShot', 'shieldRegen', 'criticalHit']
    upgradeTypes.forEach(type => {
      if (databus.upgrades[type] > 0) {
        const def = UPGRADE_DEFINITIONS[type]
        ctx.fillStyle = def.icon
        ctx.font = '14px Arial'
        ctx.textAlign = 'right'
        ctx.fillText(`${def.icon} Lv.${databus.upgrades[type]}/${def.maxLevel}`, screenWidth - 20, yOffset)
        yOffset += 20
      }
    })

    let weapons = player.activeWeapons
    weapons.forEach((w, i) => { let c = COLORS['bullet'+w.charAt(0).toUpperCase()+w.slice(1)]; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(screenWidth-20 - i*15, yOffset + 10, 5, 0, Math.PI*2); ctx.fill() })
  }
  
  renderLevelSuccess(ctx) {
    this.drawBg(ctx, 'rgba(0,0,0,0.85)')
    ctx.fillStyle = '#00b894'; ctx.font = 'bold 40px Arial'; ctx.textAlign='center'
    ctx.fillText('MISSION COMPLETE', screenWidth/2, screenHeight*0.3)
    ctx.fillStyle = '#fff'; ctx.font = '24px Arial'
    ctx.fillText(`关卡 ${databus.currentLevel} 完成!`, screenWidth/2, screenHeight*0.4)
    ctx.fillStyle = '#FFD700'; ctx.font = '20px Arial'
    ctx.fillText(`奖励: 💰${200*databus.currentLevel}  💎${5*databus.currentLevel}`, screenWidth/2, screenHeight*0.48)
    if (databus.currentLevel < CONFIG.TOTAL_LEVELS) this.drawBtn(ctx, screenWidth/2, screenHeight*0.65, '下一关', '#0984e3')
    else { ctx.fillStyle = '#fab1a0'; ctx.fillText("恭喜通关所有关卡！", screenWidth/2, screenHeight*0.6) }
    this.drawBtn(ctx, screenWidth/2, screenHeight*0.8, '返回主页', '#555')
  }

  renderStartScreen(ctx, player) {
    this.drawBg(ctx, '#2d3436')
    ctx.fillStyle = '#6C63FF'; ctx.font = 'bold 40px Arial'; ctx.textAlign='center'; ctx.fillText('霓虹突击', screenWidth/2, screenHeight*0.2)
    ctx.fillStyle = '#fff'; ctx.font = '24px Arial'
    ctx.fillText(`当前挑战: 第 ${databus.currentLevel} 关`, screenWidth/2, screenHeight*0.28)
    if (databus.currentLevel > 1) ctx.fillText('◀', screenWidth/2 - 100, screenHeight*0.28)
    if (databus.currentLevel < databus.maxLevelReached && databus.currentLevel < CONFIG.TOTAL_LEVELS) ctx.fillText('▶', screenWidth/2 + 100, screenHeight*0.28)
    let current = databus.ownedPlanes[databus.currentPlaneIndex]
    let color = COLORS['quality'+current.rank]
    ctx.fillStyle = color; ctx.font = 'bold 20px Arial'
    ctx.fillText(`${current.name} (Lv.${current.level||1})`, screenWidth/2, screenHeight*0.35)
    this.drawRes(ctx)
    this.drawBtn(ctx, screenWidth/2, screenHeight*0.45, '开始战斗')
    this.drawBtn(ctx, screenWidth/2, screenHeight*0.55, '机库 / 升级', '#555')
    this.drawBtn(ctx, screenWidth/2, screenHeight*0.65, '神殿召唤', '#e17055')
  }
  
  renderSummonScreen(ctx) {
    this.drawBg(ctx, 'rgba(0,0,0,0.9)'); this.drawRes(ctx)
    if (this.summonResult) {
      // 十连抽结果展示
      if (Array.isArray(this.summonResult)) {
        ctx.fillStyle = '#e17055'; ctx.font = 'bold 36px Arial'; ctx.textAlign='center'
        ctx.fillText('十连结果', screenWidth/2, screenHeight*0.15)

        // 显示10个结果（2行5列）
        const results = this.summonResult
        const startX = screenWidth / 2 - 140
        const startY = screenHeight * 0.35
        const spacing = 70

        results.forEach((p, index) => {
          const row = Math.floor(index / 5)
          const col = index % 5
          const x = startX + col * spacing
          const y = startY + row * spacing

          let c = COLORS['quality' + p.rank]
          ctx.fillStyle = c
          ctx.font = 'bold 30px Arial'
          ctx.fillText(p.rank, x, y)
          ctx.fillStyle = '#fff'
          ctx.font = '12px Arial'
          ctx.fillText(p.name, x, y + 20)
        })

        // 统计SSR数量
        const ssrCount = results.filter(p => p.rank === 'SSR').length
        if (ssrCount > 0) {
          ctx.fillStyle = '#ffd700'
          ctx.font = 'bold 24px Arial'
          ctx.fillText(`🎉 获得 ${ssrCount} 架 SSR!`, screenWidth/2, screenHeight*0.8)
        }

        this.drawBtn(ctx, screenWidth/2, screenHeight*0.9, '收下', '#00b894')
      } else {
        // 单抽结果
        let p = this.summonResult; let c = COLORS['quality'+p.rank]
        ctx.fillStyle = c; ctx.font = 'bold 60px Arial'; ctx.textAlign='center'; ctx.fillText(p.rank, screenWidth/2, screenHeight*0.4)
        ctx.fillStyle = '#fff'; ctx.font = 'bold 30px Arial'; ctx.fillText(p.name, screenWidth/2, screenHeight*0.5)
        this.drawBtn(ctx, screenWidth/2, screenHeight*0.75, '收下', '#00b894')
      }
    } else {
      ctx.fillStyle = '#e17055'; ctx.font = 'bold 36px Arial'; ctx.textAlign='center'; ctx.fillText('神殿召唤', screenWidth/2, screenHeight*0.2)

      // 单抽按钮
      this.drawBtn(ctx, screenWidth/2, screenHeight*0.6, `召唤 (${CONFIG.gachaCost}💰)`, '#e17055')
      // 十连抽按钮（打9折优惠）
      const tenPullCost = Math.floor(CONFIG.gachaCost * 10 * 0.9)
      this.drawBtn(ctx, screenWidth/2, screenHeight*0.73, `十连抽 (${tenPullCost}💰)`, '#ffd700')

      this.drawBtn(ctx, screenWidth/2, screenHeight*0.88, '返回', '#555')
    }
  }

  renderGameOver(ctx) {
    this.drawBg(ctx, 'rgba(0,0,0,0.8)')
    ctx.fillStyle = '#FF5252'; ctx.font = 'bold 40px Arial'; ctx.textAlign='center'; ctx.fillText('FAIL', screenWidth/2, screenHeight*0.3)
    ctx.fillStyle = '#fff'; ctx.font = '24px Arial'; ctx.fillText(`Level ${databus.currentLevel} 挑战失败`, screenWidth/2, screenHeight*0.4)
    if(databus.canRevive) this.drawBtn(ctx, screenWidth/2, screenHeight*0.6, '看广告复活', '#00b894')
    this.drawBtn(ctx, screenWidth/2, screenHeight*0.75, '返回主页')
  }

  drawBg(ctx, color) { ctx.fillStyle = color; ctx.fillRect(0,0,screenWidth,screenHeight) }
  drawRes(ctx) { ctx.fillStyle = '#FFD700'; ctx.font = '20px Arial'; ctx.textAlign = 'left'; ctx.fillText(`💰 ${databus.coins}  💎 ${databus.crystals}`, 20, 40); ctx.textAlign = 'center' }
  drawBtn(ctx, x, y, text, color='#FF6B6B') { ctx.fillStyle = color; ctx.fillRect(x-100, y-25, 200, 50); ctx.fillStyle = '#fff'; ctx.font = '20px Arial'; ctx.textBaseline='middle'; ctx.textAlign='center'; ctx.fillText(text, x, y) }

  // === 肉鸽强化选择界面 ===
  renderUpgradeSelection(ctx) {
    // 半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
    ctx.fillRect(0, 0, screenWidth, screenHeight)

    const options = databus.availableUpgrades || []

    // 如果没有可用的强化选项，直接返回（已在 handleDrop 中处理了奖励）
    if (options.length === 0) {
      return
    }

    // 标题
    ctx.fillStyle = '#6C63FF'
    ctx.font = 'bold 36px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('🎁 选择强化', screenWidth / 2, screenHeight * 0.12)

    // 渲染选项 - 自适应卡片大小
    const padding = 10
    const spacing = 15
    const availableWidth = screenWidth - padding * 2

    // 根据实际选项数量计算卡片宽度和起始位置
    const optionCount = Math.min(options.length, 3)
    const cardWidth = (availableWidth - spacing * (optionCount - 1)) / optionCount
    const cardHeight = Math.min(cardWidth * 0.8, 180)
    const totalWidth = cardWidth * optionCount + spacing * (optionCount - 1)
    const startX = padding + cardWidth / 2 + (availableWidth - totalWidth) / 2

    options.forEach((option, index) => {
      const x = startX + index * (cardWidth + spacing)
      const y = screenHeight * 0.45
      const currentLevel = databus.upgrades[option.id] || 0
      const isMaxLevel = currentLevel >= option.maxLevel
      const isFullLevel = currentLevel === option.maxLevel - 1

      // 卡片背景
      ctx.fillStyle = isMaxLevel ? '#636e72' : (isFullLevel ? '#e17055' : '#2d3436')
      ctx.strokeStyle = isFullLevel ? '#ffd700' : '#6C63FF'
      ctx.lineWidth = isFullLevel ? 4 : 2
      ctx.fillRect(x - cardWidth / 2, y - cardHeight / 2, cardWidth, cardHeight)
      ctx.strokeRect(x - cardWidth / 2, y - cardHeight / 2, cardWidth, cardHeight)

      // 图标（自适应大小）
      const iconSize = Math.min(cardWidth * 0.25, 48)
      ctx.font = `${Math.floor(iconSize)}px Arial`
      ctx.fillText(option.icon, x, y - cardHeight * 0.25)

      // 名称（自适应大小）
      const nameSize = Math.min(cardWidth * 0.15, 24)
      ctx.fillStyle = '#fff'
      ctx.font = `bold ${Math.floor(nameSize)}px Arial`
      ctx.fillText(option.name, x, y - cardHeight * 0.05)

      // 等级
      ctx.fillStyle = isMaxLevel ? '#aaa' : '#ffd700'
      ctx.font = `${Math.floor(cardWidth * 0.12)}px Arial`
      ctx.fillText(`Lv.${currentLevel}/${option.maxLevel}`, x, y + cardHeight * 0.1)

      // 描述
      ctx.fillStyle = '#ccc'
      ctx.font = `${Math.floor(cardWidth * 0.1)}px Arial`
      // 截断过长的描述
      let desc = option.description
      if (desc.length > 20) desc = desc.substring(0, 20) + '...'
      ctx.fillText(desc, x, y + cardHeight * 0.25)

      // 满级奖励描述
      if (isMaxLevel) {
        ctx.fillStyle = '#00b894'
        ctx.font = `bold ${Math.floor(cardWidth * 0.1)}px Arial`
        let bonus = option.maxBonusDescription
        if (bonus.length > 18) bonus = bonus.substring(0, 18) + '...'
        ctx.fillText(bonus, x, y + cardHeight * 0.38)
      } else if (isFullLevel) {
        ctx.fillStyle = '#ffd700'
        ctx.font = `bold ${Math.floor(cardWidth * 0.1)}px Arial`
        ctx.fillText('⭐ 下一级提升!', x, y + cardHeight * 0.38)
      }
    })
  }

  onTouch(x, y) {
      const isBtn = (bx, by) => Math.abs(x - bx) < 100 && Math.abs(y - by) < 30
      if (databus.gameStatus === 'start') {
          if (Math.abs(y - screenHeight*0.28) < 30) {
              if (Math.abs(x - (screenWidth/2 - 100)) < 40) return 'CMD_PREV_LEVEL'
              if (Math.abs(x - (screenWidth/2 + 100)) < 40) return 'CMD_NEXT_LEVEL_SELECT'
          }
          if (isBtn(screenWidth/2, screenHeight*0.45)) return 'CMD_START'
          if (isBtn(screenWidth/2, screenHeight*0.55)) { this.previewPlaneIndex = databus.currentPlaneIndex; return 'CMD_OPEN_HANGAR' }
          if (isBtn(screenWidth/2, screenHeight*0.65)) return 'CMD_OPEN_SUMMON'
      } 
      else if (databus.gameStatus === 'level_success') {
          if (databus.currentLevel < CONFIG.TOTAL_LEVELS && isBtn(screenWidth/2, screenHeight*0.65)) return 'CMD_NEXT_LEVEL'
          if (isBtn(screenWidth/2, screenHeight*0.8)) return 'CMD_BACK'
      }
      else if (databus.gameStatus === 'switch_plane') {
           if (Math.abs(y - screenHeight*0.35) < 50) {
              let len = databus.ownedPlanes.length
              if (Math.abs(x - (screenWidth/2 - 120)) < 50) this.previewPlaneIndex = (this.previewPlaneIndex - 1 + len) % len
              if (Math.abs(x - (screenWidth/2 + 120)) < 50) this.previewPlaneIndex = (this.previewPlaneIndex + 1) % len
           }
           if (isBtn(screenWidth/2, screenHeight*0.72)) return 'CMD_UPGRADE' 
           if (isBtn(screenWidth/2, screenHeight*0.82)) return 'CMD_EQUIP'   
           if (isBtn(screenWidth/2, screenHeight*0.92)) return 'CMD_BACK'    
      }
      else if (databus.gameStatus === 'summon') {
          if (this.summonResult) {
            // 十连抽结果显示在0.9位置，单抽在0.75位置
            if (Array.isArray(this.summonResult)) {
              if (isBtn(screenWidth/2, screenHeight*0.9)) this.summonResult = null
            } else {
              if (isBtn(screenWidth/2, screenHeight*0.75)) this.summonResult = null
            }
          }
          else {
              if (isBtn(screenWidth/2, screenHeight*0.6)) return 'CMD_DO_SUMMON'
              if (isBtn(screenWidth/2, screenHeight*0.73)) return 'CMD_DO_SUMMON_10'
              if (isBtn(screenWidth/2, screenHeight*0.88)) return 'CMD_BACK'
          }
      }
      else if (databus.gameStatus === 'over') {
          if (databus.canRevive && isBtn(screenWidth/2, screenHeight*0.6)) return 'CMD_REVIVE_AD'
          if (isBtn(screenWidth/2, screenHeight*0.75)) return 'CMD_BACK'
      }
      return null
  }
}