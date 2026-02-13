# 肉鸽强化系统 - 完整代码

## 修改概述

将原有的局内掉落系统（武器、道具、水晶等）改造为肉鸽强化选择系统，玩家在战斗中拾取强化宝箱后，可以从3个随机强化选项中选择一个进行强化。同时添加十连抽功能。

---

## 六大流派强化

| 流派ID | 名称 | 图标 | 效果 | 满级奖励 |
|--------|------|------|------|----------|
| `bulletDamage` | 子弹强化 | 💥 | 所有子弹伤害 +15% | 满级：伤害 +100% |
| `fireRate` | 极速射击 | ⚡ | 射击速度 +10% | 满级：射速 +50% |
| `laserFocus` | 激光聚焦 | 🔆 | 激光武器伤害 +25% | 满级：激光伤害 +125% |
| `multiShot` | 多重弹幕 | 🎯 | 增加同时发射的子弹数量 | 满级：同时发射 +5发子弹 |
| `shieldRegen` | 护盾回复 | 🛡️ | 击杀敌人5%概率获得护盾 | 满级：25%概率获得护盾 |
| `criticalHit` | 致命打击 | ⭐ | 暴击率 +8%，暴击伤害 +50% | 满级：暴击率 +40% |

---

## 修改的文件

### 1. js/runtime/databus.js
- 添加 `upgrades` 对象追踪六大流派等级
- 添加 `activeWeapons`、`fireRateMultiplier`、`criticalRate` 属性
- 添加 `isChoosingUpgrade` 标记是否在选择强化
- 修改 `reset()` 方法，保留肉鸽数据直到游戏重新开始

### 2. js/runtime/props.js
- 定义 `UPGRADE_DEFINITIONS` 强化配置
- 实现 `getRandomUpgrades()` 随机生成3个强化选项
- 修改 `Drop` 类，改为强化宝箱类型

### 3. js/runtime/battle.js
- 导入 `UPGRADE_DEFINITIONS` 和 `getRandomUpgrades`
- 修改 `update()`，选择强化时暂停游戏逻辑
- 修改 `collisionDetection()`：
  - 应用子弹伤害加成
  - 应用激光聚焦加成
  - 实现暴击系统
  - 实现护盾回复机制
  - 改为掉落强化宝箱
- 修改 `shootLogic()`：
  - 计算射速倍率
  - 实现多重射击
- 修改 `handleDrop()` 为触发强化选择
- 新增 `applyUpgrade()` 方法应用强化

### 4. js/runtime/ui.js
- 导入 `UPGRADE_DEFINITIONS`
- 修改 `renderHUD()` 显示已获得的强化等级
- 新增 `renderUpgradeSelection()` 渲染强化选择界面

### 5. js/runtime/main.js
- 添加 `screenWidth` 和 `screenHeight` 常量
- 修改 `touchHandler()` 处理强化选择触摸
- 新增 `handleUpgradeSelection()` 处理强化卡片点击

### 6. js/player/index.js
- 修改 `activeWeapons` 初始化，使用 databus 中的武器数据

---

## 十连抽系统

### 功能特点
- **九折优惠**：十连抽享受10%折扣（成本 = 单抽 × 10 × 0.9）
- **保底机制**：十连抽至少保证获得1个SR或SSR
- **批量展示**：以2行5列的形式展示10次抽卡结果
- **统计信息**：获得SSR时显示恭喜提示

### 抽卡对比

| 项目 | 单抽 | 十连抽 |
|------|------|--------|
| 消耗金币 | 100 | 900（节省100） |
| 保底 | 无 | 至少1个SR或SSR |
| 展示 | 单架飞机 | 2×5网格展示 |

### 保底规则
- 如果前9次都是R级，第10次必定出SR或SSR
- 第10次保底概率：30% SSR，70% SR
- 如果前9次已经出过SR/SSR，则第10次正常按概率抽

---

## 游戏流程

```
战斗开始
    ↓
击杀敌人
    ↓
掉落强化宝箱 🎁
    ↓
拾取宝箱 → 暂停游戏
    ↓
显示3个随机强化选项
    ↓
玩家选择一个 → 应用强化
    ↓
恢复战斗
    ↓
满级任意流派 → 恢复30%生命值
```

---

## 技术特点

1. **状态管理**：强化数据存储在 databus 中，跨文件共享
2. **暂停机制**：选择强化时暂停 `battle.update()`，只渲染UI
3. **随机选项**：每次从6大流派中随机选择3个不重复的选项
4. **视觉反馈**：
   - 满级卡片显示金色边框
   - 下一级满级显示满级奖励描述
   - HUD显示已获得的强化等级
5. **加成计算**：
   - 子弹伤害 = 基础伤害 × (1 + bulletDamage × 0.15) × (1 + laserFocus × 0.25) × 暴击
   - 射速间隔 = 基础间隔 / fireRateMultiplier
   - 子弹数量 = 基础武器 + multiShot

---

## 配置说明

所有强化配置在 `props.js` 的 `UPGRADE_DEFINITIONS` 中：

```javascript
export const UPGRADE_DEFINITIONS = {
  bulletDamage: {
    name: '子弹强化',
    icon: '💥',
    description: '提升所有子弹伤害 15%',
    maxLevel: 5,
    bonusPerLevel: 0.15,
    maxBonusDescription: '满级：伤害 +100%'
  },
  // ... 其他流派
}
```

---

## 使用说明

1. 进入战斗后，击杀敌人有概率掉落强化宝箱（🎁）
2. 拾取宝箱后游戏自动暂停，显示3个强化选项
3. 点击任意卡片选择强化
4. 强化立即生效，游戏恢复
5. 任意流派达到5级满级时，恢复30%生命值
6. 所有强化保留到游戏结束（死亡或通关）
7. 下一局游戏重新开始时，强化数据重置

---

## 扩展建议

1. 可以添加更多流派（如：穿透、爆炸、反射等）
2. 可以实现流派联动效果（如：同时满级多个流派触发终极技能）
3. 可以添加难度平衡（Boss的血量随玩家总强化等级提升）
4. 可以添加三十连抽/百连抽，增加更多保底机制
5. 可以添加每日免费单抽次数

---

## 十连抽代码说明

### main.js 修改
```javascript
// 十连抽方法
performSummon10() {
  const cost = Math.floor(CONFIG.gachaCost * 10 * 0.9) // 九折优惠
  // 保底机制：至少1个SR或SSR
  // 批量添加到机库
  // 结果以数组形式传递给UI
}
```

### ui.js 修改
```javascript
// 渲染十连抽结果
renderSummonScreen(ctx) {
  if (Array.isArray(this.summonResult)) {
    // 2行5列展示10个结果
    // 统计SSR数量并显示恭喜
  }
}

// 处理十连抽按钮
onTouch(x, y) {
  case 'CMD_DO_SUMMON_10': return 'CMD_DO_SUMMON_10'
}
```
