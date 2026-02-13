# Bug 修复说明

## 修复的问题

### 1. ✅ 拾取强化宝箱游戏没有暂停
**原因**：`update()` 方法中在选择强化时仍然调用了 `this.updateEntities()`，导致敌机和子弹继续移动。

**解决方案**：移除选择强化时的 `updateEntities()` 调用
```javascript
// 修复前
if (databus.isChoosingUpgrade) {
  this.updateEntities()  // ❌ 仍在更新实体
  return
}

// 修复后
if (databus.isChoosingUpgrade) {
  return  // ✅ 完全停止所有游戏逻辑
}
```

**效果**：
- 拾取强化宝箱后，敌机完全停止移动
- 敌方子弹停止移动
- 所有实体暂停，游戏完全冻结

### 2. ✅ 激光武器强化没有提升
**原因**：原来的激光聚焦只对 `type === 'laser'` 的子弹生效，但玩家可能没有装备激光武器。

**解决方案**：修改 `battle.js` 中的伤害计算逻辑
```javascript
// 修复前：只对激光子弹生效
if (b.type === 'laser' && databus.upgrades.laserFocus > 0) {
  damage *= (1 + databus.upgrades.laserFocus * UPGRADE_DEFINITIONS.laserFocus.bonusPerLevel)
}

// 修复后：装备激光武器时对所有子弹生效，激光子弹获得额外加成
if (databus.upgrades.laserFocus > 0) {
  const hasLaser = databus.activeWeapons.some(w => w === 'laser')
  if (b.type === 'laser' || hasLaser) {
    const laserBonus = 1 + databus.upgrades.laserFocus * UPGRADE_DEFINITIONS.laserFocus.bonusPerLevel
    damage *= (b.type === 'laser' ? laserBonus : 1 + (laserBonus - 1) * 0.5)
  }
}
```

**效果**：
- 激光子弹：获得 100% 的激光聚焦加成
- 其他子弹：如果玩家装备了激光武器，获得 50% 的激光聚焦加成
- 同时也更新了描述文本，从"激光武器伤害 +25%"改为"武器伤害 +25%"

### 3. ✅ 选择强化卡片太大溢出屏幕
**原因**：固定卡片宽度（280px）在小屏幕上会导致3个卡片溢出。

**解决方案**：改为自适应卡片大小
```javascript
// 修复前：固定大小
const cardWidth = 280
const cardHeight = 220

// 修复后：自适应屏幕
const padding = 10
const spacing = 15
const availableWidth = screenWidth - padding * 2
const cardWidth = (availableWidth - spacing * 2) / 3
const cardHeight = Math.min(cardWidth * 0.8, 180)
```

**同时优化**：
- 所有文字、图标大小都根据卡片宽度自适应缩放
- 过长的描述文本自动截断并添加"..."
- 满级奖励文本也自动截断
- 同步修改了 `main.js` 中的触摸检测逻辑，使用相同的尺寸计算

---

## 修改的文件

### js/runtime/battle.js
- 修改激光聚焦的伤害计算逻辑
- 支持装备激光武器时对所有子弹提供部分加成

### 4. ✅ 满级强化出现在卡片中
**原因**：`getRandomUpgrades` 函数没有过滤已满级的强化，导致已达到5级的强化仍然出现在随机选项中。

**解决方案**：新增 `getAvailableUpgrades` 函数，过滤掉已满级的强化
```javascript
export function getAvailableUpgrades(count = 3, currentLevels) {
  const keys = Object.keys(UPGRADE_DEFINITIONS)
  // 过滤掉已满级的强化
  const availableKeys = keys.filter(key => {
    const def = UPGRADE_DEFINITIONS[key]
    const currentLevel = currentLevels[key] || 0
    return currentLevel < def.maxLevel
  })

  // 如果没有可用的强化选项，返回空数组
  if (availableKeys.length === 0) {
    return []
  }

  // 如果可选项不足请求的数量，只返回实际可用的数量
  const actualCount = Math.min(count, availableKeys.length)

  const shuffled = availableKeys.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, actualCount).map(key => ({
    id: key,
    ...UPGRADE_DEFINITIONS[key]
  }))
}
```

**效果**：
- 已满级的强化（等级 = 5）不会出现在选项中
- 如果可选项不足3个，只显示实际可用的数量（1或2个）
- 如果所有强化都满级，给予额外奖励（恢复50%生命值 + 金币）
- 卡片自动居中显示，适配不同数量

### 5. ✅ 可选项不足时仍显示空卡片
**原因**：UI始终渲染3个固定位置的卡片，即使只有1或2个可选项。

**解决方案**：根据实际选项数量动态调整卡片布局
```javascript
// 根据实际选项数量计算卡片宽度和起始位置
const optionCount = Math.min(options.length, 3)
const cardWidth = (availableWidth - spacing * (optionCount - 1)) / optionCount
const totalWidth = cardWidth * optionCount + spacing * (optionCount - 1)
const startX = padding + cardWidth / 2 + (availableWidth - totalWidth) / 2
```

**效果**：
- 1个选项：显示1个居中的大卡片
- 2个选项：显示2个居中的中等卡片
- 3个选项：显示3个较小的卡片（原布局）
- 所有选项都不显示：不打开选择界面，直接给予奖励
**原因**：`getRandomUpgrades` 函数没有过滤已满级的强化，导致已达到5级的强化仍然出现在随机选项中。

**解决方案**：新增 `getAvailableUpgrades` 函数，过滤掉已满级的强化
```javascript
export function getAvailableUpgrades(count = 3, currentLevels) {
  const keys = Object.keys(UPGRADE_DEFINITIONS)
  // 过滤掉已满级的强化
  const availableKeys = keys.filter(key => {
    const def = UPGRADE_DEFINITIONS[key]
    const currentLevel = currentLevels[key] || 0
    return currentLevel < def.maxLevel
  })

  // 如果可选项不足，则从所有选项中随机选
  const pool = availableKeys.length >= count ? availableKeys : keys

  const shuffled = pool.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count).map(key => ({
    id: key,
    ...UPGRADE_DEFINITIONS[key]
  }))
}
```

**效果**：
- 已满级的强化（等级 = 5）不会出现在选项中
- 如果可选项不足3个，会从所有选项中随机选择（仍不包含满级的）
- 保证玩家每次都能选择有意义的强化

---

## 修改的文件

### js/runtime/battle.js
- 修改激光聚焦的伤害计算逻辑
- 支持装备激光武器时对所有子弹提供部分加成
- 使用新的 `getAvailableUpgrades` 函数替代 `getRandomUpgrades`

### js/runtime/props.js
- 更新激光聚焦的描述文本
- 新增 `getAvailableUpgrades` 函数，过滤已满级的强化
- 支持返回实际可用的强化数量（1-3个）
- 删除旧的 `getRandomUpgrades` 函数

### js/runtime/ui.js
- 改为自适应卡片大小
- 根据实际选项数量动态调整布局
- 卡片自动居中显示
- 所有UI元素根据屏幕宽度动态计算

### js/runtime/main.js
- 同步更新触摸检测逻辑，匹配动态卡片布局

---

## 测试建议

1. **测试暂停功能**
   - 拾取强化宝箱后，确认游戏逻辑暂停（敌人不移动、不攻击）
   - 确认只有UI层在渲染

2. **测试激光聚焦**
   - 选择激光聚焦强化后，确认伤害提升
   - 如果没有激光武器，确认其他子弹也有伤害提升（50%效果）

3. **测试卡片适配**
   - 在不同屏幕尺寸下测试
   - 确认3个卡片都能完整显示
   - 确认触摸响应正确

4. **测试满级过滤**
   - 将某个强化提升到5级
   - 拾取新的强化宝箱
   - 确认已满级的强化不会出现在选项中

5. **测试选项数量适配**
   - 将5个强化提升到5级，只留1个可用
   - 拾取强化宝箱
   - 确认只显示1个居中的卡片
   - 将4个强化提升到5级，只留2个可用
   - 确认显示2个居中的卡片

6. **测试全部满级**
   - 将所有6个强化都提升到5级
   - 拾取强化宝箱
   - 确认不打开选择界面
   - 确认直接获得50%生命值恢复和金币奖励

---

## 技术细节

### 激光聚焦强化详解

**原始设计问题**：
- 激光聚焦只对 `type === 'laser'` 的子弹生效
- 玩家需要先获得激光武器（掉落）才能受益
- 概率性获得，体验不稳定

**改进方案**：
- 检测玩家是否装备激光武器（`databus.activeWeapons.some(w => w === 'laser')`）
- 激光子弹：获得 100% 的加成（原设计）
- 其他子弹：如果装备了激光，获得 50% 的加成（新增）

这样即使没有掉落激光武器，选择激光聚焦强化也能提供稳定的伤害提升。

### 自适应UI详解

**计算逻辑**：
1. 计算可用宽度：`screenWidth - padding * 2`
2. 计算卡片宽度：`(可用宽度 - 间距 * 2) / 3`
3. 计算卡片高度：`Math.min(卡片宽度 * 0.8, 180)`
4. 所有内部元素按卡片宽度比例缩放

**优点**：
- 适配任意屏幕宽度
- 保持卡片宽高比一致
- 文字大小自动缩放，避免溢出
- 长文本自动截断

---

## 版本历史

- v1.5 (2026-02-13)
  - 修复可选项不足时仍显示空卡片的问题
  - 根据实际可用强化数量动态调整卡片布局
  - 全部满级时给予额外奖励（恢复50%HP + 金币）

- v1.4 (2026-02-13)
  - 修复选择强化时敌机仍可移动的bug
  - 完全停止所有游戏逻辑和实体更新

- v1.3 (2026-02-13)
  - 修复满级强化仍出现在选项中的问题
  - 新增 `getAvailableUpgrades` 函数过滤已满级强化

- v1.2 (2026-02-13)
  - 修复激光聚焦强化无效果问题
  - 修复卡片溢出屏幕问题
  - 添加自适应UI系统
