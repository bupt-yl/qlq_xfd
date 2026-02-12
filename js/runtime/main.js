import DataBus from './databus.js'
import UI from './ui.js'
import Battle from './battle.js'
import { CONFIG, PLANES_DB } from '../base/config.js'

let canvas = null
let ctx = null
let databus = null

const AD_UNIT_ID = 'adunit-xxxxxxxxxxxxxxxx'

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
      this.videoAd.onClose(res => {
        if (res && res.isEnded) this.reviveHero()
        else wx.showToast({ title: '完整观看才能复活', icon: 'none' })
      })
    }
  }

  restart() {
    databus.reset()
    databus.highScore = wx.getStorageSync('highScore') || 0
    this.battle.restart()
  }

  loop() {
    databus.frame++
    
    if (databus.gameStatus === 'playing') {
      this.battle.update()
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // === 修改：移除了震动偏移逻辑 ===
    // let dx = 0, dy = 0 ... (已删除)
    
    ctx.save()
    // ctx.translate(dx, dy) (已删除)

    if (databus.gameStatus === 'playing') {
      this.battle.render(ctx)
    }
    
    this.ui.render(ctx, this.battle.player)
    
    ctx.restore()
    this.aniId = window.requestAnimationFrame(this.loop.bind(this), canvas)
  }

  touchMoveHandler(e) {
    if (databus.gameStatus === 'playing') {
      let x = e.touches[0].clientX
      let y = e.touches[0].clientY
      this.battle.player.x = x - this.battle.player.width/2
      this.battle.player.y = y - this.battle.player.height/2
    }
  }

  touchHandler(e) {
    const x = e.touches[0].clientX
    const y = e.touches[0].clientY
    
    const action = this.ui.onTouch(x, y)
    if (action) {
      this.handleAction(action)
    }
  }

  handleAction(action) {
    switch(action) {
      case 'CMD_START':
        this.restart()
        databus.gameStatus = 'playing'
        break
      case 'CMD_OPEN_HANGAR':
        databus.gameStatus = 'switch_plane'
        break
      case 'CMD_OPEN_SUMMON':
        databus.gameStatus = 'summon'
        this.ui.summonResult = null
        break
      case 'CMD_UPGRADE':
        this.upgradePlane()
        break
      case 'CMD_EQUIP':
        databus.currentPlaneIndex = this.ui.previewPlaneIndex
        databus.saveData()
        this.battle.restart()
        wx.showToast({title: '已装备', icon: 'success'})
        break
      case 'CMD_BACK':
        databus.gameStatus = 'start'
        break
      case 'CMD_DO_SUMMON':
        this.performSummon()
        break
      case 'CMD_REVIVE_AD':
        this.videoAd && this.videoAd.show()
        break
    }
  }

  upgradePlane() {
    let plane = databus.ownedPlanes[this.ui.previewPlaneIndex]
    let maxLv = CONFIG.maxLevel[plane.rank]
    let cost = CONFIG.upgradeCostBase * plane.level
    
    if (databus.crystals < cost) { wx.showToast({title: '水晶不足', icon: 'none'}); return }
    
    databus.crystals -= cost
    plane.level++
    databus.saveData()
    
    if (this.ui.previewPlaneIndex === databus.currentPlaneIndex) {
      this.battle.restart()
    }
    wx.showToast({title: '升级成功!', icon: 'success'})
  }

  performSummon() {
    if (databus.coins < CONFIG.gachaCost) { wx.showToast({title: '金币不足', icon: 'none'}); return }
    
    databus.coins -= CONFIG.gachaCost
    let r = Math.random()
    let rank = 'R'
    if (r < CONFIG.gachaRate.ssr) rank = 'SSR'
    else if (r < CONFIG.gachaRate.ssr + CONFIG.gachaRate.sr) rank = 'SR'
    
    let list = PLANES_DB[rank]
    let name = list[Math.floor(Math.random() * list.length)]
    
    let newPlane = { name, rank, level: 1 }
    databus.ownedPlanes.push(newPlane)
    databus.saveData()
    
    this.ui.summonResult = newPlane
  }

  reviveHero() {
    databus.gameStatus = 'playing'
    databus.hp = this.battle.player.maxHp 
    databus.canRevive = false
    databus.enemies = []; databus.enemyBullets = []; databus.bombs = []
    this.battle.player.invulTimer = 180
  }
}