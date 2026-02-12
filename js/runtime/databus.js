let instance

export default class DataBus {
  constructor() {
    if (instance) return instance
    instance = this
    
    try {
      const savedData = wx.getStorageSync('playerData')
      if (savedData) {
        this.coins = savedData.coins || 0
        this.crystals = savedData.crystals || 0 // 新增：能量水晶
        this.ownedPlanes = savedData.ownedPlanes || [] 
        this.currentPlaneIndex = savedData.currentPlaneIndex || 0
      } else {
        this.initNewUser()
      }
    } catch (e) {
      this.initNewUser()
    }

    // 兜底逻辑
    if (!this.ownedPlanes || this.ownedPlanes.length === 0) {
        this.ownedPlanes = [{name: '伊阿宋 (Jason)', rank: 'R', level: 1}]
        this.currentPlaneIndex = 0
    }
    
    // 数据迁移：给老存档的飞机加上 level 属性
    this.ownedPlanes.forEach(p => {
        if (!p.level) p.level = 1
    })

    this.reset()
  }

  initNewUser() {
    this.coins = 0
    this.crystals = 0
    this.ownedPlanes = []
    this.currentPlaneIndex = 0
  }

  saveData() {
    wx.setStorageSync('playerData', {
      coins: this.coins,
      crystals: this.crystals,
      ownedPlanes: this.ownedPlanes,
      currentPlaneIndex: this.currentPlaneIndex
    })
  }

  reset() {
    this.frame = 0
    this.score = 0
    this.highScore = 0
    this.hp = 100 // 默认值，会被 Player 覆盖
    this.gameStatus = 'start'
    this.bossActive = false
    this.combo = 0
    this.canRevive = true
    this.shakeTimer = 0
    this.bullets = []
    this.enemies = []
    this.enemyBullets = []
    this.particles = []
    this.drops = []
    this.bombs = []
    this.floatingTexts = []
  }
}