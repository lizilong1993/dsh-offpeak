<p align="center">
  <img src="./assets/dsh-offpeak-hero.png" alt="dsh-offpeak — 该停的停，该跑的跑 / Selective Control. Continuous Workflow." width="100%">
</p>

<p align="center">
  <a href="README.en.md">English</a> · <strong>中文</strong>
</p>

<p align="center">
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-263146?style=flat-square"></a>
  <img alt="dsh-plugin" src="https://img.shields.io/badge/dsh--plugin-ready-478CBF?logo=deepseek&logoColor=white">
  <img alt="Public beta" src="https://img.shields.io/badge/status-public%20beta-7da1de?style=flat-square">
</p>

# dsh-offpeak

一个 DSH（DeepSeek Harness）宿主插件：用来自动管理高峰期的会话与请求 —— 在高峰请求真正发出**之前**拉门、只拦**目标为官方源或显式列出的模型**的请求、其余照常跑，并支持给单个会话排一段时间「畅跑」豁免。

插件 id `dsh-offpeak`，设置命名空间 `offpeak`，配置文件 `config/offpeak.json`。

## 能力一览

| 能力 | 行为 |
|---|---|
| 可配置峰谷策略 | 峰窗口、时区、每窗口的星期与周末规则全部来自 `config/offpeak.json`（env → `$DSH_HOME/config` → `<cwd>/config` → 包内默认）。配置文件写坏**绝不静默让守卫失效**：错误被收集并暴露（`/session-guard/settings` 与 `/diag` 的 `configFile.errors`），对应键保留默认值。 |
| 回合门控 | 入峰时对 running 会话走回合级暂停（当前轮跑完再拦），退峰自动放行；自动放行**不碰**手动 `/pause`。 |
| 请求级守卫 | `agent/request` **每个请求都过**，所以入峰后才启动的会话、会话中途切到官方源的情况都能兜住。`hold`（默认）静默挂起，`error` 抛可识别的 `PEAK_DEFERRED`。 |
| 目标判定 | 优先级：显式 `officialProviders` → **模型名（精确匹配、大小写不敏感）** → 实时 `baseURL` → catalog 默认端点 → 内置 id（`deepseek-official`）→ unknown。只有判为官方才拦。 |
| 高峰拦截列表 | 在徽标面板里勾选模型（或直接写 `officialModelPatterns`）：条目是**模型名精确匹配** —— 勾了 `ocg/deepseek-flash` 就只拦这一个模型，无论它跑在哪条路由上；**不勾不拦**。面板顶部有关键词过滤、全选/取消全选、刷新与热重载，每个已拦截项都带 `×` 撤销。 |
| 畅跑 | 给单个会话排一段或多段绝对时间窗口，窗口内该会话在**入峰、请求挂起**两处都豁免；支持逐段暂停/恢复、合并上限 8 条、持久化。面板里与拦截列表同处一个展开区（最上方）。 |
| 高峰谷时可编辑 | 面板最底部「当前高峰谷时」：按配置预填每段 `开始 – 结束`（可增删行）+「周末默认谷时」复选框，保存即写入 `config/offpeak.json` 并立即生效（其它键与每行的星期限制原样保留）。 |
| 显示时区 | 可另选任一 IANA 时区（默认策略时区）：畅跑时间、峰谷时段与 hover 卡片按它换算展示；**配置文件里的时间值不动**。 |
| 徽标 | 输入区一个可点徽标：`高峰` / `高峰 · 拦截中` / `高峰 · 畅跑中` / `谷时` / `周末`；拦截态红、放行态绿。 |
| 自动重试 | 可选的后端重试（默认关），且永远给门控让路。 |

## 兼容性

| 项目 | 说明 |
|---|---|
| DSH 宿主版本 | `package.json` 的 `engines.dsh` = `>=0.1.5-rc.2 <0.1.6-0 \|\| >=0.1.7-rc.1 <0.1.8-0 \|\| >=0.2.0-rc.1 <0.2.1-0`（三段）。**实际验证只在 0.1.7 线做过**（本插件的开发与实测环境）；另两段按接口形态适配、尚未逐一实测 —— 装之前请先看下 `dsh --profile <你的 profile> --dump-config` 能否正常组装。 |
| 设置与写入口 | 0.1.7 线的客户端**没有 `settingsScope`**，所以本插件的浏览器半只注入 `slots + locale`：设置表单由宿主按导出的 `Config` schema 自动生成；拦截列表的写入口是 `POST /session-guard/rpc {action:'setModelPatterns'}`，写 `config/offpeak.json` 后立即 `reloadConfig`。宿主提供 `settingsScope` 时才渲染自定义设置卡片。 |
| Node | `engines.node >= 20`（仓库自带 `node --test` 测试为 Node 22+ 写法：直接 import `.ts` 类型擦除）。 |
| bootstrap 依赖 | `@deepseek-ai/schemastery ^3.18.4` 为运行时依赖；`@deepseek-ai/cordis ^4.0.1` 与 `@deepseek-ai/dsh-client-*` 声明为**可选 peerDependencies**（不装不报错）。 |
| 稳定接口（跨版本不变） | `/session-guard/*` 路由前缀与 `sessionGuard` 进程内服务端口是**保留名**（与既有工具/笔记兼容）：换插件名不会改它们。 |
| 与 input-traffic 的关系 | 该插件的「最小桥」全局名优先读 `window.__DSH_OFFPEAK_BRIDGE__`，同时兼容它历史上写的 `window.__DSH_SESSION_GUARD_BRIDGE__`；没有它时本插件自带回退冻结/徽标，两者不互相取代。 |
| 已知限制 | 不识别法定节假日；畅跑按配置时区解释墙钟；高峰拦截列表是**精确模型名**匹配（不做关键字/正则的批量覆盖）。 |

## 安装

三条通道任选：npm 包 / GitHub 仓库 / 本地目录或 Release 里的 tgz。

```bash
# ① npm（推荐）
dsh plugin --profile desktop add dsh-offpeak

# ② GitHub（首次需在 profile 的 pnpm-workspace.yaml 里给 allowBuilds 放行该包的 prepare 构建）
dsh plugin --profile desktop add github:lizilong1993/dsh-offpeak

# ③ 本地目录 / Release 资产（零权限）
dsh plugin --profile desktop add ./dsh-offpeak
dsh plugin --profile desktop add ./dsh-offpeak-<version>.tgz

dsh --profile desktop --dump-config     # 验证补丁分层
```

从源码构建（开发用）：

```bash
git clone https://github.com/lizilong1993/dsh-offpeak.git
cd dsh-offpeak
npm install          # 或 pnpm install
npm run build        # 重新构建 lib/client.js（浏览器半）
```

也可以手工在 profile 里指向这个检出 —— `~/.dsh/profiles/<profile>/package.json`：

```json
{ "dependencies": { "dsh-offpeak": "link:/path/to/dsh-offpeak" } }
```

并把 `dsh-offpeak` 加进同一文件的 `dsh.profile.bundles`；然后重启 DSH（host 代码在 boot 时加载）并刷新页面。

## 配置

`config/offpeak.json`（默认层；设置表单里的值优先），常用键：

```jsonc
{
  "timezone": "Asia/Shanghai",
  "peakPolicy": { "peakWindows": [{ "name": "morning", "start": "09:00", "end": "12:00", "days": ["mon","tue","wed","thu","fri"] }] },
  "weekendPolicy": { "enabled": true, "days": ["sat","sun"], "mode": "offPeak" },
  "providerGuard": true,
  "officialProviders": [],            // 追加官方 provider id（精确匹配，最高优先级）
  "officialModelPatterns": [],        // 高峰拦截的模型名（精确匹配、大小写不敏感）
  "officialBaseURLs": ["api.deepseek.com"],
  "deferredMode": "hold",             // 'hold' | 'error'
  "deferredResume": true
}
```

可用 `DSH_OFFPEAK_CONFIG` 显式指定配置文件；状态目录默认 `.dsh/offpeak`（`DSH_OFFPEAK_STATE_DIR` 可覆盖）。

## HTTP / 服务面

`GET /session-guard/status` · `/state?session=` · `/settings` · `/provider?provider=&model=` · `/models` · `/diag` · `POST /session-guard/rpc`（`stopNextTurn|resume|lockQueue|unlockQueue|state|reloadConfig|setModelPatterns|setPeakPolicy|freeRunAdd|…`），以及进程内的 `sessionGuard` 服务端口（`GET /events` 的 SSE 流随 step 门控一并移除，v3.3.0）。

## 测试

`npm test`（node:test）· `npm run lint` · `npm run build`。

## 致谢

- [drscrewdriver/dsh-session-guard](https://github.com/drscrewdriver/dsh-session-guard)

## 许可

MIT —— 见 [LICENSE](./LICENSE)。
