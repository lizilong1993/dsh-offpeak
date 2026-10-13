<p align="center">
  <img src="./assets/dsh-offpeak-hero.png" alt="dsh-offpeak — Selective Control. Continuous Workflow." width="100%">
</p>

# dsh-offpeak

A DSH (DeepSeek Harness) host plugin that keeps peak-hour usage under control: it closes the session gate before a peak-hour request goes out, holds only the requests whose **target is official or explicitly listed**, lets everything else run, and gives a single session a time-boxed "free run" exemption.

Plugin id `dsh-offpeak`, settings namespace `offpeak`, config file `config/offpeak.json`.

## What it does

| Capability | Behaviour |
|---|---|
| Configurable peak policy | Peak windows, timezone, per-window weekdays and the weekend rule come from `config/offpeak.json` (env → `$DSH_HOME/config` → `<cwd>/config` → bundled default). A malformed file never silently disables the guard: errors are collected and reported (`configFile.errors` on `/session-guard/settings` and `/diag`), affected keys keep their defaults. |
| Turn / step gating | On peak entry, running sessions are paused (or gated at the next `agent/pre-step` when `stepLevelPause` is on) and released automatically off peak. Manual `/pause` is never touched by the automatic release. |
| Request-level guard | `agent/request` is checked on **every** request, so sessions started after peak entry — or switched to an official route mid-session — are still caught. `deferredMode: 'hold'` (default) holds the request silently; `'error'` raises a recognisable `PEAK_DEFERRED`. |
| Target verdict | Priority: explicit `officialProviders` list → **model name (exact match, case-insensitive)** → live `baseURL` host → catalog default endpoint → built-in id (`deepseek-official`) → unknown. A request is held only when the verdict is `official`. |
| Peak interception list | Tick models in the badge panel (or write `officialModelPatterns`): an entry is a **model name matched exactly**, so ticking `ocg/deepseek-flash` intercepts exactly that model, whatever route serves it — and nothing is intercepted until you tick something. The panel has a keyword filter, select-all / clear-select-all, refresh, hot reload, and a `×` undo on every intercepted entry. |
| Free-run | Schedule one or more absolute time windows for one session; inside them the session is exempt everywhere (peak entry, step gate, request hold). Per-segment pause/resume, merged up to 8 windows, persisted — shown at the top of the same panel as the interception list. |
| Badge | One clickable badge in the composer: `高峰` / `高峰 · 拦截中` / `高峰 · 畅跑中` / `谷时` / `周末`; red while blocking, green while allowing. |
| Retry | Optional backend retry for transient turn failures (off by default); it always yields to the gates. |

## Install (from source)

```bash
git clone https://github.com/lizilong1993/dsh-offpeak.git
cd dsh-offpeak
npm install          # or pnpm install
npm run build        # rebuild lib/client.js (the browser half)
```

The recommended way is the plugin manager, which also reconciles the pnpm dependency and `dsh.profile.bundles` for you:

```bash
dsh plugin --profile desktop add ./dsh-offpeak
dsh --profile desktop --dump-config     # verify the composed patch layers
```

Or point a profile at this checkout by hand — `~/.dsh/profiles/<profile>/package.json`:

```json
{ "dependencies": { "dsh-offpeak": "link:/path/to/dsh-offpeak" } }
```

and add `dsh-offpeak` to that file's `dsh.profile.bundles`. Then restart DSH (host code is loaded at boot) and refresh the page.

## Configuration

`config/offpeak.json` (default layer; form values win) — keys used most:

```jsonc
{
  "timezone": "Asia/Shanghai",
  "peakPolicy": { "peakWindows": [{ "name": "morning", "start": "09:00", "end": "12:00", "days": ["mon","tue","wed","thu","fri"] }] },
  "weekendPolicy": { "enabled": true, "days": ["sat","sun"], "mode": "offPeak" },
  "providerGuard": true,
  "officialProviders": [],            // extra provider ids, exact match, highest priority
  "officialModelPatterns": [],        // intercepted model names (exact, case-insensitive)
  "officialBaseURLs": ["api.deepseek.com"],
  "deferredMode": "hold",             // 'hold' | 'error'
  "deferredResume": true,
  "stepLevelPause": true
}
```

`DSH_OFFPEAK_CONFIG` picks an explicit config file; the state root defaults to `.dsh/offpeak` (`DSH_OFFPEAK_STATE_DIR` overrides it).

## HTTP / service surface

`GET /session-guard/status` · `/state?session=` · `/settings` · `/provider?provider=&model=` · `/models` · `/diag` · `/events` (SSE) · `POST /session-guard/rpc` (`stopNextTurn|resume|lockQueue|unlockQueue|stepPause|stepResume|state|reloadConfig|setModelPatterns|freeRunAdd|…`), plus the in-process `sessionGuard` service port.

## Tests

`npm test` (node:test) · `npm run lint` · `npm run build`.

## Acknowledgements

- [drscrewdriver/dsh-session-guard](https://github.com/drscrewdriver/dsh-session-guard)

## Licence

MIT — see [LICENSE](./LICENSE).
