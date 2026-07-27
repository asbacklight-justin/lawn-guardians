# 贡献指南

感谢你愿意改进《草坪守卫战》。

## 开始之前

1. 对较大的玩法、架构或美术调整，请先创建 Issue 说明动机和方案。
2. 缺陷修复可以直接提交 Pull Request，但请在描述中给出复现步骤。
3. 不要提交《植物大战僵尸》或其他项目中提取的图片、音乐、字体、代码、名称或商标。
4. 新增素材必须为原创、公共领域，或拥有与 MIT License 兼容且允许再分发的许可。

## 开发流程

```powershell
git clone https://github.com/asbacklight-justin/lawn-guardians.git
cd lawn-guardians
npm install
git switch -c feature/简短描述
npm run dev
```

提交前运行：

```powershell
npm test
npm run lint
```

## 提交规范

建议使用简洁的动词开头：

- `Add endless survival mode`
- `Fix frost slow duration`
- `Improve mobile card tray`
- `Document balancing model`

一次提交尽量只处理一个逻辑主题。不要提交 `node_modules`、构建产物、编辑器缓存或密钥。

## Pull Request 要求

请说明：

- 改了什么
- 为什么要改
- 如何验证
- 是否改变游戏数值或存档格式
- 视觉改动的前后截图（如适用）
- 新增素材的来源和许可证

## 代码约定

- 使用 TypeScript，避免无必要的 `any`
- 保持游戏步进逻辑可预测，不在渲染过程中直接修改状态
- 新增交互需提供可访问名称，并兼顾键盘和触屏
- 动画必须尊重 `prefers-reduced-motion`
- 不将秘密、个人数据或部署凭据写入仓库

## 数值平衡

涉及费用、冷却、伤害、生命值、速度和波次的变更，请同步更新 [docs/GAMEPLAY.md](docs/GAMEPLAY.md)，并说明预期影响。
