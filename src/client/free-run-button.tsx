/**
 * dsh-offpeak — 畅跑任务区（**内嵌在状态徽标面板最上方**，v3.1.6 起没有独立按钮）。
 *
 * 布局（用户定案，对齐原「畅跑任务管理」弹层）：
 * - **标题行**：`畅跑任务` + `按 <时区>`；
 * - **三个文本按钮**：`新建畅跑任务` / `暂停全部任务`（全暂停时变 `恢复全部任务`）/ `删除全部任务`；
 *   「新建」内联展开起止时间选择器（开始 / 结束，到小时）；
 * - **每行两个图标按钮**：`⏸ / ▶`（暂停 / 恢复该段）与 `×`（删除该段）。
 *
 * 打开/关闭由父层（状态徽标面板）控制：这里没有触发按钮、没有 open 状态、也不点外关闭。
 * 时间选择器的输入值按**配置时区**解释（主机侧解析），标题行标注该时区。
 *
 * 状态更新：5s 轮询 `/session-guard/state`（畅跑是低频交互，轮询足够且最简单）
 * + 本地定时器保证到点后状态及时刷新。全部 fail-open，绝不抛错。
 */
import { useCallback, useEffect, useState } from 'react'
import {
  EMPTY_FREE_RUN,
  ICON_ADD,
  ICON_DELETE,
  ICON_PAUSE,
  ICON_RESUME,
  allTasksPaused,
  canPause,
  canResume,
  pauseAllLabel,
  readFreeRun,
  rowDeleteTitle,
  rowPauseTitle,
  statusLabel,
  toolbarDisabled,
  type FreeRunView,
} from './free-run-button-text'
import { DateRangePicker } from './date-range-picker'
import { combineEnd, combineStart, seedRange } from './date-range'
import { formatInstantRange } from './tz'
import { injectClientCss } from './styles'

/** slot 运行时注入的会话级 props。 */
export interface FreeRunPanelProps {
  sessionId?: string
  /** 显示时区（只影响列表里时间的展示；'' → 用配置时区）。 */
  displayTz?: string
}

/** 兜底轮询间隔（畅跑是低频交互，5s 足够；到点切换另有本地定时器）。 */
const POLL_MS = 5_000

// 日期 + 小时的拼接与「按小时包含」语义见 date-range.ts 的 combineStart / combineEnd：
// 开始 = H:00，结束 = H:59（否则选「23 时」会变成 23:00，当天最后一小时选不进来）。

/** 拆出 `YYYY-MM-DD` 与 `HH`（供选择器回填）。 */
export function splitDateTime(value: string | null | undefined): { date: string; hour: string } {
  const s = typeof value === 'string' ? value : ''
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2})/.exec(s)
  if (m === null) return { date: '', hour: '' }
  return { date: m[1], hour: m[2] }
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))

/**
 * 畅跑任务区（**内嵌在状态徽标面板顶部**，不再有独立按钮）。
 *
 * 布局对齐原「畅跑任务管理」弹层：标题 + 时区 → 新建 / 暂停全部 / 删除全部 → 任务列表。
 * 打开由父层（状态徽标面板）控制，所以这里没有「打开/关闭」状态、没有触发按钮、也不点外关闭。
 */
export function FreeRunPanel({ sessionId, displayTz }: FreeRunPanelProps) {
  const [view, setView] = useState<FreeRunView>(EMPTY_FREE_RUN)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [fromDate, setFromDate] = useState('')
  const [fromHour, setFromHour] = useState('')
  const [toDate, setToDate] = useState('')
  const [toHour, setToHour] = useState('')

  /** 用「当前时刻」重新播种起止（开始 = 本小时整点，结束 = +2h）。 */
  const seedFromNow = useCallback((): void => {
    const s = seedRange(new Date())
    setFromDate(s.fromDate)
    setFromHour(s.fromHour)
    setToDate(s.toDate)
    setToHour(s.toHour)
  }, [])

  injectClientCss()

  const poll = useCallback(async (): Promise<void> => {
    if (sessionId === undefined || sessionId === '') return
    try {
      const res = await fetch(`/session-guard/state?session=${encodeURIComponent(sessionId)}`)
      const body = await res.json().catch(() => null)
      setView(readFreeRun(body))
    } catch {
      // fail-open：路由不存在 / 网络失败 → 保持上一次状态。
    }
  }, [sessionId])

  useEffect(() => {
    if (sessionId === undefined || sessionId === '') return
    let cancelled = false
    void poll()
    const timer = setInterval(() => {
      if (!cancelled) void poll()
    }, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [sessionId, poll])

  // 到点后要立刻刷新（按钮高亮 / 列表状态）：按剩余毫秒设一个本地定时器。
  useEffect(() => {
    const ms = view.msRemaining
    if (ms === null || !Number.isFinite(ms) || ms <= 0) return
    const timer = setTimeout(() => {
      void poll()
    }, ms + 500)
    return () => {
      clearTimeout(timer)
    }
  }, [view.msRemaining, poll])

  // 内嵌形态没有「打开面板」这一刻：挂载即按当前时刻播种新建表单。
  useEffect(() => {
    seedFromNow()
  }, [seedFromNow])

  const rpc = useCallback(
    async (action: string, payload: Record<string, unknown> = {}): Promise<boolean> => {
      if (sessionId === undefined || sessionId === '') return false
      setBusy(true)
      setError('')
      try {
        const res = await fetch('/session-guard/rpc', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId, action, ...payload }),
        })
        const body = await res.json().catch(() => null)
        if (body?.ok === true) {
          setView(readFreeRun({ ok: true, freeRun: body.result }))
          return true
        }
        setError(typeof body?.error === 'string' ? body.error : '操作失败')
        return false
      } catch {
        setError('操作失败（网络或路由不可用）')
        return false
      } finally {
        setBusy(false)
      }
    },
    [sessionId],
  )

  if (sessionId === undefined || sessionId === '') return null
  // 插件整体关掉且没有任何任务时不给按钮；已有任务则保留，便于清理。
  if (!view.available && view.windows.length === 0) return null

  const onAdd = async (): Promise<void> => {
    if (fromDate === '' || fromHour === '' || toDate === '' || toHour === '') {
      setError('请选择开始与结束时间')
      return
    }
    const ok = await rpc('freeRunAdd', {
      from: combineStart(fromDate, fromHour),
      to: combineEnd(toDate, toHour),
    })
    if (ok) {
      setError('')
      setCreating(false)
    }
  }

  const nothingToAct = toolbarDisabled(view)
  const allPaused = allTasksPaused(view)

  return (
    <div className="sg-fr-section" role="group" aria-label="畅跑任务">
      <div className="sg-fr-head">
        <span className="sg-fr-title">畅跑任务</span>
        <span className="sg-fr-tz">按 {view.timezone === '' ? '本地时区' : view.timezone}</span>
      </div>

      {/* 顶部三个按钮：新建 / 暂停全部 / 删除全部（窄宽度下只显示图标，见 styles.ts 容器查询） */}
      <div className="sg-fr-bar">
        <button
          type="button"
          className={`sg-fr-bar-btn ${creating ? 'sg-fr-bar-on' : ''}`}
          disabled={busy}
          aria-pressed={creating}
          title="新建畅跑任务"
          onClick={() => {
            setCreating((prev) => !prev)
            setError('')
          }}
        >
          <span className="sg-btn-icon" aria-hidden="true">
            {ICON_ADD}
          </span>
          <span className="sg-btn-label">新建畅跑任务</span>
        </button>
        <button
          type="button"
          className="sg-fr-bar-btn"
          disabled={busy || nothingToAct}
          title={pauseAllLabel(view)}
          onClick={() => {
            void rpc(allPaused ? 'freeRunResumeAll' : 'freeRunPauseAll')
          }}
        >
          <span className="sg-btn-icon" aria-hidden="true">
            {allPaused ? ICON_RESUME : ICON_PAUSE}
          </span>
          <span className="sg-btn-label">{pauseAllLabel(view)}</span>
        </button>
        <button
          type="button"
          className="sg-fr-bar-btn sg-fr-bar-danger"
          disabled={busy || view.windows.length === 0}
          title="删除全部任务"
          onClick={() => {
            void rpc('freeRunClear')
          }}
        >
          <span className="sg-btn-icon" aria-hidden="true">
            {ICON_DELETE}
          </span>
          <span className="sg-btn-label">删除全部任务</span>
        </button>
      </div>

          {creating && (
            <div className="sg-fr-form">
              {/* 日期范围：双月日历（对齐 DSH 排期面板的样式）。
                  小时仍用下拉，保持「到小时」的精度。 */}
              <DateRangePicker
                from={fromDate}
                to={toDate}
                disabled={busy}
                onChange={(f, t) => {
                  setFromDate(f)
                  setToDate(t)
                  setError('')
                }}
              />
              <div className="sg-fr-hours">
                <label className="sg-fr-hour">
                  <span>开始</span>
                  <select
                    value={fromHour}
                    disabled={busy}
                    onChange={(e) => {
                      setFromHour(e.target.value)
                    }}
                  >
                    <option value="">时</option>
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <span className="sg-fr-unit">时</span>
                </label>
                <label className="sg-fr-hour">
                  <span>结束</span>
                  <select
                    value={toHour}
                    disabled={busy}
                    onChange={(e) => {
                      setToHour(e.target.value)
                    }}
                  >
                    <option value="">时</option>
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <span className="sg-fr-unit">时</span>
                </label>
                <button type="button" className="sg-fr-now" disabled={busy} title="重置为当前时刻" onClick={seedFromNow}>
                  现在
                </button>
              </div>
              <div className="sg-fr-form-actions">
                <button type="button" className="sg-fr-add" disabled={busy} onClick={() => void onAdd()}>
                  确定
                </button>
                <button
                  type="button"
                  className="sg-fr-cancel"
                  disabled={busy}
                  onClick={() => {
                    setCreating(false)
                    setError('')
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {view.windows.length === 0 ? (
            <div className="sg-fr-empty">还没有畅跑任务，点「新建畅跑任务」添加</div>
          ) : (
            <ul className="sg-fr-list">
              {view.windows.map((w) => (
                <li key={w.id} className="sg-fr-item">
                  <span className="sg-fr-range">
                    {formatInstantRange(w.from, w.to, displayTz === undefined || displayTz === '' ? view.timezone : displayTz) ||
                      `${w.fromDisplay} – ${w.toDisplay}`}
                  </span>
                  <span className={`sg-fr-tag sg-fr-tag-${w.status}`}>{statusLabel(w.status)}</span>
                  <button
                    type="button"
                    className="sg-fr-icon"
                    title={rowPauseTitle(w)}
                    aria-label={w.paused === true ? '恢复' : '暂停'}
                    disabled={busy || (!canPause(w) && !canResume(w))}
                    onClick={() => {
                      void rpc(w.paused === true ? 'freeRunResume' : 'freeRunPause', { id: w.id })
                    }}
                  >
                    {w.paused === true ? ICON_RESUME : ICON_PAUSE}
                  </button>
                  <button
                    type="button"
                    className="sg-fr-icon sg-fr-icon-danger"
                    title={rowDeleteTitle()}
                    aria-label="删除"
                    disabled={busy}
                    onClick={() => {
                      void rpc('freeRunRemove', { id: w.id })
                    }}
                  >
                    {ICON_DELETE}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error !== '' && <div className="sg-fr-error">{error}</div>}
    </div>
  )
}
