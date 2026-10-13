/**
 * dsh-offpeak — 状态徽标（**徽标即按钮**，fail-open）。
 *
 * 轮询 host 的 `/session-guard/status`（全局阶段 + 拦截列表规模）与
 * `/session-guard/state`（本会话畅跑任务），显示四态文案（v3.1.6）：
 *   - 高峰 + 有畅跑任务 → `高峰 · 畅跑中`；
 *   - 高峰 + 有拦截任务 → `高峰 · 拦截中`；
 *   - 高峰 + 都没任务 → `高峰`；
 *   - 非高峰 → `谷时` / `周末`。
 *
 * 点开面板 = **畅跑任务区（最上方）+ 高峰拦截列表**（布局按用户定案）；**每个阶段都是同一个
 * 按钮**（类名见 `badgeClassNames`），只有文案与配色变，不因不是高峰就退化成展示元素。
 * 本线（0.1.7）客户端没有 settingsScope，拦截列表的写入口是 `setModelPatterns`（写配置文件）。
 * 不做任何队列/会话动作；冻结按钮由 input-traffic 经桥接管（D6/D8）。
 */
import { useEffect, useState } from 'react'
import { badgeClassNames, badgeTitle, peakLabel, type Status } from './badge-text'
import { FreeRunPanel } from './free-run-button'
import { EMPTY_FREE_RUN, readFreeRun, type FreeRunView } from './free-run-button-text'
import { ModelListPanel } from './model-panel'
import { injectClientCss } from './styles'

/** slot 运行时注入的会话级 props（sessionId 由 dsh 的 SessionStandardProps 提供）。 */
export interface StatusBadgeProps {
  sessionId?: string
}

const POLL_MS = 15_000

/** 状态徽标：轮询全局阶段，显示 高峰/谷时/周末（enabled 关闭或请求失败时静默隐藏）。 */
export function StatusBadge({ sessionId }: StatusBadgeProps) {
  const [status, setStatus] = useState<Status | null>(null)
  const [freeRun, setFreeRun] = useState<FreeRunView>(EMPTY_FREE_RUN)
  const [open, setOpen] = useState(false)

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

  if (!status || !status.enabled) return null

  const tasks = {
    intercepting: (status.modelPatterns ?? 0) > 0,
    freeRun: freeRun.windows.length > 0,
  }
  return (
    <div className="sg-status-root">
      <button
        type="button"
        className={badgeClassNames(status)}
        title={`${badgeTitle(status)} — 点击展开/收起高峰面板`}
        aria-expanded={open}
        data-sg-phase={status.phase}
        data-sg-provider-guard={status.providerGuard === true ? 'on' : 'off'}
        data-sg-step-held={String(status.stepHeld ?? 0)}
        onClick={() => setOpen(!open)}
      >
        {peakLabel(status, tasks)}
      </button>
      {open && (
        <div className="sg-status-panel" role="dialog" aria-label="高峰面板">
          {/* 畅跑任务区在最上方（v3.1.6：独立的「畅跑」按钮已去掉，UI 内嵌到这里） */}
          <FreeRunPanel sessionId={sessionId} />
          <div className="sgMlHead">
            <span className="sg-fr-title">高峰拦截列表（按模型名）</span>
            <button type="button" className="sg-fr-closeicon" onClick={() => setOpen(false)} aria-label="关闭">
              ×
            </button>
          </div>
          <ModelListPanel />
        </div>
      )}
    </div>
  )
}
