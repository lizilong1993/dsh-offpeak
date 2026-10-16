/**
 * dsh-offpeak — 显示时区换算（纯函数，零依赖，可单测）。
 *
 * 约定：配置里的峰谷时间（`peakPolicy.peakWindows[].start/end`）是**策略时区的墙钟**；
 * 面板允许用户另选一个「显示时区」，只影响展示，配置文件里的原始值不动。
 * 本模块负责「墙钟 → 绝对时刻 → 目标时区墙钟」的换算与格式化。
 */

/** IANA 时区是否可用（Intl 能构造即为可用）。 */
export function isValidTimeZone(tz: string): boolean {
  if (typeof tz !== 'string' || tz.trim() === '') return false
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())
    return true
  } catch {
    return false
  }
}

/** `HH:MM` → 时/分；非法返回 null。 */
export function parseHHMM(hhmm: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? '').trim())
  if (m === null) return null
  const hour = Number(m[1])
  const minute = Number(m[2])
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null
  return { hour, minute }
}

interface Parts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

/** 某绝对时刻在指定时区下的墙钟部件。 */
export function zonedParts(ms: number, tz: string): Parts {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  const p: Record<string, string> = {}
  for (const part of f.formatToParts(new Date(ms))) p[part.type] = part.value
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
  }
}

/**
 * 把「`tz` 时区里 `ref` 当天的 `hh:mm`」换算成绝对时刻（毫秒）。
 *
 * 做法：先当成 UTC 猜一个时刻，再用该时刻在 `tz` 下的墙钟与猜测的差修正一次
 * （一次迭代即可覆盖常规偏移与换季；DST 跳变的那一小时本身存在歧义，取修正后结果）。
 */
export function wallClockToInstant(tz: string, hhmm: string, ref: Date = new Date()): number | null {
  const p = parseHHMM(hhmm)
  if (p === null || !isValidTimeZone(tz)) return null
  const base = zonedParts(ref.getTime(), tz)
  const guess = Date.UTC(base.year, base.month - 1, base.day, p.hour, p.minute)
  const got = zonedParts(guess, tz)
  const asUtc = Date.UTC(got.year, got.month - 1, got.day, got.hour, got.minute)
  return guess - (asUtc - guess)
}

/** 绝对时刻 → 指定时区的 `HH:MM`。 */
export function formatHHMM(ms: number, tz: string): string {
  const p = zonedParts(ms, tz)
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`
}

/** 绝对时刻 → 指定时区的 `MM-DD HH:MM`。 */
export function formatInstant(isoOrMs: string | number, tz: string): string {
  const ms = typeof isoOrMs === 'number' ? isoOrMs : Date.parse(String(isoOrMs))
  if (!Number.isFinite(ms) || !isValidTimeZone(tz)) return ''
  const p = zonedParts(ms, tz)
  return `${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')} ${formatHHMM(ms, tz)}`
}

/** 绝对时刻区间 → 显示时区下的 `MM-DD HH:MM – MM-DD HH:MM`。 */
export function formatInstantRange(from: string | number, to: string | number, displayTz: string): string {
  const a = formatInstant(from, displayTz)
  const b = formatInstant(to, displayTz)
  if (a === '' || b === '') return ''
  return `${a} – ${b}`
}

/**
 * 单个峰窗口 → 显示时区文本：`09:00–12:00`；结束时刻落到第二天时补 `（+1 天）`。
 * 策略时区等于显示时区时不做任何换算，原样输出（避免无谓的 Intl 解析）。
 */
export function formatWindow(
  start: string,
  end: string,
  policyTz: string,
  displayTz: string,
  ref: Date = new Date(),
): string {
  const raw = `${start}–${end}`
  if (policyTz === displayTz || !isValidTimeZone(displayTz) || !isValidTimeZone(policyTz)) return raw
  const startMs = wallClockToInstant(policyTz, start, ref)
  const endMsRaw = wallClockToInstant(policyTz, end, ref)
  if (startMs === null || endMsRaw === null) return raw
  // 跨午夜的窗口（end <= start）：结束时刻算到「次日」，否则显示出的天数差会反着来。
  const endMs = end <= start ? endMsRaw + 86_400_000 : endMsRaw
  const s = zonedParts(startMs, displayTz)
  const e = zonedParts(endMs, displayTz)
  const startDay = Date.UTC(s.year, s.month - 1, s.day)
  const endDay = Date.UTC(e.year, e.month - 1, e.day)
  const shiftDays = Math.round((endDay - startDay) / 86_400_000)
  const suffix = shiftDays > 0 ? `（+${shiftDays} 天）` : shiftDays < 0 ? `（-${Math.abs(shiftDays)} 天）` : ''
  return `${formatHHMM(startMs, displayTz)}–${formatHHMM(endMs, displayTz)}${suffix}`
}

/** 多窗口摘要：`09:00–12:00 / 14:00–18:00`。 */
export function formatWindows(
  windows: Array<{ start: string; end: string }>,
  policyTz: string,
  displayTz: string,
  ref: Date = new Date(),
): string {
  if (!Array.isArray(windows) || windows.length === 0) return ''
  return windows.map((w) => formatWindow(w.start, w.end, policyTz, displayTz, ref)).join(' / ')
}

/** 常用时区（datalist 候选；用户可填任意 IANA 名）。 */
export const COMMON_TIMEZONES: readonly string[] = [
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Kolkata',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
]

/** 显示时区偏好的 localStorage 键。 */
export const DISPLAY_TZ_KEY = 'offpeak.displayTz'

/** 显示时区：非法/为空 → 回退到给定值；回退值也非法 → UTC。 */
export function normalizeDisplayTz(value: unknown, fallback: string): string {
  const s = typeof value === 'string' ? value.trim() : ''
  if (s !== '' && isValidTimeZone(s)) return s
  return isValidTimeZone(fallback) ? fallback : 'UTC'
}

/** 读显示时区偏好：没有存过 / 非法 / 读写异常 → 返回空串（调用方用策略时区兜底）。 */
export function readDisplayTz(): string {
  try {
    if (typeof localStorage === 'undefined') return ''
    const raw = localStorage.getItem(DISPLAY_TZ_KEY)
    return typeof raw === 'string' && isValidTimeZone(raw.trim()) ? raw.trim() : ''
  } catch {
    return ''
  }
}

/** 写显示时区偏好（失败静默：只是偏好）。 */
export function writeDisplayTz(tz: string): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(DISPLAY_TZ_KEY, tz)
  } catch {
    /* 隐私模式 / 配额满：忽略 */
  }
}
