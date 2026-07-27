# 本地开发指南

## Windows

### 1. 安装工具

建议安装：

- [Git for Windows](https://git-scm.com/download/win)
- [Node.js 22 LTS 或更高版本](https://nodejs.org/)
- [Visual Studio Code](https://code.visualstudio.com/)（可选）

验证：

```powershell
git --version
node --version
npm --version
```

### 2. 获取并启动项目

```powershell
git clone https://github.com/asbacklight-justin/lawn-guardians.git
cd lawn-guardians
npm install
npm run dev
```

开发服务器默认位于 `http://localhost:3000/`。

### PowerShell 执行策略问题

如果 PowerShell 阻止 `npm.ps1`，可以直接运行：

```powershell
npm.cmd install
npm.cmd run dev
```

这不会修改系统执行策略。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生成生产构建 |
| `npm test` | 构建并检查服务端渲染结果 |
| `npm run lint` | 检查代码风格与常见问题 |
| `npm run start` | 启动已构建的生产版本 |

## 修改游戏数值

植物定义位于 `app/page.tsx` 的 `PLANTS` 常量。敌人数值位于 `spawnZombie`。

修改以下项目后请同步更新 `docs/GAMEPLAY.md`：

- 阳光费用
- 卡片冷却
- 生命和伤害
- 攻击间隔
- 敌人速度
- 波次数量与生成概率

## 添加新植物

1. 在 `PlantKey` 添加类型。
2. 在 `PLANTS` 添加名称、图标和数值。
3. 在 `stepGame` 实现其行为。
4. 在样式表中添加需要的视觉状态。
5. 更新 README 和玩法文档。
6. 增加或更新测试。

## 调试建议

- 将速度切换到 `×2` 可快速观察后期波次。
- 检查浏览器控制台是否存在 React 或资源错误。
- 调整数值时先记录基准局的通关时间和剩余阳光。
- 避免把 `Math.random()` 引入渲染函数；随机行为应只发生在状态更新中。

## 可访问性检查

- 所有可点击元素应有清晰的可访问名称
- 键盘焦点必须可见
- 不得仅用颜色传达冷却、选中或生命状态
- 动画应尊重 `prefers-reduced-motion`
- 移动端横向滚动不应阻止点击卡片或阳光

## 提交前检查

```powershell
npm test
npm run lint
git status --short
```

确保没有提交：

- `node_modules/`
- `dist/`
- `.env` 或令牌
- 临时压缩包
- 浏览器或编辑器缓存
