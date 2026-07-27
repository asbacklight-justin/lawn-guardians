# 草坪守卫战 · Lawn Guardians

一款原创、开源、可直接在浏览器运行的五路植物塔防游戏。收集阳光、布置植物，在三波越来越强的夜行入侵者面前守住花园。

> 本项目借鉴经典“种植资源 → 布置防线 → 分路抵御敌人”的塔防机制，但角色名称、视觉设计、程序代码和生成式主视觉均为原创内容，不包含《植物大战僵尸》的原始素材、音乐、商标或代码。

## 在线试玩

[立即开始《草坪守卫战》](https://lawn-guardians-play.asbacklight.chatgpt.site)

## 游戏特色

- 五行九列草坪与三波逐渐增强的敌人
- 六种功能不同的植物：资源、单发、双发、防御、减速和范围爆炸
- 三类具有不同生命值、速度与攻击力的入侵者
- 阳光收集、卡片冷却、铲除、草坪清扫机、暂停和二倍速
- 胜负结算、本地最高分记录、轻量 Web Audio 音效
- 键盘、鼠标与触屏操作
- 桌面与移动端响应式界面
- 无后端依赖，游戏状态只保存在当前浏览器

## 快速开始

### 环境要求

- Windows、macOS 或 Linux
- Node.js `>= 22.13.0`
- npm（随 Node.js 安装）

### 安装与运行

```powershell
git clone https://github.com/asbacklight-justin/lawn-guardians.git
cd lawn-guardians
npm install
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。

### 构建与检查

```powershell
npm run build
npm test
npm run lint
```

## 操作方式

| 操作 | 鼠标 / 触屏 | 键盘 |
| --- | --- | --- |
| 选择植物 | 点击植物卡片 | `1`–`6` |
| 种植 | 点击空草格 | — |
| 收集阳光 | 点击阳光 | — |
| 取消选择 | 再次点击卡片 | `Esc` |
| 暂停 / 继续 | 右上角暂停按钮 | `Space` |
| 铲除植物 | 选择铲子后点击植物 | — |
| 调整速度 | 右上角 `×1` / `×2` | — |

## 植物图鉴

| 植物 | 费用 | 定位 | 说明 |
| --- | ---: | --- | --- |
| 暖阳花 | 50 | 资源 | 定期生成可收集的阳光 |
| 豆荚藤 | 100 | 输出 | 向本行最近的敌人发射种子 |
| 双生藤 | 200 | 输出 | 每轮连续发射两颗种子 |
| 岩壳根 | 75 | 防御 | 高生命值，用于拖延敌人 |
| 霜叶蕨 | 175 | 控制 | 攻击造成伤害并减缓敌人 |
| 爆浆果 | 150 | 爆发 | 对附近一整片敌人造成高额伤害 |

## 项目结构

```text
lawn-guardians/
├─ app/
│  ├─ page.tsx          # 游戏状态、规则与界面
│  ├─ globals.css       # 场景、单位和响应式样式
│  └─ layout.tsx        # 页面元数据与社交分享配置
├─ public/
│  └─ og.png            # 原创开场与分享主视觉
├─ tests/
│  └─ rendered-html.test.mjs
├─ docs/                # 设计、架构、开发、部署与素材文档
├─ worker/              # Cloudflare Worker 入口
└─ .github/             # CI、Issue 与 PR 模板
```

更深入的资料：

- [玩法与数值](docs/GAMEPLAY.md)
- [技术架构](docs/ARCHITECTURE.md)
- [本地开发指南](docs/DEVELOPMENT.md)
- [部署指南](docs/DEPLOYMENT.md)
- [素材与版权说明](docs/ASSETS_AND_LICENSING.md)
- [路线图](docs/ROADMAP.md)

## 技术栈

- React 19
- TypeScript 5
- Next.js 兼容 App Router
- vinext + Vite
- Tailwind CSS 4（基础处理）与原生 CSS
- Cloudflare Workers / OpenAI Sites 兼容构建

## 贡献

欢迎提交缺陷、平衡性建议、新植物、新敌人、关卡和无障碍改进。开始前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 与 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。

## 安全问题

请不要在公开 Issue 中披露安全漏洞。处理方式见 [SECURITY.md](SECURITY.md)。

## 许可证

程序代码和项目文档采用 [MIT License](LICENSE)。

`public/og.png` 为本项目通过 OpenAI 内置图像生成工具创建的原创主视觉，可随本项目在 MIT License 条款下使用。第三方贡献者必须确保其提交内容拥有兼容的授权。
