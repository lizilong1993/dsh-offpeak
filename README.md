# dsh-offpeak

> Formerly **dsh-session-guard** (the repository was renamed/moved here). Plugin id: `dsh-offpeak`, settings namespace: `offpeak`, config file: `config/offpeak.json` (the old `session-guard.json` is still read as a fallback).
>
> 原 **dsh-session-guard**（仓库已迁移到这里并更名）。插件 id `dsh-offpeak`、设置命名空间 `offpeak`、配置文件 `config/offpeak.json`（旧名 `session-guard.json` 仍会作为回退被读取）。

A DSH (DeepSeek Harness) host plugin that keeps peak-hour usage under control: it closes the session gate before a peak-hour request goes out, holds only the requests whose **target is official / explicitly listed**, lets everything else run, and gives a single session a time-boxed "free run" exemption.

一个 DSH 宿主插件，用来自动管理高峰期的会话与请求：在高峰请求真正发出**之前**拉门、只拦**目标为官方源或显式列出的模型**的请求、其余照常跑，并支持给单个会话排一段时间「畅跑」豁免。

---

## English

### What it does

| Capability | Behaviour |
|---|---|
| Configurable peak policy | Peak windows, timezone, per-window weekdays and the weekend rule come from `config/offpeak.json` (env → `$DSH_HOME/config` → `<cwd>/config` → bundled default). A malformed file never silently disables the guard: errors are collected and reported (`configFile.errors` on `/session-guard/settings` and `/diag`), affected keys keep their defaults. |
| Turn / step gating | On peak entry, running sessions are paused (or gated at the next `agent/pre-step` when `stepLevelPause` is on) and released automatically off peak. Manual `/pause` is never touched by the automatic release. |
| Request-level guard | `agent/request` is checked on **every** request, so sessions started after peak entry — or switched to an official route mid-session — are still caught. `deferredMode: 'hold'` (default) holds the request silently; `'error'` raises a recognisable `PEAK_DEFERRED`. |
| Target verdict | Priority: explicit `officialProviders` list → **model name (exact match, case-insensitive)** → live `baseURL` host → catalog default endpoint → built-in id (`deepseek-official`) → unknown. A request is held only when the verdict is `official`. |
| Peak interception list | Tick models in the badge panel (or write `officialModelPatterns`): an interception entry is a **model name matched exactly**, so ticking `ocg/deepseek-flash` intercepts exactly that model — whatever route serves it. Nothing is intercepted until you tick something. |
| Free-run (畅跑) | Schedule one or more absolute time windows for one session; inside them the session is exempt everywhere (peak entry, step gate, request hold). Per-segment pause/resume, merged up to 8 windows, persisted. |
| Badge | One clickable badge in the composer: `高峰` / `高峰 · 拦截中` / `高峰 · 畅跑中` / `谷时` / `周末`; red while blocking, green while allowing. The panel contains the free-run tasks and the interception list. |
| Retry | Optional backend retry for transient turn failures (off by default); it always yields to the gates. |

### Install (from source)

```bash
git clone https://github.com/lizilong1993/dsh-offpeak.git
cd dsh-offpeak
npm install          # or pnpm install
npm run build        # rebuild lib/client.js (the browser half)
```

Then point a DSH profile at this checkout — in `~/.dsh/profiles/<profile>/package.json`:

```json
{ "dependencies": { "dsh-offpeak": "link:/absolute/path/to/dsh-offpeak" } }
```

and add the entry to that profile's `cordis.patch.yml`:

```yaml
- insert:
    - id: offpeak
      name: dsh-offpeak
```

Restart DSH (host code is loaded at boot) and refresh the page.

### Configuration

`config/offpeak.json` (default layer; form values win) — keys used most:

```jsonc
{
  "timezone": "Asia/Shanghai",
  "peakPolicy": { "peakWindows": [{ "name": "morning", "start": "09:00", "end": "12:00", "days": ["mon","tue","wed","thu","fri"] }] },
  "weekendPolicy": { "enabled": true, "days": ["sat","sun"], "mode": "offPeak" },
  "providerGuard": true,
  "officialProviders": [],            // extra provider ids, exact match, highest priority
  "officialModelPatterns": [],        // intercepted model names (exact match, case-insensitive)
  "officialBaseURLs": ["api.deepseek.com"],
  "deferredMode": "hold",             // 'hold' | 'error'
  "deferredResume": true,
  "stepLevelPause": true
}
```

### HTTP surface (unchanged paths)

`GET /session-guard/status` · `/state?session=` · `/settings` · `/provider?provider=&model=` · `/models` · `/diag` · `/events` (SSE) · `POST /session-guard/rpc` (`stopNextTurn|resume|lockQueue|unlockQueue|stepPause|stepResume|state|reloadConfig|setModelPatterns|freeRunAdd|…`), plus the in-process `sessionGuard` service port.

> The `/session-guard/*` route prefix and the `sessionGuard` service name are kept on purpose: `dsh-input-traffic` (the freeze button) integrates against them.

### Tests

`npm test` (node:test, 485 cases) · `npm run lint` · `npm run build`.

### Acknowledgements

This plugin is a continuation of **[drscrewdriver/dsh-session-guard](https://github.com/drscrewdriver/dsh-session-guard)** — the configurable peak policy, the free-run feature, the request-level guard and the deferral queue all originate there. Thanks to its author for the design and the upstream work this project is built on.

Repositories that came before: [drscrewdriver/dsh-session-guard](https://github.com/drscrewdriver/dsh-session-guard) (upstream) and its fork `lizilong1993/dsh-session-guard` (kept for history; no longer maintained — new work happens in this repository only).

### Licence

MIT — see [LICENSE](./LICENSE).

---

## 中文

### 做了什么

| 能力 | 行为 |
|---|---|
| 可配置峰谷策略 | 峰窗口、时区、每窗口的星期与周末规则全部来自 `config/offpeak.json`（env → `$DSH_HOME/config` → `<cwd>/config` → 包内默认）。配置文件写坏**绝不静默让守卫失效**：错误被收集并暴露（`/session-guard/settings` 与 `/diag` 的 `configFile.errors`），对应键保留默认值。 |
| 回合 / step 门控 | 入峰时暂停 running 会话（`stepLevelPause` 开启则在下一个 `agent/pre-step` 拉门），退峰自动放行；自动放行**不碰**手动 `/pause`。 |
| 请求级守卫 | `agent/request` **每个请求都过**，所以入峰后才启动的会话、会话中途切到官方源的情况都能兜住。`hold`（默认）静默挂起，`error` 抛可识别的 `PEAK_DEFERRED`。 |
| 目标判定 | 优先级：显式 `officialProviders` → **模型名（精确匹配、大小写不敏感）** → 实时 `baseURL` → catalog 默认端点 → 内置 id（`deepseek-official`）→ unknown。只有判为官方才拦。 |
| 高峰拦截列表 | 在徽标面板里勾选模型（或直接写 `officialModelPatterns`）：条目是**模型名精确匹配** —— 勾了 `ocg/deepseek-flash` 就只拦这一个模型，无论它跑在哪条路由上；**不勾不拦**。 |
| 畅跑 | 给单个会话排一段或多段绝对时间窗口，窗口内该会话在**入峰、step 门、请求挂起**三处都豁免；支持逐段暂停/恢复、合并上限 8 条、持久化。 |
| 徽标 | 输入区一个可点徽标：`高峰` / `高峰 · 拦截中` / `高峰 · 畅跑中` / `谷时` / `周末`；拦截态红、放行态绿。面板里是畅跑任务 + 拦截列表。 |
| 自动重试 | 可选的后端重试（默认关），且永远给门控让路。 |

### 安装（源码方式）

```bash
git clone https://github.com/lizilong1993/dsh-offpeak.git
cd dsh-offpeak
npm install          # 或 pnpm install
npm run build        # 重新构建 lib/client.js（浏览器半）
```

在 DSH profile 的 `~/.dsh/profiles/<profile>/package.json` 里指向这个检出：

```json
{ "dependencies": { "dsh-offpeak": "link:/path/to/dsh-offpeak" } }
```

并在该 profile 的 `cordis.patch.yml` 里加：

```yaml
- insert:
    - id: offpeak
      name: dsh-offpeak
```

重启 DSH（host 代码在 boot 时加载）后刷新页面。

### 配置

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
  "deferredResume": true,
  "stepLevelPause": true
}
```

### HTTP 接口（路径保持不变）

`GET /session-guard/status` · `/state?session=` · `/settings` · `/provider?provider=&model=` · `/models` · `/diag` · `/events`（SSE）· `POST /session-guard/rpc`（`stopNextTurn|resume|lockQueue|unlockQueue|stepPause|stepResume|state|reloadConfig|setModelPatterns|freeRunAdd|…`），以及进程内的 `sessionGuard` 服务端口。

> `/session-guard/*` 前缀与 `sessionGuard` 服务名**故意保留**：`dsh-input-traffic`（冻结按钮）依赖它们。

### 测试

`npm test`（node:test，485 例）· `npm run lint` · `npm run build`。

### 致谢

本插件是 **[drscrewdriver/dsh-session-guard](https://github.com/drscrewdriver/dsh-session-guard)** 的延续：可配置峰谷策略、畅跑、请求级守卫与延后队列都源自那里。感谢上游作者的设计与工作。

历史仓库：[drscrewdriver/dsh-session-guard](https://github.com/drscrewdriver/dsh-session-guard)（上游）与其 fork `lizilong1993/dsh-session-guard`（保留历史，不再维护 —— 后续开发只在**本仓库**进行）。

### 许可

MIT —— 见 [LICENSE](./LICENSE)。
