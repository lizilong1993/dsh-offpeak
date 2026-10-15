/**
 * dsh-offpeak — 状态徽标文案（纯函数，零依赖，可单测）。
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

/**
 * 悬浮说明：写清当前的判定口径与挂起/延后数量。
 *
 * 文案必须与实际行为一致（v3.1.7 校正）：
 *   - `providerGuard` 开 → 请求级只拦「判为官方目标」的请求，其它来源照常跑；
 *     拦截列表里的模型名（`modelPatterns`）也算官方目标，因此单独把条数写出来。
 *   - `providerGuard` 关 → 请求级不拦（`provider-guard-off`），改为入峰暂停全部 running 会话。
 *   - `held` = 当前挂起的请求数，`deferred` = error 模式延后待恢复的会话数，
 *     `stepHeld` = 被 step 门挂起的会话数。
 * 不写死任何 provider 品牌名（判定名单是可配置的）。
 */
export function badgeTitle(status: Status): string {
  const base = `${PHASE_LABELS[status.phase]} · ${status.timezone}${status.weekendMode && status.phase !== 'weekend' ? ' · 周末模式' : ''}`
  if (status.phase !== 'peak') return base
  const patterns = status.modelPatterns ?? 0
  const mode = status.providerGuard === true
    ? `只拦官方目标${patterns > 0 ? ` + 拦截列表 ${patterns} 个模型名` : ''}（其它来源照常放行）`
    : '未启用来源判定：入峰暂停全部会话、请求不拦'
  const held = status.held ?? 0
  const deferred = status.deferred ?? 0
  const stepHeld = status.stepHeld ?? 0
  const extra = held > 0 || deferred > 0 || stepHeld > 0
    ? ` · 挂起请求 ${held} · 延后待恢复 ${deferred} · step 门挂起 ${stepHeld}`
    : ''
  return `${base} · ${mode}${extra}`
}
