# 架构说明

> 本文件描述分层、依赖方向与目录约定。新增或调整模块、分层、依赖关系、对外接口、技术选型时**必须同步回写这里**。
>
> 当前状态：MVP 一期脚手架（2026-09-20）。5 个 P0 功能的业务逻辑尚未实现，store 与云函数均为骨架。

## 技术选型

| 层 | 选型 | 备注 |
| --- | --- | --- |
| 框架 | uni-app（Vue 3 + Vite + TS） | 由 `create-uni@2.17.1` 生成 |
| 构建 CLI | `@uni-helper/unh` | **不是**官方 `uni` 命令。`unh build wx` / `unh dev h5` |
| Vite 插件 | `@uni-helper/plugin-uni` | 替代 `@dcloudio/vite-plugin-uni` 在 vite.config 中的位置 |
| 状态 | Pinia（setup 写法） | 替代 PRD 原方案的 `app.globalData` + 事件总线 |
| 后端 | 微信云开发（`wx.cloud`） | 仅 mp-weixin 端可用 |
| 云函数部署 | CloudBase CLI（`tcb`） | 独立于小程序产物 |
| 测试 | Vitest 3.2.4，`environment: 'node'` | 只测纯逻辑 |
| 目标端 | mp-weixin（主）、h5（仅用于本地看 UI） | 其余 14 个平台包已裁剪 |

**版本锁定关系（改动前务必读）**

- `vite` 被 `@dcloudio/vite-plugin-uni` 的 peerDependency **精确锁定在 5.2.8**，不能升
- 因此 `vitest` 只能用 **3.2.4**。vitest ≥ 4 依赖 vite 6+ 才有的 `module-runner` 导出，装得上但一跑就报 `ERR_PACKAGE_PATH_NOT_EXPORTED`
- `.npmrc` 里的 `strict-peer-dependencies=false` 会掩盖这类冲突，升级依赖后务必实跑一次 `pnpm test`

## 供应链策略（pnpm trustPolicy）

`pnpm-workspace.yaml` 里的 `trustPolicy: no-downgrade` **不是手写的**，是 `@uni-helper/eslint-config` 的 `pnpm/yaml-enforce-settings` 规则强制写入的 —— 跑 `eslint --fix` 就会自动加回来，删掉没用。

它的判定逻辑（来自 pnpm 11.8 源码 `trustChecks.js`）：

- 信任证据分三级：`stagedPublish`(3) > `trustedPublisher`(2) > `provenance`(1)
- **只按发布日期比较，不看 semver**：只要该包任何一个**更早发布**的版本证据更强，当前版本就被判为 `TRUST_DOWNGRADE` 并拒绝安装
- 目标版本不是预发布版时，比较时会跳过所有预发布版本

这条规则对「主线用 CI 带 provenance 发布、维护分支手工发布」的包会**稳定误报**，因为老分支的发布日期反而更晚。

### 当前的两处豁免与一处锁版本

| 包 | 处理 | 原因 |
| --- | --- | --- |
| `semver` | `trustPolicyExclude` | `@babel/*` 工具链的传递依赖，锁在 6.3.1；触发源是早 3 天发布的 `semver@7.5.1`。跨大版本线误报 |
| `@vitejs/plugin-legacy` | `trustPolicyExclude` | `@dcloudio/vite-plugin-uni` **精确锁定** 5.3.2，我们改不了；触发源是 `4.0.4` |
| `@uni-helper/uni-types` | **精确锁 `1.1.0`，不要升** | 不是误报：`1.0.0`/`1.0.1`/`1.1.0` 都有 `trustedPublisher`，而 `1.3.0`（当前 latest）**没有任何信任证据**，同一条版本线上信任级别断崖式下降 |

**`@uni-helper/uni-types` 为什么锁死**：`1.1.0` → `1.3.0` 的信任降级是 pnpm 这条策略真正想捕捉的信号。最可能的解释是上游改了发布流程（换 CI、token 过期后手工发布），但从外部无法与「账号被接管后手工发布」区分开。已实测 `1.1.0` 可通过类型检查与双端构建，所以锁在这里。

要升级前先确认新版本恢复了 `trustedPublisher`：

```bash
curl -s https://registry.npmjs.org/@uni-helper%2Funi-types \
  | python3 -c "import json,sys; d=json.load(sys.stdin); v=d['dist-tags']['latest']; m=d['versions'][v]; print(v, m.get('_npmUser',{}).get('trustedPublisher'), bool(m.get('dist',{}).get('attestations')))"
```

**不要用 `trustPolicyIgnoreAfter` 或删 `trustPolicy` 来绕过全部检查** —— 那会把这类信号一起关掉。要放行就按包名精确加进 `trustPolicyExclude`，并在上表写清理由。

## 分层与依赖方向

依赖只能自上而下，不允许反向或跨层回指。

```
pages/            页面。只做编排：读 store、响应交互、跳转
  ↓
components/       展示组件。只接 props、发 emit，不直接读 store
  ↓
stores/           状态。业务规则在这里，是唯一可以调用 cloud/ 的层
  ↓
cloud/            云开发接入层。唯一与后端通信的出口
  ↓
utils/ types/     纯函数与类型。不依赖任何上层，也不碰 uni API（storage.ts 除外）
```

**几条不能破的规则**

- `components/` 不 import `stores/` —— 组件靠 props 拿数据，才能被单独测试和复用
- `utils/` 除 `storage.ts` 外不碰 `uni.*` —— 纯函数才能在 node 环境下直接单测
- 云函数调用一律经 `cloud/api.ts`，页面和组件不直接 `wx.cloud.callFunction`
- 埋点一律经 `utils/track.ts` + `constants/events.ts` 的常量，不写字面量事件名

## 目录

```
src/
  pages/          index（首页）/ done（结束页）/ about（关于与反馈）
  components/     NapCard 小憩卡 · TimerBar 计时控制条 · GreetingLine 问候行
                  PresenceDot 在线人数 · DisguiseLayer 伪装层
  stores/         timer · cards · greeting · presence · user
  cloud/          env（占位配置）· index（初始化与环境判定）· api（调用出口）
                  mock（无环境时的替身）· types（前后端契约）
  utils/          time · dedupe · presence · storage · track
  constants/      events（埋点事件常量与判别联合类型）
  types/          集合字段类型、状态枚举、业务常量
  styles/         tokens.scss（设计 token，颜色只能从这里取）
  assets/fallback/  greetings.json · cards.json（兜底内容，结构即集合契约）
cloud/functions/  getCards · getGreetings · heartbeat · getOnlineCount · track
scripts/          check-forbidden.mjs（违禁字样）· check-size.mjs（主包体积）
test/             纯逻辑单测
```

## 两个需要特别说明的设计

### 伪装层不是页面

PRD 页面清单把它列为 `pages/disguise`，但技术方案又写明「用 redirect 会丢状态，改为同页内切换」。以技术方案为准：它是 `components/DisguiseLayer.vue`，以 `v-show` 内嵌在首页，**不注册进 `pages.json`**。

用 `v-show` 而非 `v-if`：`v-if` 会销毁重建，卡片位置就丢了。计时由 store 持有，伪装层显示期间照常走。

### 计时不靠 interval 累加

剩余时间一律由 `Date.now() - startAt` 推导（`utils/time.ts`）。`setInterval` 只负责触发重算，不参与计算本身——它在后台会被挂起，累加法回前台会少扣时间。

## 构建与产物

| 命令 | 产物 |
| --- | --- |
| `pnpm dev:mp-weixin` | `dist/dev/mp-weixin` ← **微信开发者工具导入这个目录**，不是项目根 |
| `pnpm build:mp-weixin` | `dist/build/mp-weixin` |
| `pnpm dev:h5` / `build:h5` | `dist/dev/h5` / `dist/build/h5`，仅用于本地看 UI |

`src/uni.scss` 的内容会被注入每个组件的 `<style>`，注入后相对路径是相对**该组件**解析的。所以 tokens 通过 `vite.config.ts` 里为 scss 配置的 `includePaths`（指向 `src/`）引入，写成 `@import 'styles/tokens.scss'`，不能写相对路径。

## 体积基线

2026-09-20 脚手架完成时（50 个文件）：未压缩 100.4 KB，**gzip 后 42.7 KB**。PRD 限制 1.5 MB，预警线 1 MB。用 `pnpm check:size` 复量。

PRD 原先担心 uni-app runtime 会撑爆 1.5 MB，实测余量充足（`vendor.js` gzip 后仅 27.6 KB）。
