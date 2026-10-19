/**
 * dsh-offpeak — 面板底部「当前高峰谷时」区（v3.3.0）。
 *
 * 默认值取 `GET /session-guard/settings` 的**生效配置**（用户自己的时段），
 * 保存经 `POST /session-guard/rpc {action:'setPeakPolicy'}` 写回配置文件并立即 reload。
 *
 * 时区选择项放在本区，但它**只影响展示**（配置文件里的时间值不动）：显示时区由父组件持有，
 * 畅跑列表与 hover 卡片共用同一个；本区的时间行始终按**策略时区**填写。
 */
import { useEffect, useState } from 'react'
import {
  addRow,
  payloadOf,
  removeRow,
  rowError,
  rowsEqual,
  rowsFromSettings,
  updateRow,
  validateRows,
  weekendModeFromSettings,
  type PeakRow,
} from './peak-policy'
import { COMMON_TIMEZONES, normalizeDisplayTz, writeDisplayTz } from './tz'

export interface PeakPolicyPanelProps {
  /** 生效的显示时区（父组件已把它回退为策略时区）。 */
  displayTz: string
  onDisplayTzChange: (_tz: string) => void
}

export function PeakPolicyPanel({ displayTz, onDisplayTzChange }: PeakPolicyPanelProps) {
  const [policyTz, setPolicyTz] = useState('')
  const [rows, setRows] = useState<PeakRow[]>([])
  const [savedRows, setSavedRows] = useState<PeakRow[]>([])
  const [weekendMode, setWeekendMode] = useState(false)
  const [savedWeekend, setSavedWeekend] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [tzDraft, setTzDraft] = useState(displayTz)

  useEffect(() => {
    setTzDraft(displayTz)
  }, [displayTz])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/session-guard/settings')
        const body = await res.json().catch(() => null)
        if (cancelled || body?.ok !== true) return
        const nextRows = rowsFromSettings(body.settings)
        setPolicyTz(typeof body.settings?.timezone === 'string' ? body.settings.timezone : '')
        setRows(nextRows)
        setSavedRows(nextRows)
        const weekend = weekendModeFromSettings(body.settings)
        setWeekendMode(weekend)
        setSavedWeekend(weekend)
      } catch {
        /* fail-open：拉不到就保持空表，用户仍可手填后保存 */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const dirty = !rowsEqual(rows, savedRows) || weekendMode !== savedWeekend
  const invalid = validateRows(rows)
  // 当前生效的显示时区（未选过 → 策略时区；策略时区也空 → Asia/Shanghai）与候选项列表。
  const tzValue = tzDraft !== '' ? tzDraft : policyTz !== '' ? policyTz : 'Asia/Shanghai'
  const timezoneOptions = [...new Set([tzValue, ...COMMON_TIMEZONES])]

  const applyDisplayTz = (value: string) => {
    const next = value.trim()
    setTzDraft(next)
    if (normalizeDisplayTz(next, displayTz) !== next) return
    onDisplayTzChange(next)
    writeDisplayTz(next)
  }

  const commit = async () => {
    const problem = validateRows(rows)
    if (problem !== null) {
      setError(problem)
      return
    }
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch('/session-guard/rpc', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'setPeakPolicy', ...payloadOf(rows, weekendMode) }),
      })
      const body = await res.json().catch(() => null)
      if (body?.ok !== true) {
        setError(typeof body?.error === 'string' ? body.error : '保存失败')
        return
      }
      const result = body.result ?? {}
      const nextRows = rowsFromSettings({ peakWindows: result.windows })
      setRows(nextRows)
      setSavedRows(nextRows)
      setWeekendMode(result.weekendMode === true)
      setSavedWeekend(result.weekendMode === true)
      setNotice('已写入配置文件并生效')
    } catch {
      setError('保存失败：网络或宿主不可达')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sgPp">
      <div className="sgPpHead">
        <span className="sg-fr-title">当前高峰谷时</span>
      </div>
      <div className="sgPpRow sgPpTz">
        <label className="sgPpLabel" htmlFor="sgPpTz">
          显示时区
        </label>
        {/* 原生 select：datalist 在部分 Chromium/GUI 组合下只显示匹配项，无法稳定列出全部候选 */}
        <select
          id="sgPpTz"
          className="sgPpInput"
          value={tzValue}
          onChange={(e) => applyDisplayTz(e.target.value)}
        >
          {timezoneOptions.map((tz: string) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
        <span className="sgPpHint">
          {`只影响展示：畅跑与峰谷时间会按它换算，配置文件仍按 ${policyTz === '' ? '策略时区' : policyTz} 存储`}
        </span>
      </div>

      {loading ? (
        <p className="sgMlHint">读取配置中…</p>
      ) : (
        <>
          <div className="sgPpRows">
            {rows.map((row, i) => (
              <div className="sgPpRow sgPpTimeRow" key={`${i}-${row.start}-${row.end}`}>
                <input
                  className="sgPpTime"
                  type="time"
                  step={60}
                  value={row.start}
                  onChange={(e) => setRows((prev) => updateRow(prev, i, { start: e.target.value }))}
                />
                <span className="sgPpDash">–</span>
                <input
                  className="sgPpTime"
                  type="time"
                  step={60}
                  value={row.end}
                  onChange={(e) => setRows((prev) => updateRow(prev, i, { end: e.target.value }))}
                />
                <button
                  type="button"
                  className="sgPpDel"
                  disabled={busy || rows.length <= 1}
                  title="删除这一段（至少保留一段）"
                  aria-label="删除这一段"
                  onClick={() => setRows((prev) => removeRow(prev, i))}
                >
                  ×
                </button>
                {rowError(row) !== null && <span className="sgPpErr">{rowError(row)}</span>}
              </div>
            ))}
          </div>
          <div className="sgPpActions">
            <button
              type="button"
              className="sgPpBtn"
              disabled={busy || rows.length >= 8}
              title="添加一个高峰时段（最多 8 段）"
              onClick={() => setRows((prev) => addRow(prev))}
            >
              ＋ 添加时段
            </button>
            <label className="sgPpCheck" title="勾选后周末整日按谷时处理；不勾选则周末也按上面的时段判定">
              <input
                type="checkbox"
                checked={weekendMode}
                disabled={busy}
                onChange={(e) => setWeekendMode(e.target.checked)}
              />
              周末默认谷时
            </label>
            <button type="button" className="sgPpBtn sgPpSave" disabled={busy || !dirty || invalid !== null} onClick={() => void commit()}>
              {busy ? '保存中…' : '保存'}
            </button>
          </div>
          <p className="sgPpHint">时间按策略时区 {policyTz === '' ? '（同显示时区）' : policyTz} 填写；星期限制仍在配置文件里编辑。</p>
          {invalid !== null && <p className="sgPpErr">{invalid}</p>}
          {error !== null && <p className="sgPpErr">{error}</p>}
          {notice !== null && <p className="sgPpOk">{notice}</p>}
        </>
      )}
    </div>
  )
}
