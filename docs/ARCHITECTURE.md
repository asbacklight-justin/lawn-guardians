# 技术架构

## 总览

《草坪守卫战》是单页面、无后端依赖的实时塔防游戏。核心逻辑集中在 `app/page.tsx`，视觉与动画集中在 `app/globals.css`。

```text
用户输入
  ↓
React 事件处理（选择、种植、收集、暂停）
  ↓
GameState
  ↓
50ms 固定调度器 → stepGame(state, delta)
  ↓
生成 / 移动 / 碰撞 / 攻击 / 胜负判断
  ↓
React 重新渲染战场
```

## 运行时模型

### 固定调度

浏览器每 50ms 调用一次 `stepGame`。正常速度下步长为 `0.05` 秒，二倍速下为 `0.1` 秒。暂停时保持当前状态不变。

当前实现使用固定调度而非 `requestAnimationFrame`，原因是：

- 数值逻辑更容易理解和调整
- 二倍速只需改变逻辑步长
- 页面失焦时不依赖逐帧视觉更新

未来如果增加复杂动画，可保留固定逻辑步进，并用 `requestAnimationFrame` 对显示位置做插值。

### 状态结构

`GameState` 包含：

- 关卡状态：`phase`、`paused`、`speed`
- 资源与成绩：`sun`、`score`、`kills`
- 实体数组：`plants`、`zombies`、`bullets`、`suns`、`bursts`
- 关卡进度：`elapsed`、`spawned`、`nextSpawnAt`
- 一次性防线：`mowers`
- 卡片状态：`cooldowns`

实体通过递增的数字 ID 标识。每个步进函数都基于上一状态创建新对象，避免直接修改 React 已持有的状态。

## 坐标系统

- 战场逻辑宽度为 9 个单位，对应 9 列
- 战场逻辑高度为 5 个单位，对应 5 行
- 植物放置在整数列的中心
- 敌人以浮点横坐标从右向左移动
- DOM 使用百分比定位，因此渲染尺寸变化不会改变游戏数值

## 碰撞与战斗

1. 植物根据自身计时器判断是否攻击。
2. 子弹按固定速度向右移动。
3. 子弹只检测同一行、位于本次移动区间内的最前方敌人。
4. 敌人进入植物所在单元后停止移动并持续扣除植物生命值。
5. 敌人越过左边界时先触发该行清扫机；清扫机已消耗则判负。

## 波次系统

当前关卡生成 30 个敌人，每 10 个为一波。波次会影响：

- 生成间隔
- 敌人种类概率
- 重装敌人出现频率

全部敌人生成且战场清空后判定胜利。

## 持久化

仅最高分写入浏览器 `localStorage`：

```text
lawn-guardians-best
```

游戏局内状态、偏好和关卡进度不会上传，也不会跨设备同步。

## 构建与部署

vinext 将 App Router 代码转换为 Vite / Cloudflare Workers 兼容输出：

- 客户端资源：`dist/client`
- Worker 入口：`dist/server/index.js`
- 托管声明：`.openai/hosting.json`

详细步骤见 [DEPLOYMENT.md](DEPLOYMENT.md)。

## 扩展建议

当项目规模继续增长时，建议逐步拆分：

```text
app/game/
├─ engine.ts
├─ types.ts
├─ balance.ts
├─ components/
└─ hooks/
```

拆分时应先增加引擎单元测试，保证移动、伤害、冷却和胜负判定行为不变。
