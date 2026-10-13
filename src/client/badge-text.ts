/**
 * dsh-session-guard — 状态徽标文案（纯函数，零依赖，可单测）。
 *
 * 分离出来的原因：徽标语义（高峰的「无任务 / 拦截中 / 畅跑中」三态、谷时/周末）需要单测，
 * 而组件文件是 TSX（含 React 运行时）。这里只有字符串逻辑。
 */

/** /session-guard/status 返回的全局阶段（组件与测试共用）。 */
export interface Status {
  phase: 'peak' | 'off-peak' | 'weekend'
  enabled: boolean
  weekendMode: boolean
  /** 官方源二维判定是否开启（开启时高峰期只拦官方源）。 */
  providerGuard?: boolean
  /** 拦截列表里的模型数（> 0 = 有拦截任务）。 */
  modelPatterns?: number
  /** 当前被挂起的请求数（hold 模式）。 */
  held?: number
  /** error 模式记下的延后会话数。 */
  deferred?: number
  /** 当前被 step 门挂起的会话数（v0.2.0）。 */
  stepHeld?: number
  timezone: string
}

/** 阶段文案。 */
export const PHASE_LABELS = {
  peak: '高峰',
  'off-peak': '谷时',
  weekend: '周末',
} as const

/** 徽标要表达的任务态（高峰期的三种文案）。 */
export interface BadgeTasks {
  /** 拦截列表里有模型（= 有拦截任务）。 */
  intercepting?: boolean
  /** 本会话有畅跑任务。 */
  freeRun?: boolean
}

/**
 * 徽标文案（v3.1.6）：
 *   - 非高峰 → 阶段文案（谷时 / 周末）；
 *   - 高峰 + 有畅跑任务 → `高峰 · 畅跑中`；
 *   - 高峰 + 有拦截任务 → `高峰 · 拦截中`；
 *   - 高峰 + 都没任务 → `高峰`。
 *
 * 畅跑优先于拦截：畅跑是「本会话无视峰谷照常跑」，比「有拦截规则」更直接地描述此刻状态。
 */
export function peakLabel(status: Pick<Status, 'phase'>, tasks: BadgeTasks = {}): string {
  if (status.phase !== 'peak') return PHASE_LABELS[status.phase]
  if (tasks.freeRun === true) return '高峰 · 畅跑中'
  if (tasks.intercepting === true) return '高峰 · 拦截中'
  return '高峰'
}

/**
 * 徽标的 CSS 类：**每个阶段都是同一个按钮**（`sg-status sg-status-btn` + 配色变体）。
 *
 * 这条不变量要钉住：高峰（拦截）与谷时/周末（放行）**只有文案与颜色变**，交互形态一致 ——
 * 都是可点击按钮，点开同一个「高峰拦截列表」面板，绝不因为不是高峰就退化成不可点的展示元素。
 */
export function badgeClassNames(status: Pick<Status, 'phase'>): string {
  const variant = status.phase === 'peak' ? 'sg-peak' : status.phase === 'weekend' ? 'sg-weekend' : 'sg-off'
  return `sg-status sg-status-btn ${variant}`
}

/** 悬浮说明：把判定口径与当前挂起/延后数量写清楚。 */
export function badgeTitle(status: Status): string {
  const base = `${PHASE_LABELS[status.phase]} · ${status.timezone}${status.weekendMode ? ' · 周末模式' : ''}`
  if (status.phase !== 'peak') return base
  const mode = status.providerGuard === true ? '仅拦截 DeepSeek 官方源' : '全部会话暂停（未启用二维判定）'
  const held = status.held ?? 0
  const deferred = status.deferred ?? 0
  const stepHeld = status.stepHeld ?? 0
  const extra = held > 0 || deferred > 0 || stepHeld > 0
    ? ` · 挂起 ${held} · 延后 ${deferred} · step 挂起 ${stepHeld}`
    : ''
  return `${base} · ${mode}${extra}`
}
