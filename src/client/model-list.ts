/**
 * dsh-offpeak — 「高峰拦截列表」的纯逻辑（零 React、零依赖，可单测）。
 *
 * 与 host 判定**同源**：列表项（`officialModelPatterns`）是**模型名**，匹配语义为**精确匹配**
 * （大小写不敏感、去首尾空白；v3.1.6 起不再有关键字/正则的包含匹配）。这里只做四件事：
 *   1. 某模型名是否在列表里（= 是否被拦）；
 *   2. 单行勾选 / 取消勾选 → 新的列表；
 *   3. 关键词过滤（只影响展示与「全选」范围）；
 *   4. 批量勾选 → 新的列表。
 *
 * **判定与存储逻辑都不在这里**：勾选只是往同一份列表里增删**同名条目**。
 */

/** 一行的判定状态。 */
export interface ModelRowState {
  /** 命中的列表项（精确匹配下最多一项）。 */
  matched: string[]
  /** 列表里存在与模型名**完全相同**的条目（= 勾选状态）。 */
  explicit: boolean
  /** 是否已被拦截（精确匹配下等价于 `explicit`）。 */
  covered: boolean
}

/** 单个列表项是否命中模型名：**精确匹配**（大小写不敏感、去首尾空白）。 */
export function matchesPattern(model: string, pattern: string): boolean {
  if (typeof model !== 'string' || typeof pattern !== 'string') return false
  const a = model.trim().toLowerCase()
  const b = pattern.trim().toLowerCase()
  return a !== '' && b !== '' && a === b
}

/** 算出某模型名在给定列表下的行状态。 */
export function rowState(model: string, patterns: readonly string[]): ModelRowState {
  const list = Array.isArray(patterns) ? patterns : []
  const matched = list.filter((p) => matchesPattern(model, p))
  return { matched, explicit: matched.length > 0, covered: matched.length > 0 }
}

/** 给一行生成提示文案。 */
export function rowHint(state: ModelRowState): string {
  if (state.explicit) return '已拦截'
  return ''
}

/**
 * 勾选/取消勾选**单个**模型 → 新列表。
 *
 * - 已存在**完全同名**条目 → 删掉它（取消勾选；若仍有更宽的关键字覆盖，行会变成
 *   只读并提示是哪个关键字盖着 —— 那种情况需要改关键字，而不是逐个模型取消）；
 * - 否则 → 把模型名作为一个新条目追加。
 *
 * 纯函数：不修改入参，返回新数组（去重、保持原有顺序）。
 */
export function toggleModel(patterns: readonly string[], model: string): string[] {
  const list = Array.isArray(patterns) ? [...patterns] : []
  if (typeof model !== 'string' || model === '') return list
  const at = list.indexOf(model)
  if (at !== -1) {
    list.splice(at, 1)
    return list
  }
  if (!list.includes(model)) list.push(model)
  return list
}

/** 模型行（面板与纯函数共用的最小形状）。 */
export interface ModelLike {
  provider: string
  model: string
}

/**
 * 关键词过滤：大小写不敏感的**子串**匹配，命中范围是 `provider/model`（只按 model 也能命中）。
 *
 * 只作用于**展示**与「全选」范围 —— 模型集合、拦截列表本身都不变（空关键词 = 不过滤）。
 */
export function filterRows<T extends ModelLike>(rows: readonly T[], keyword: string): T[] {
  const list = Array.isArray(rows) ? rows : []
  const q = typeof keyword === 'string' ? keyword.trim().toLowerCase() : ''
  if (q === '') return [...list]
  return list.filter((r) => `${r.provider}/${r.model}`.toLowerCase().includes(q))
}

/** 当前过滤结果是否已**全部**被拦截（决定「全选」按钮的文案与动作）。 */
export function allCovered(patterns: readonly string[], rows: readonly ModelLike[]): boolean {
  const list = Array.isArray(rows) ? rows : []
  if (list.length === 0) return false
  return list.every((r) => rowState(r.model, patterns).covered)
}

/**
 * 批量勾选：对**传入的这些行**（= 当前过滤结果）执行全选 / 取消全选。
 *
 * - `checked = true`：把还没被覆盖的模型名作为显式条目补进列表（已有条目不动）；
 * - `checked = false`：把与这些模型名**完全同名**的条目删掉（被更宽关键字盖住的行仍会被拦，
 *   与单行勾选的语义一致 —— 那种情况要改关键字）。
 *
 * 纯函数：不修改入参，返回新数组。
 */
export function bulkToggle(patterns: readonly string[], rows: readonly ModelLike[], checked: boolean): string[] {
  const before = Array.isArray(patterns) ? patterns : []
  const list = [...before]
  const models = (Array.isArray(rows) ? rows : []).map((r) => r.model)
  if (checked) {
    for (const m of models) {
      if (typeof m !== 'string' || m === '') continue
      // 已被（关键字或显式条目）拦住的模型不重复追加 —— 避免把列表写成一堆冗余条目。
      // 覆盖判定用**进入本函数时**的列表：语义稳定（「给当前未覆盖的过滤结果补显式条目」）。
      if (rowState(m, before).covered) continue
      if (!list.includes(m)) list.push(m)
    }
    return list
  }
  const drop = new Set(models)
  return list.filter((p) => !drop.has(p))
}
