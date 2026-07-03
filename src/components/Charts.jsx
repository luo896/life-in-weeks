// Dependency-free responsive SVG line chart with an optional goal line.
import { Empty } from './ui.jsx'
import { useI18n } from '../lib/i18n.jsx'

export function LineChart({ data, goal, color = '#34d399', unit = '', height = 200, invertHint }) {
  const { t } = useI18n()
  if (!data || data.length === 0) {
    return <Empty icon="📈">{t('charts.empty')}</Empty>
  }

  const W = 600
  const H = height
  const pad = { l: 40, r: 16, t: 16, b: 28 }
  const ys = data.map((d) => d.y)
  if (goal != null && !Number.isNaN(Number(goal))) ys.push(Number(goal))
  let min = Math.min(...ys)
  let max = Math.max(...ys)
  if (min === max) {
    min -= 1
    max += 1
  }
  const padY = (max - min) * 0.12
  min -= padY
  max += padY

  const innerW = W - pad.l - pad.r
  const innerH = H - pad.t - pad.b
  const x = (i) => pad.l + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)
  const y = (v) => pad.t + innerH - ((v - min) / (max - min)) * innerH

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.y).toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${x(data.length - 1).toFixed(1)},${(pad.t + innerH).toFixed(1)} L${x(0).toFixed(1)},${(
    pad.t + innerH
  ).toFixed(1)} Z`

  const ticks = 3
  const gridLines = Array.from({ length: ticks + 1 }, (_, i) => min + ((max - min) * i) / ticks)
  const labelEvery = Math.ceil(data.length / 6)

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" preserveAspectRatio="none" role="img">
        <defs>
          <linearGradient id={`g-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={pad.l} y1={y(g)} x2={W - pad.r} y2={y(g)} className="chart-grid" />
            <text x={pad.l - 6} y={y(g) + 3} className="chart-axis" textAnchor="end">
              {g.toFixed(g >= 100 ? 0 : 1)}
            </text>
          </g>
        ))}
        {goal != null && !Number.isNaN(Number(goal)) && (
          <g>
            <line x1={pad.l} y1={y(Number(goal))} x2={W - pad.r} y2={y(Number(goal))} className="chart-goal" />
            <text x={W - pad.r} y={y(Number(goal)) - 5} className="chart-goal-label" textAnchor="end">
              {t('charts.goal', { v: goal, u: unit })}
            </text>
          </g>
        )}
        <path d={areaPath} fill={`url(#g-${color.replace('#', '')})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle key={i} cx={x(i)} cy={y(d.y)} r="3" fill={color} />
        ))}
        {data.map((d, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <text key={'t' + i} x={x(i)} y={H - 8} className="chart-axis" textAnchor="middle">
              {d.x.slice(5)}
            </text>
          ) : null,
        )}
      </svg>
      {invertHint && <p className="chart-hint">{invertHint}</p>}
    </div>
  )
}
