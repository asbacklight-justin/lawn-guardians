# 部署指南

## 静态资源与 Worker 构建

运行：

```powershell
npm install
npm run build
```

成功后，部署输出位于 `dist/`，其中 `dist/server/index.js` 是 Cloudflare Workers 兼容入口。

## OpenAI Sites

项目根目录的 `.openai/hosting.json` 保存 Sites 项目标识。Sites 发布流程会：

1. 构建项目
2. 提交并推送对应源码
3. 打包 `dist/` 和托管配置
4. 保存站点版本
5. 将指定版本部署为生产版本

不要将源代码凭据、短期令牌或运行时密钥写入 `.openai/hosting.json`。

当前演示站：

<https://lawn-guardians-play.asbacklight.chatgpt.site>

## 自行部署到 Cloudflare

该项目使用 vinext 与 Cloudflare Vite 插件。自行部署前应：

- 准备 Cloudflare 账号
- 根据目标平台配置 Worker
- 确认 `nodejs_compat` 兼容标志
- 将运行时环境变量配置在平台侧，而不是提交到 Git

本游戏当前不使用 D1、R2 或服务端持久化，因此无需额外数据库资源。

## 其他平台

若部署到不支持 Cloudflare Worker 入口的平台，需要为目标平台选择对应的 Next.js / Vite 适配器。不要直接假设 `dist/server/index.js` 能在任意 Node.js 托管环境运行。

## 发布检查清单

- `npm test` 通过
- 首页标题和描述正确
- `public/og.png` 可访问
- 游戏可开始、暂停、重新开始
- 桌面和移动端布局可用
- 未提交任何密钥
- `CHANGELOG.md` 已更新
- 版本号符合发布内容
