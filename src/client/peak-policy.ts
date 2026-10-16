/**
 * dsh-offpeak — 面板底部「当前高峰谷时」区的纯逻辑（默认行 / 校验 / 请求体 / 显示时区偏好）。
 *
 * 组件（`peak-policy-panel.tsx`）只负责渲染与调用；这里全是可单测的纯函数。
 */
/** 一行高峰时段（`HH:MM` 墙钟，属策略时区）。 */
export interface PeakRow {
  start: string
  end: string
}

/** 与宿主写入器 `writePeakPolicy` 的上限保持一致。 */
export const MAX_PEAK_WINDOWS = 8

/** 新增行的默认时间。 */
export const NEW_ROW: PeakRow = { start: '09:00', end: '18:00' }

/** 从 `/settings` 的生效配置里取默认行（形状异常 → 空数组，交给调用方兜底）。 */
export function rowsFromSettings(settings: unknown): PeakRow[] {
  const s = (settings ?? {}) as { peakWindows?: unknown }
  const list = Array.isArray(s.peakWindows) ? s.peakWindows : []
  const rows: PeakRow[] = []
  for (const w of list) {
    if (w === null || typeof w !== 'object') continue
    const raw = w as { start?: unknown; end?: unknown }
    rows.push({
      start: typeof raw.start === 'string' ? raw.start : '',
      end: typeof raw.end === 'string' ? raw.end : '',
    })
  }
  return rows
}

/** 从 `/settings` 取「周末默认谷时」开关。 */
export function weekendModeFromSettings(settings: unknown): boolean {
  const s = (settings ?? {}) as { weekendMode?: unknown }
  return s.weekendMode === true
}

/** 单行校验：返回错误文案，或 null 表示合法。 */
export function rowError(row: PeakRow): string | null {
  const re = /^([01]\d|2[0-3]):[0-5]\d$/
  if (!re.test(row.start) || !re.test(row.end)) return '时间格式应为 HH:MM'
  if (row.start === row.end) return '起止时间不能相同'
  return null
}

/** 整表校验：返回错误文案，或 null 表示可以提交。 */
export function validateRows(rows: PeakRow[]): string | null {
  if (rows.length === 0) return '至少保留一个高峰时段'
  if (rows.length > MAX_PEAK_WINDOWS) return `最多 ${MAX_PEAK_WINDOWS} 个高峰时段`
  for (let i = 0; i < rows.length; i++) {
    const err = rowError(rows[i])
    if (err !== null) return `第 ${i + 1} 段：${err}`
  }
  return null
}

/** 两行表是否完全相同（判断「有没有改动」，决定保存按钮是否可用）。 */
export function rowsEqual(a: PeakRow[], b: PeakRow[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].start !== b[i].start || a[i].end !== b[i].end) return false
  }
  return true
}

/** 改一行（越界返回原数组，保持不可变）。 */
export function updateRow(rows: PeakRow[], index: number, patch: Partial<PeakRow>): PeakRow[] {
  if (index < 0 || index >= rows.length) return rows
  return rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
}

/** 追加一行（已到上限则原样返回）。 */
export function addRow(rows: PeakRow[]): PeakRow[] {
  if (rows.length >= MAX_PEAK_WINDOWS) return rows
  return [...rows, { ...NEW_ROW }]
}

/** 删一行（只剩一行时原样返回：不允许清空）。 */
export function removeRow(rows: PeakRow[], index: number): PeakRow[] {
  if (rows.length <= 1 || index < 0 || index >= rows.length) return rows
  return rows.filter((_, i) => i !== index)
}

/** RPC 请求体。 */
export function payloadOf(rows: PeakRow[], weekendMode: boolean): { windows: PeakRow[]; weekendMode: boolean } {
  return { windows: rows.map((r) => ({ start: r.start, end: r.end })), weekendMode }
}

