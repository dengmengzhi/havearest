# 小憩一下

工作间隙歇几分钟的微信小程序。选一个时长，翻几张卡，到点了它提醒你回去。

当前处于 **MVP 一期脚手架**阶段：工程与 4 个页面骨架已就绪，5 个 P0 功能的业务逻辑尚未实现。

- 需求：`../小憩一下 · 第一期（MVP）需求文档.md`
- 设计文档：[docs/小憩一下MVP一期_20260920.md](docs/小憩一下MVP一期_20260920.md)
- 架构说明：[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 开始

```bash
pnpm install
pnpm dev:h5          # 浏览器里看 UI，全部走 mock，不需要任何配置
pnpm dev:mp-weixin   # 产物到 dist/dev/mp-weixin
```

微信小程序端用**微信开发者工具导入 `dist/dev/mp-weixin`**（不是项目根目录）。

appid 与云开发环境 id 已填写（见下）。**H5 端始终走 mock**，因为 `wx.cloud` 在浏览器里不存在——想验证真实云函数只能在微信开发者工具里跑。

## 命令

| 命令 | 作用 |
| --- | --- |
| `pnpm dev:h5` / `pnpm dev:mp-weixin` | 开发 |
| `pnpm build:h5` / `pnpm build:mp-weixin` | 构建 |
| `pnpm type-check` | 类型检查 |
| `pnpm lint` / `pnpm lint:fix` | 代码检查 |
| `pnpm test` | 单元测试 |
| `pnpm check:forbidden` | 违禁字样扫描，提审硬门槛 |
| `pnpm check:size` | 主包体积检查（需先构建） |
| `pnpm cloud:deploy` | 部署云函数（需先配 envId 并登录 tcb） |

## 环境配置

小程序 appid 与云开发环境 id 已填在这四处，换环境时改这些地方：

| 文件 | 字段 | 用途 |
| --- | --- | --- |
| `src/manifest.json` | `appid`、`mp-weixin.appid` | 构建期写进产物的 `project.config.json` |
| `src/cloud/env.ts` | `APPID`、`CLOUD_ENV` | 运行时传给 `wx.cloud.init()` |
| `cloudbaserc.json` | `envId` | `tcb` 部署云函数的目标环境 |

**云函数尚未部署**，所以小程序端调用会失败并走各 store 的兜底分支（问候回落欢迎语、卡片区显示占位、在线数显示保底文案）。界面不会崩，但内容是空的。部署：

```bash
npx tcb login      # 首次，走浏览器授权
pnpm cloud:deploy  # tcb fn deploy --all
```

另需在**微信公众平台后台**把最低基础库设为 2.30——这项没有对应的代码字段。

## 几条硬约束

这些来自 PRD 的非功能需求，已尽量做成静态检查，改代码时别绕过：

- **无声音、无振动、无弹窗、无红点** —— `uni.showToast` / `vibrateShort` 等已被 ESLint 禁用
- **仅使用 openid** —— 不取手机号、位置、头像昵称，相关 API 同样被禁用
- **配色低饱和** —— 颜色只能取自 `src/styles/tokens.scss`，组件内禁止裸 hex
- **对外文案统一用「小憩」** —— 由 `pnpm check:forbidden` 强制
- **伪装层内不得出现任何产品相关字样** —— 同上，该目录规则更严
- **主按钮落在屏幕下 40% 区域** —— 单手竖屏可达
