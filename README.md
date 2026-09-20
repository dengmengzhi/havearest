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

appid 和云开发环境 id 尚未填写，此时接入层自动降级到 mock，两端都能跑通界面。

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

## 拿到 appid 与云开发环境后

只需改三处：

1. `src/manifest.json` → `appid` 与 `mp-weixin.appid`
2. `src/cloud/env.ts` → `APPID` 与 `CLOUD_ENV`
3. `cloudbaserc.json` → `envId`

然后 `npx tcb login` 并 `pnpm cloud:deploy` 部署云函数。

另需在**微信公众平台后台**把最低基础库设为 2.30（这项无法通过代码配置）。

## 几条硬约束

这些来自 PRD 的非功能需求，已尽量做成静态检查，改代码时别绕过：

- **无声音、无振动、无弹窗、无红点** —— `uni.showToast` / `vibrateShort` 等已被 ESLint 禁用
- **仅使用 openid** —— 不取手机号、位置、头像昵称，相关 API 同样被禁用
- **配色低饱和** —— 颜色只能取自 `src/styles/tokens.scss`，组件内禁止裸 hex
- **对外文案统一用「小憩」** —— 由 `pnpm check:forbidden` 强制
- **伪装层内不得出现任何产品相关字样** —— 同上，该目录规则更严
- **主按钮落在屏幕下 40% 区域** —— 单手竖屏可达
