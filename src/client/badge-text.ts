/**
 * dsh-offpeak — 状态徽标文案 + hover 卡片模型（纯函数，零依赖，可单测）。
 *
 * 分离出来的原因：徽标语义（高峰的三态、谷时/周末）与 hover 卡片文案需要单测，
 * 而组件文件是 TSX（含 React 运行时）。这里只有字符串逻辑。
 *
 * v3.3.0：hover 由原生 `title` 改为自绘卡片（原生 tooltip 做不到「固定宽度 + 滚动」），
 * 文案改为**由用户配置生成**（来源判定名单、拦截列表、高峰时段、周末规则），不再写死
 * provider 品牌名，也不再出现 step（该能力已移除）。
 */

/** /session-guard/status 返回的全局阶段（组件与测试共用）。 */
export interface Status {
  phase: 'peak' | 'off-peak' | 'weekend'
  enabled: boolean
  /** 周末是否默认谷时（weekendPolicy.enabled）。 */
  weekendMode: boolean
  /** 哪几天算周末（用于卡片文案）。 */
  weekendDays?: string[]
  /** 来源判定是否开启（开启时高峰只拦判为官方的目标）。 */
  providerGuard?: boolean
  /** 拦截列表条数（> 0 = 有拦截任务）。 */
  modelPatterns?: number
  /** 拦截列表名单（hover 卡片【】里滚动展示）。 */
  officialModelPatterns?: string[]
  /** 来源判定名单（hover 卡片「拦截 <来源> 的【…】」）。 */
  officialProviders?: string[]
  /** 生效的高峰时段（策略时区墙钟）。 */
  peakWindows?: Array<{ name?: string; start: string; end: string }>
  /** 当前命中的窗口名（卡片「当前窗口」用）。 */
  windowName?: string | null
  /** 下一段高峰的绝对时刻（ISO；客户端按显示时区格式化）。 */
  nextPeakAt?: string | null
  /** 当前被挂起的请求数（hold 模式）。 */
  held?: number
  /** error 模式延后的会话数。 */
  deferred?: number
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
 * 徽标文案：
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
 * 都是可点击按钮，点开同一个面板，绝不因为不是高峰就退化成不可点的展示元素。
 */
export function badgeClassNames(status: Pick<Status, 'phase'>): string {
  const variant = status.phase === 'peak' ? 'sg-peak' : status.phase === 'weekend' ? 'sg-weekend' : 'sg-off'
  return `sg-status sg-status-btn ${variant}`
}

/** hover 卡片需要的、已按显示时区换算好的时间文本（换算见 `tz.ts`，本模块保持纯字符串）。 */
export interface TipTimes {
  /** 当前窗口，如 `09:00–12:00`。 */
  currentWindow?: string | null
  /** 全部峰窗口摘要，如 `09:00–12:00 / 14:00–18:00`。 */
  peakSummary?: string | null
  /** 下一段高峰，如 `10-16 14:00`。 */
  nextPeak?: string | null
}

/** hover 卡片内容（结构化；卡片组件负责排版与【】内的滚动）。 */
export interface BadgeTip {
  /** 第一行：阶段 · 时区[ · 当前窗口]。 */
  headline: string
  /** 有值时渲染「拦截列表【models】」（models 为空 → 卡片显示「未设置拦截模型」）。 */
  models?: string[]
  /** 其余说明行（放行口径、周末规则、下一段高峰……）。 */
  notes: string[]
  /** 挂起/延后计数；都为 0 时为 null。 */
  counters: string | null
  /** 末行提示。 */
  hint: string
}

/** 周末天数文案（缺省与内置一致）。 */
function weekendDaysText(status: Status): string {
  const days = Array.isArray(status.weekendDays) && status.weekendDays.length > 0 ? status.weekendDays : ['sat', 'sun']
  return days.join('、')
}

/**
 * hover 卡片文案：**完全按用户当前配置生成**（来源判定开关 + 名单、拦截列表、高峰时段、
 * 周末规则），并写入当前挂起/延后计数。不含 step（能力已移除），不写死 provider 品牌名。
 */
export function badgeTip(status: Status, times: TipTimes = {}): BadgeTip {
  const tz = status.timezone === '' ? '本地时区' : status.timezone
  const label = PHASE_LABELS[status.phase]
  const peak = status.phase === 'peak'
  const summary = typeof times.peakSummary === 'string' && times.peakSummary !== '' ? times.peakSummary : ''
  const current = typeof times.currentWindow === 'string' && times.currentWindow !== '' ? times.currentWindow : ''
  const notes: string[] = []
  let headline = `${label} · ${tz}`
  let models: string[] | undefined

  if (peak) {
    if (current !== '') headline = `${headline} · 当前窗口 ${current}`
    if (status.providerGuard === true) {
      // 拦截列表是「模型名」集合，可能既不属于官方源、也未必是 DeepSeek 模型 —— 不写来源名，只列模型。
      models = Array.isArray(status.officialModelPatterns) ? [...status.officialModelPatterns] : []
      notes.push('其它来源照常放行')
    } else {
      notes.push('未启用来源判定：入峰暂停全部会话、请求不拦')
    }
    if (summary !== '') notes.push(`全部高峰时段 ${summary}`)
  } else {
    notes.push('请求全部放行')
    if (summary !== '') notes.push(`高峰时段 ${summary}`)
    if (status.weekendMode === true) notes.push(`周末整日谷时（${weekendDaysText(status)}）`)
    else notes.push('周末不豁免（按高峰时段判定）')
  }

  const nextPeak = typeof times.nextPeak === 'string' && times.nextPeak !== '' ? times.nextPeak : ''
  if (nextPeak !== '') notes.push(`下一段高峰 ${nextPeak}`)

  const held = status.held ?? 0
  const deferred = status.deferred ?? 0
  const counters = held > 0 || deferred > 0 ? `挂起请求 ${held} · 延后待恢复 ${deferred}` : null

  return { headline, models, notes, counters, hint: '点击展开/收起高峰面板' }
}

/** 卡片内容的纯文本版（徽标按钮的 `aria-label` 用；卡片本身 aria-hidden）。 */
export function tipText(tip: BadgeTip): string {
  const parts: string[] = [tip.headline]
  if (tip.models !== undefined) {
    const list = tip.models.length > 0 ? tip.models.join('、') : '未设置拦截模型'
    parts.push(`拦截列表【${list}】`)
  }
  for (const note of tip.notes) parts.push(note)
  if (tip.counters !== null) parts.push(tip.counters)
  parts.push(tip.hint)
  return parts.join('；')
}
