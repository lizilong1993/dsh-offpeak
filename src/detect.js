/**
 * dsh-offpeak — 自动检测（D7，诚实边界）。
 *
 * - host 可自动探测：`ctx.get('taskControl')`（会话门）、`ctx.get('sessionGuard')`。
 * - client 可自动探测：input-traffic 补的「最小桥」标记（`window.__DSH_OFFPEAK_BRIDGE__`，
 *   兼容它历史上写的 `__DSH_SESSION_GUARD_BRIDGE__` —— 那是**第三方插件**的全局名，本插件只读）。
 *   探测不到 → 本插件客户端使用自带回退冻结（fallback），fail-open 不报错（D8）。
 */

/** host：会话门（dsh-task-control）是否可用。 */
export function detectTaskControl(ctx) {
  return !!(ctx && typeof ctx.get === 'function' && ctx.get('taskControl'))
}

/** host：sessionGuard 服务是否已提供（其他插件探测用）。 */
export function detectSessionGuard(ctx) {
  return !!(ctx && typeof ctx.get === 'function' && ctx.get('sessionGuard'))
}

/** input-traffic 最小桥的全局名（新名 + 它历史上写的旧名）。 */
export const INPUT_TRAFFIC_BRIDGE_KEYS = Object.freeze(['__DSH_OFFPEAK_BRIDGE__', '__DSH_SESSION_GUARD_BRIDGE__'])

/**
 * client：input-traffic 最小桥是否已注册（两个全局名都看）。
 * @param {object} [g] 显式传入全局对象（便于测试）；默认 globalThis
 */
export function detectInputTrafficBridge(g) {
  const root = g || (typeof globalThis !== 'undefined' ? globalThis : {})
  if (!root) return false
  return INPUT_TRAFFIC_BRIDGE_KEYS.some((key) => {
    const bridge = root[key]
    return !!(bridge && typeof bridge.stopNextTurn === 'function')
  })
}
