let instance

export default class DataBus {
  constructor() {
    if (instance) return instance
    instance = this
    
    try {
      const savedData = wx.getStorageSync('playerData')
      if (savedData) {
        this.coins = savedData.coins || 0
        this.crystals = savedData.crystals || 0
        this.ownedPlanes = savedData.ownedPlanes || [] 
        this.currentPlaneIndex = savedData.currentPlaneIndex || 0
        this.maxLevelReached = savedData.maxLevelReached || 1 
      } else {
        this.initNewUser()
      }
    } catch (e) {
      this.initNewUser()
    }

    if (!this.ownedPlanes || this.ownedPlanes.length === 0) {
        this.ownedPlanes = [{name: '伊阿宋', rank: 'R', level: 1}]
        this.currentPlaneIndex = 0
    }
    
    this.reset()
  }

  initNewUser() {
    this.coins = 0
    this.crystals = 0
    this.ownedPlanes = []
    this.currentPlaneIndex = 0
    this.maxLevelReached = 1
  }

  saveData() {
    wx.setStorageSync('playerData', {
      coins: this.coins,
      crystals: this.crystals,
      ownedPlanes: this.ownedPlanes,
      currentPlaneIndex: this.currentPlaneIndex,
      maxLevelReached: this.maxLevelReached
    })
  }

  reset() {
    this.frame = 0
    this.score = 0
    this.hp = 100 
    this.gameStatus = 'start'
    this.bossActive = false
    this.shakeTimer = 0
    
    this.currentLevel = this.currentLevel || 1 
    this.levelTime = 0 // 必须为0，确保计时器从头开始
    
    this.bullets = []
    this.enemies = []
    this.enemyBullets = []
    this.particles = []
    this.drops = []
    this.bombs = []
    this.floatingTexts = []
  }
}