/**
 * dsh-offpeak — 状态徽标（**徽标即按钮**，fail-open）。
 *
 * 轮询 host 的 `/session-guard/status`（阶段 + 配置事实）与 `/session-guard/state`
 * （本会话畅跑任务），显示四态文案：
 *   - 高峰 + 有畅跑任务 → `高峰 · 畅跑中`；
 *   - 高峰 + 有拦截任务 → `高峰 · 拦截中`；
 *   - 高峰 + 都没任务 → `高峰`；
 *   - 非高峰 → `谷时` / `周末`。
 *
 * hover 提示是**自绘卡片**（`BadgeTipCard`：原生 tooltip 无法做「【】固定宽度 + 滚动」），
 * 文案由用户配置生成；无障碍文本走按钮的 `aria-label`。
 *
 * 点开面板 = 畅跑任务区（最上方）+ 高峰拦截列表 + 当前高峰谷时（最底部）。
 * 显示时区只影响展示（畅跑列表、峰谷时间、hover 卡片共用），配置文件里的时间值不动。
 */
import { useEffect, useRef, useState } from 'react'
import { badgeClassNames, badgeTip, peakLabel, tipText, type BadgeTip, type Status, type TipTimes } from './badge-text'
import { BadgeTipCard } from './badge-tip'
import { FreeRunPanel } from './free-run-button'
import { EMPTY_FREE_RUN, readFreeRun, type FreeRunView } from './free-run-button-text'
import { ModelListPanel } from './model-panel'
import { PeakPolicyPanel } from './peak-policy-panel'
import { formatInstant, formatWindow, formatWindows, readDisplayTz } from './tz'
import { injectClientCss } from './styles'

/** slot 运行时注入的会话级 props（sessionId 由 dsh 的 SessionStandardProps 提供）。 */
export interface StatusBadgeProps {
  sessionId?: string
}

const POLL_MS = 15_000

/** 卡片时间文本：当前窗口 / 全部时段摘要 / 下一段高峰（都按显示时区换算）。 */
function tipTimesOf(status: Status, displayTz: string): TipTimes {
  const policyTz = status.timezone
  const windows = Array.isArray(status.peakWindows) ? status.peakWindows : []
  const current =
    windows.find((w) => w.name !== undefined && w.name === status.windowName) ??
    (status.phase === 'peak' ? windows[0] : undefined)
  const nextPeakAt = typeof status.nextPeakAt === 'string' && status.nextPeakAt !== '' ? status.nextPeakAt : ''
  return {
    currentWindow: current === undefined ? null : formatWindow(current.start, current.end, policyTz, displayTz),
    peakSummary: curateSummary(formatWindows(windows, policyTz, displayTz)),
    nextPeak: nextPeakAt === '' ? null : formatInstant(nextPeakAt, displayTz),
  }
}

function curateSummary(text: string): string | null {
  return text === '' ? null : text
}

/** 状态徽标：轮询全局阶段，显示 高峰/谷时/周末（enabled 关闭或请求失败时静默隐藏）。 */
export function StatusBadge({ sessionId }: StatusBadgeProps) {
  const [status, setStatus] = useState<Status | null>(null)
  const [freeRun, setFreeRun] = useState<FreeRunView>(EMPTY_FREE_RUN)
  const [open, setOpen] = useState(false)
  const [displayTz, setDisplayTz] = useState<string>(() => readDisplayTz())
  const rootRef = useRef<HTMLDivElement | null>(null)

  injectClientCss()

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    const poll = async () => {
      try {
        const res = await fetch('/session-guard/status')
        const body = await res.json().catch(() => null)
        if (!cancelled && body?.ok && body.status) setStatus(body.status)
      } catch {
        // fail-open：路由/网络不可达 → 静默，徽标隐藏。
      }
      try {
        const res = await fetch(`/session-guard/state?session=${encodeURIComponent(sessionId)}`)
        const body = await res.json().catch(() => null)
        if (!cancelled && body !== null) setFreeRun(readFreeRun(body))
      } catch {
        // fail-open：畅跑状态取不到 → 保持上一次。
      }
    }
    void poll()
    const timer = setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [sessionId])

  // 点击面板之外的区域 → 自动收回（与再次点击徽标收起的效果一致）。
  useEffect(() => {
    if (!open) return
    const onPointerDown = (ev: MouseEvent) => {
      const root = rootRef.current
      const target = ev.target
      if (root === null || !(target instanceof Node)) return
      if (!root.contains(target)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  if (!status || !status.enabled) return null

  const tasks = {
    intercepting: (status.modelPatterns ?? 0) > 0,
    freeRun: freeRun.windows.length > 0,
  }
  // 显示时区：用户选过就用它，否则跟随策略时区（只影响展示）。
  const effectiveTz = displayTz !== '' ? displayTz : status.timezone
  const tip: BadgeTip = badgeTip(status, tipTimesOf(status, effectiveTz))

  return (
    <div className="sg-status-root" ref={rootRef}>
      <button
        type="button"
        className={badgeClassNames(status)}
        aria-label={tipText(tip)}
        aria-expanded={open}
        data-sg-phase={status.phase}
        data-sg-provider-guard={status.providerGuard === true ? 'on' : 'off'}
        onClick={() => setOpen(!open)}
      >
        {peakLabel(status, tasks)}
      </button>
      {/* hover 卡片只在面板收起时展示（面板打开后信息已在面板里，避免互相遮挡） */}
      {!open && <BadgeTipCard tip={tip} />}
      {open && (
        <div className="sg-status-panel" role="dialog" aria-label="高峰面板">
          {/* 畅跑任务区在最上方（v3.1.6：独立的「畅跑」按钮已去掉，UI 内嵌到这里） */}
          <FreeRunPanel sessionId={sessionId} displayTz={effectiveTz} />
          <div className="sgMlHead">
            <span className="sg-fr-title">高峰拦截列表（按模型名）</span>
            <button type="button" className="sg-fr-closeicon" onClick={() => setOpen(false)} aria-label="关闭" title="关闭面板">
              ×
            </button>
          </div>
          <ModelListPanel />
          {/* 最底部：高峰谷时配置（时区选择也在这里，只影响展示） */}
          <PeakPolicyPanel displayTz={effectiveTz} onDisplayTzChange={setDisplayTz} />
        </div>
      )}
    </div>
  )
}
