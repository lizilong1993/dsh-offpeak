/**
 * dsh-session-guard — 浏览器 half。
 *
 * 职责（全部 fail-open，D8）：
 * - 在 composer 输入区右侧注册「畅跑」按钮与**纯展示**状态徽标（高峰/谷时/周末）；
 * - **不做**冻结/会话动作——冻结按钮由 input-traffic 接管并经 /session-guard/rpc
 *   桥接 host 会话门；本插件客户端不注册任何按钮，避免与 input-traffic 冲突。
 *
 * 兼容性注记（0.1.7 line）：**客户端**服务 `settingsScope` 在 dsh 0.1.7 起不再提供
 * （它原本只为设置卡片席位服务）。若把它写进静态 `inject`，客户端条目会永远 pending
 * （waiting for service: settingsScope）并让应用 **web boot 致命失败** —— 这是实测到的
 * 崩溃原因，与宿主 `settings` 服务无关（宿主那个服务仍在，只是已无 `register`/`get`）。
 * 上游 compat/0.1.7 线因此整体去掉了设置卡片（`inject = ['slots','locale']`）；这里跟随
 * 同一条口径：设置表单由宿主 `Config` 的 `.volatile()` 字段自动生成，客户端不再承载设置面板。
 *
 * 构建：tsdown → lib/client.js（__ModuleLoader__.load 注册，与 input-traffic 同构）。
 */
import { StatusBadge } from './status-badge'

/** 客户端所需服务：slots（状态徽标）+ locale。 */
export const inject = ['slots', 'locale']

/** 轻量 ctx 类型（仅本客户端用到的方法；构建时类型被剥离）。 */
interface SlotsFace {
  inject: (_name: string, _fn: () => unknown) => () => void
  register: (_options: Record<string, unknown>, _component: unknown) => () => void
}
interface ClientCtx {
  slots: SlotsFace
}

export function apply(ctx: ClientCtx) {
  // 「畅跑」按钮已去掉（v3.1.6）：畅跑 UI 内嵌在状态徽标面板最上方，不再单独占位。

  // 状态徽标：输入区右侧。徽标即按钮 —— 点开「畅跑任务 + 高峰拦截列表」面板。
  ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
    name: 'conversation.input.right',
    id: 'offpeak-status',
    order: 40,
    locale: 'offpeak',
  }, StatusBadge))
}
