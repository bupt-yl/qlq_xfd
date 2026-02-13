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
    this.levelTime = 0

    this.bullets = []
    this.enemies = []
    this.enemyBullets = []
    this.particles = []
    this.drops = []
    this.bombs = []
    this.floatingTexts = []

    // 肉鸽强化系统（仅在游戏开始时初始化）
    if (!this.upgrades) {
      this.upgrades = {
        bulletDamage: 0,      // 子弹伤害流派
        fireRate: 0,          // 射速流派
        laserFocus: 0,        // 激光专注流派
        multiShot: 0,         // 多重射击流派
        shieldRegen: 0,       // 护盾回复流派
        criticalHit: 0        // 暴击流派
      }
      this.activeWeapons = ['normal']  // 当前激活的武器
      this.fireRateMultiplier = 1.0    // 射速倍率
      this.criticalRate = 0.0         // 暴击率
    }

    // 经验升级系统
    this.upgradeLevel = 1        // 强化等级
    this.upgradeExp = 0         // 当前经验值
    this.killsThisLevel = 0      // 本级击杀数

    this.isChoosingUpgrade = false   // 是否正在选择强化
    this.availableUpgrades = []      // 可选的强化选项
  }

  // 计算升级所需的经验值（二次函数增长）
  // 升级所需击杀数 = 3 + (等级-1) * 0.5 * (等级)
  getUpgradeExpRequired() {
    return Math.floor(3 + (this.upgradeLevel - 1) * 0.5 * this.upgradeLevel)
  }

  // 添加经验值
  addUpgradeExp(amount = 1) {
    const required = this.getUpgradeExpRequired()

    if (this.killsThisLevel + amount >= required) {
      this.killsThisLevel = 0
      this.upgradeLevel++
      return true  // 升级了
    } else {
      this.killsThisLevel += amount
      return false  // 未升级
    }
  }
}