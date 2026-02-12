// 生成关卡数据
function generateLevels(count) {
  let levels = []
  for (let i = 0; i < count; i++) {
      let multiplier = Math.pow(1.3, i) 
      levels.push({
          level: i + 1,
          hpScale: multiplier,      
          dmgScale: multiplier,     
          bossHp: 600 * multiplier, 
          bgm: 'bgm.mp3'            
      })
  }
  return levels
}

export const CONFIG = {
  // === 基础配置 ===
  maxWeaponLevel: 3,
  maxActiveWeapons: 3, 
  maxWingmen: 3,
  dropChance: 0.6,
  
  // === 玩家配置 ===
  baseHp: { R: 100, SR: 300, SSR: 700 },
  baseAttack: { R: 1, SR: 3, SSR: 7 },
  maxLevel: { R: 3, SR: 5, SSR: 10 },
  levelGrowth: 0.1, 
  upgradeCostBase: 10,

  // === 关卡配置 ===
  TOTAL_LEVELS: 10,
  LEVELS: generateLevels(10),
  
  // 关键配置：60秒出Boss (你可以暂时改为 5 或 10 来快速测试 Boss 出现逻辑)
  bossSpawnTime: 60, 
  
  // 经济系统
  gachaCost: 100,
  gachaRate: { ssr: 0.10, sr: 0.40, r: 0.50 },
  statsMultiplier: { SSR: 7, SR: 3, R: 1 },

  // 敌人伤害配置
  enemyDamage: {
      small: 10,
      medium: 20,
      boss: 50,
      bullet: 10,
      laser: 20
  },

  // 颜色配置
  COLORS: {
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
}
export const COLORS = CONFIG.COLORS
// 飞机数据库保持不变...
export const PLANES_DB = {
SSR: [ "宙斯", "波塞冬", "哈迪斯", "雅典娜", "阿波罗", "阿瑞斯", "赫拉", "得墨忒耳", "阿尔忒弥斯", "赫菲斯托斯" ],
SR: [ "赫尔墨斯", "狄奥尼索斯", "珀耳塞福涅", "厄洛斯", "潘", "尼刻", "涅墨西斯", "伊里斯", "赫卡忒", "堤喀", "厄俄斯", "塞勒涅", "赫利俄斯", "塔纳托斯", "修普诺斯" ],
R: [ "伊阿宋", "阿喀琉斯", "奥德修斯", "赫克托尔", "帕里斯", "阿雅克斯", "俄耳甫斯", "忒修斯", "珀尔修斯", "柏勒洛丰", "阿塔兰忒", "埃涅阿斯", "卡斯托尔", "波吕丢刻斯", "代达罗斯" ]
}