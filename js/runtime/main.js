import DataBus from './databus.js'
import UI from './ui.js'
import Battle from './battle.js'
import { CONFIG, PLANES_DB } from '../base/config.js'

let canvas = null
let ctx = null
let databus = null
const AD_UNIT_ID = 'adunit-xxxxxxxxxxxxxxxx'
const screenWidth = wx.getSystemInfoSync().windowWidth
const screenHeight = wx.getSystemInfoSync().windowHeight

export default class Main {
  constructor() {
    canvas = wx.createCanvas()
    ctx = canvas.getContext('2d')
    databus = new DataBus()
    this.ui = new UI()
    this.battle = new Battle()
    this.initAd()
    this.restart() 
    wx.onTouchStart(this.touchHandler.bind(this))
    wx.onTouchMove(this.touchMoveHandler.bind(this))
    if (this.aniId) window.cancelAnimationFrame(this.aniId)
    this.aniId = window.requestAnimationFrame(this.loop.bind(this), canvas)
  }

  initAd() {
    if (wx.createRewardedVideoAd) {
      this.videoAd = wx.createRewardedVideoAd({ adUnitId: AD_UNIT_ID })
      this.videoAd.onClose(res => { if (res && res.isEnded) this.reviveHero(); else wx.showToast({ title: '完整观看才能复活', icon: 'none' }) })
    }
  }

  restart() {
    // 保持当前的 currentLevel 不变，只重置单局状态
    let curLvl = databus.currentLevel
    databus.reset()
    databus.currentLevel = curLvl
    this.battle.restart()
  }

  loop() {
    databus.frame++
    if (databus.gameStatus === 'playing') this.battle.update()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (databus.gameStatus === 'playing') this.battle.render(ctx)
    this.ui.render(ctx, this.battle.player)
    this.aniId = window.requestAnimationFrame(this.loop.bind(this), canvas)
  }

  touchMoveHandler(e) {
    if (databus.gameStatus === 'playing') {
      let x = e.touches[0].clientX; let y = e.touches[0].clientY
      this.battle.player.x = x - this.battle.player.width/2
      this.battle.player.y = y - this.battle.player.height/2
    }
  }

  touchHandler(e) {
    const x = e.touches[0].clientX; const y = e.touches[0].clientY

    // 处理肉鸽强化选择
    if (databus.isChoosingUpgrade && databus.gameStatus === 'playing') {
      this.handleUpgradeSelection(x, y)
      return
    }

    const action = this.ui.onTouch(x, y)
    if (action) this.handleAction(action)
  }

  // 处理强化选择触摸
  handleUpgradeSelection(x, y) {
    const options = databus.availableUpgrades || []
    if (options.length === 0) return

    const padding = 10
    const spacing = 15
    const availableWidth = screenWidth - padding * 2

    // 根据实际选项数量计算卡片宽度和起始位置（与UI渲染逻辑一致）
    const optionCount = Math.min(options.length, 3)
    const cardWidth = (availableWidth - spacing * (optionCount - 1)) / optionCount
    const cardHeight = Math.min(cardWidth * 0.8, 180)
    const totalWidth = cardWidth * optionCount + spacing * (optionCount - 1)
    const startX = padding + cardWidth / 2 + (availableWidth - totalWidth) / 2
    const cardY = screenHeight * 0.45

    options.forEach((option, index) => {
      const cardX = startX + index * (cardWidth + spacing)
      if (x >= cardX - cardWidth / 2 && x <= cardX + cardWidth / 2 &&
          y >= cardY - cardHeight / 2 && y <= cardY + cardHeight / 2) {
        this.battle.applyUpgrade(option.id)
      }
    })
  }

  handleAction(action) {
    switch(action) {
      case 'CMD_START':
        this.restart()
        databus.gameStatus = 'playing'
        break
      // === 选关逻辑 ===
      case 'CMD_PREV_LEVEL':
        if (databus.currentLevel > 1) databus.currentLevel--
        break
      case 'CMD_NEXT_LEVEL_SELECT':
        if (databus.currentLevel < databus.maxLevelReached && databus.currentLevel < CONFIG.TOTAL_LEVELS) databus.currentLevel++
        break
      case 'CMD_NEXT_LEVEL':
        // 进入下一关
        databus.currentLevel++
        this.restart()
        databus.gameStatus = 'playing'
        break
        
      case 'CMD_OPEN_HANGAR': databus.gameStatus = 'switch_plane'; break
      case 'CMD_OPEN_SUMMON': databus.gameStatus = 'summon'; this.ui.summonResult = null; break
      case 'CMD_UPGRADE': this.upgradePlane(); break
      case 'CMD_EQUIP': 
        databus.currentPlaneIndex = this.ui.previewPlaneIndex; databus.saveData(); this.battle.restart(); wx.showToast({title: '已装备', icon: 'success'})
        break
      case 'CMD_BACK': databus.gameStatus = 'start'; break
      case 'CMD_DO_SUMMON': this.performSummon(); break
      case 'CMD_DO_SUMMON_10': this.performSummon10(); break
      case 'CMD_REVIVE_AD': this.videoAd && this.videoAd.show(); break
    }
  }

  upgradePlane() {
    let plane = databus.ownedPlanes[this.ui.previewPlaneIndex]
    let maxLv = CONFIG.maxLevel[plane.rank]
    let cost = CONFIG.upgradeCostBase * plane.level
    if (databus.crystals < cost) { wx.showToast({title: '水晶不足', icon: 'none'}); return }
    databus.crystals -= cost; plane.level++; databus.saveData()
    if (this.ui.previewPlaneIndex === databus.currentPlaneIndex) this.battle.restart()
    wx.showToast({title: '升级成功!', icon: 'success'})
  }

  performSummon() {
    if (databus.coins < CONFIG.gachaCost) { wx.showToast({title: '金币不足', icon: 'none'}); return }
    databus.coins -= CONFIG.gachaCost
    let r = Math.random(); let rank = 'R'
    if (r < CONFIG.gachaRate.ssr) rank = 'SSR'
    else if (r < CONFIG.gachaRate.ssr + CONFIG.gachaRate.sr) rank = 'SR'
    let list = PLANES_DB[rank]; let name = list[Math.floor(Math.random() * list.length)]
    let newPlane = { name, rank, level: 1 }
    databus.ownedPlanes.push(newPlane); databus.saveData()
    this.ui.summonResult = newPlane
  }

  // 十连抽
  performSummon10() {
    const cost = Math.floor(CONFIG.gachaCost * 10 * 0.9) // 九折优惠
    if (databus.coins < cost) { wx.showToast({title: '金币不足', icon: 'none'}); return }
    databus.coins -= cost

    let results = []
    // 十连抽：保底至少1个SR或SSR
    let guaranteeSR = true

    for (let i = 0; i < 10; i++) {
      let r = Math.random()
      let rank = 'R'

      // 最后一次抽卡如果还没有SR/SSR，强制给一个
      if (i === 9 && guaranteeSR) {
        if (Math.random() < 0.3) {
          rank = 'SSR'
        } else {
          rank = 'SR'
        }
      } else {
        if (r < CONFIG.gachaRate.ssr) rank = 'SSR'
        else if (r < CONFIG.gachaRate.ssr + CONFIG.gachaRate.sr) rank = 'SR'
      }

      // 如果抽到SR或SSR，移除保底标记
      if (rank === 'SR' || rank === 'SSR') {
        guaranteeSR = false
      }

      let list = PLANES_DB[rank]
      let name = list[Math.floor(Math.random() * list.length)]
      let newPlane = { name, rank, level: 1 }
      results.push(newPlane)
    }

    // 批量添加到机库
    results.forEach(plane => databus.ownedPlanes.push(plane))
    databus.saveData()
    this.ui.summonResult = results
  }

  reviveHero() {
    databus.gameStatus = 'playing'
    databus.hp = this.battle.player.maxHp 
    databus.canRevive = false
    databus.enemies = []; databus.enemyBullets = []; databus.bombs = []
    this.battle.player.invulTimer = 180
  }
}