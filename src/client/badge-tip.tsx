/**
 * dsh-offpeak — 徽标 hover 卡片（自绘，v3.3.0）。
 *
 * 为什么不用原生 `title`：需求要「【】固定宽度 + 滚动显示拦截列表」，原生 tooltip 做不到
 * （它只有纯文本、无样式、无动画）。卡片由 CSS 控制显隐（`:hover` / `:focus-within`），
 * 标记 `aria-hidden`，无障碍文本走徽标按钮的 `aria-label`（见 `tipText`）。
 */
import type { BadgeTip } from './badge-text'

/** 【】里滚动展示的拦截模型列表（同一串内容复制两份做无缝循环）。 */
function ModelsMarquee({ models }: { models: string[] }) {
  if (models.length === 0) return <span className="sg-tip-empty">未设置拦截模型</span>
  const text = models.join('、')
  return (
    <span className="sg-tip-models">
      <span className="sg-tip-track">
        <span>{text}</span>
        <span className="sg-tip-sep" aria-hidden="true">
          ／／
        </span>
        <span aria-hidden="true">{text}</span>
        <span className="sg-tip-sep" aria-hidden="true">
          ／／
        </span>
      </span>
    </span>
  )
}

export function BadgeTipCard({ tip }: { tip: BadgeTip }) {
  return (
    <div className="sg-tip" role="tooltip" aria-hidden="true">
      <div className="sg-tip-headline">{tip.headline}</div>
      {tip.models !== undefined && (
        <div className="sg-tip-line">
          <span>拦截列表</span>
          <span className="sg-tip-bracket">【</span>
          <ModelsMarquee models={tip.models} />
          <span className="sg-tip-bracket">】</span>
        </div>
      )}
      {tip.notes.map((note) => (
        <div className="sg-tip-line" key={note}>
          {note}
        </div>
      ))}
      {tip.counters !== null && <div className="sg-tip-line">{tip.counters}</div>}
      <div className="sg-tip-hint">{tip.hint}</div>
    </div>
  )
}
