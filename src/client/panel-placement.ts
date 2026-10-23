/**
 * dsh-offpeak — 面板定位（纯函数，零依赖，可单测）。
 *
 * 「永远不被遮挡」的判据：按**实测可用空间**决定向上/向下展开，并把水平位置夹在视口内；
 * 用 `position: fixed` 定位，绕开祖先容器的 overflow 裁剪。
 * 输入均为视口坐标系，输出可直接作为内联 style 使用。
 */

export interface AnchorRect {
  top: number
  bottom: number
  left: number
  width: number
}

export interface ViewportSize {
  width: number
  height: number
}

export interface PlacementOptions {
  anchor: AnchorRect
  viewport: ViewportSize
  /** 期望宽度（会被视口收窄）。 */
  preferredWidth: number
  /** 与触发点之间的空隙。 */
  gap?: number
  /** 视口边缘留白。 */
  margin?: number
  /** 「上方够用」的最小高度：低于它就更倾向向下展开。 */
  minHeight?: number
}

export interface Placement {
  position: 'fixed'
  side: 'up' | 'down'
  left: number
  width: number
  /** 向上展开时给 bottom，向下展开时给 top；另一个由调用方置为 'auto'。 */
  top?: number
  bottom?: number
  maxHeight: number
}

/** 面板允许的最小高度（再挤也保留这么多，内部滚动）。 */
export const MIN_PANEL_HEIGHT = 80

/**
 * 计算面板几何：优先向上（徽标在输入区，平时都在底部），上方不够就向下；
 * 水平居中于触发按钮并夹在视口内。
 */
export function computePanelPlacement({
  anchor,
  viewport,
  preferredWidth,
  gap = 8,
  margin = 12,
  minHeight = 260,
}: PlacementOptions): Placement {
  const width = Math.max(0, Math.min(preferredWidth, viewport.width - margin * 2))
  const centered = anchor.left + anchor.width / 2 - width / 2
  const maxLeft = Math.max(margin, viewport.width - width - margin)
  const left = Math.min(Math.max(centered, margin), maxLeft)

  const spaceAbove = anchor.top - margin - gap
  const spaceBelow = viewport.height - anchor.bottom - margin - gap
  const side: 'up' | 'down' = spaceAbove >= minHeight || spaceAbove >= spaceBelow ? 'up' : 'down'
  const maxHeight = Math.max(MIN_PANEL_HEIGHT, Math.floor(side === 'up' ? spaceAbove : spaceBelow))

  if (side === 'up') {
    return { position: 'fixed', side, left, width, bottom: Math.max(0, viewport.height - anchor.top + gap), maxHeight }
  }
  return { position: 'fixed', side, left, width, top: Math.max(0, anchor.bottom + gap), maxHeight }
}
