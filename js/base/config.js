export const CONFIG = {
  maxWeaponLevel: 3,
  maxActiveWeapons: 3, 
  maxWingmen: 3,
  
  // === 数值重构 ===
  // 战机初始血量 (1 : 3 : 7)
  baseHp: {
      R: 100,
      SR: 300,
      SSR: 700 // 修改：从500改为700，符合7倍设定
  },
  // 新增：战机基础攻击倍率 (1 : 3 : 7)
  baseAttack: {
      R: 1,
      SR: 3,
      SSR: 7 
  },
  
  // 等级上限
  maxLevel: {
      R: 3,
      SR: 5,
      SSR: 10
  },
  // 升级每级提升 10%
  levelGrowth: 0.1, 
  // 升级消耗水晶
  upgradeCostBase: 10,

  dropChance: 0.6,
  comboDecay: 150,
  bossSpawnScore: 800,
  
  // 抽奖配置
  gachaCost: 100, 
  gachaRate: {
    ssr: 0.10,
    sr: 0.40,
    r: 0.50
  },
  // 仅用于UI显示的参考倍率
  statsMultiplier: { 
    SSR: 7, // 修改：7倍
    SR: 3,
    R: 1
  },

  // 敌人伤害配置
  enemyDamage: {
      small: 10,
      medium: 20,
      boss: 50,
      bullet: 10,
      laser: 20
  }
}

// 希腊神话飞机数据库 (保持不变)
export const PLANES_DB = {
SSR: [ "宙斯 (Zeus)", "波塞冬 (Poseidon)", "哈迪斯 (Hades)", "雅典娜 (Athena)", "阿波罗 (Apollo)", "阿瑞斯 (Ares)", "赫拉 (Hera)", "得墨忒耳 (Demeter)", "阿尔忒弥斯 (Artemis)", "赫菲斯托斯 (Hephaestus)" ],
SR: [ "赫尔墨斯 (Hermes)", "狄奥尼索斯 (Dionysus)", "珀耳塞福涅 (Persephone)", "厄洛斯 (Eros)", "潘 (Pan)", "尼刻 (Nike)", "涅墨西斯 (Nemesis)", "伊里斯 (Iris)", "赫卡忒 (Hecate)", "堤喀 (Tyche)", "厄俄斯 (Eos)", "塞勒涅 (Selene)", "赫利俄斯 (Helios)", "塔纳托斯 (Thanatos)", "修普诺斯 (Hypnos)" ],
R: [ "伊阿宋 (Jason)", "阿喀琉斯 (Achilles)", "奥德修斯 (Odysseus)", "赫克托尔 (Hector)", "帕里斯 (Paris)", "阿雅克斯 (Ajax)", "俄耳甫斯 (Orpheus)", "忒修斯 (Theseus)", "珀尔修斯 (Perseus)", "柏勒洛丰 (Bellerophon)", "阿塔兰忒 (Atalanta)", "埃涅阿斯 (Aeneas)", "卡斯托尔 (Castor)", "波吕丢刻斯 (Pollux)", "代达罗斯 (Daedalus)" ]
}

export const COLORS = {
  player: '#6C63FF',
  wingman: '#00cec9',
  bulletNormal: '#FFD700',
  bulletLaser: '#00D2D3',
  bulletHeavy: '#2d3436',
  bulletHoming: '#a29bfe',
  bulletPlasma: '#74b9ff',
  bulletRapid: '#ff6b6b',
  bulletSnipe: '#1dd1a1',
  bulletShuriken: '#e17055',
  bulletBubble: '#81ecec',
  bulletPulse: '#fd79a8',
  enemyBullet: '#FF5252',
  shield: '#74b9ff',
  enemySmall: '#FF9F43',
  enemyMedium: '#d63031',
  boss: '#6c5ce7',
  trapBomb: '#2d3436',
  dropHealth: '#00b894',
  dropWeapon: '#ff7675',
  qualitySSR: '#FFD700', 
  qualitySR: '#A020F0',  
  qualityR: '#1E90FF',
  crystal: '#74b9ff' 
}