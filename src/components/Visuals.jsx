// Visual representations of the baseline and goal status.
import { timeToMinutes, sleepHours, clockDiff } from '../lib/date.js'

// A 24-hour bar with the sleep window highlighted (handles crossing midnight).
export function SleepBar({ bedtime, wakeTime }) {
  const b = timeToMinutes(bedtime)
  const w = timeToMinutes(wakeTime)
  const dur = sleepHours(bedtime, wakeTime)
  const segs = []
  if (b != null && w != null) {
    if (w > b) segs.push([b, w])
    else {
      segs.push([b, 1440])
      if (w > 0) segs.push([0, w])
    }
  }
  const pct = (m) => (m / 1440) * 100
  const ticks = [6, 12, 18]
  return (
    <div className="sleepbar">
      <div className="sleepbar-track">
        {ticks.map((t) => (
          <span key={t} className="sleepbar-tick" style={{ left: `${(t / 24) * 100}%` }} />
        ))}
        {segs.map(([s, e], i) => (
          <div key={i} className="sleepbar-fill" style={{ left: `${pct(s)}%`, width: `${pct(e - s)}%` }} />
        ))}
      </div>
      <div className="sleepbar-axis">
        <span>午夜</span>
        <span>6:00</span>
        <span>正午</span>
        <span>18:00</span>
        <span>午夜</span>
      </div>
      <div className="sleepbar-cap">
        🌙 {bedtime || '—'} → ☀️ {wakeTime || '—'}
        {dur != null && <b> · 约 {dur} 小时</b>}
      </div>
    </div>
  )
}

// A track from "现状" to "目标" with a marker at the latest actual value.
export function GapBar({ kind, from, to, current, unit = '' }) {
  let total
  let cur
  let fromLabel
  let toLabel
  let curLabel
  if (kind === 'time') {
    total = clockDiff(from, to) ?? 0
    cur = current ? clockDiff(from, current) ?? 0 : 0
    fromLabel = from || '—'
    toLabel = to || '—'
    curLabel = current || from || '—'
  } else {
    const f = Number(from)
    const t = Number(to)
    const hasCur = current !== null && current !== undefined && current !== ''
    const c = hasCur ? Number(current) : f
    total = t - f
    cur = c - f
    fromLabel = `${f}${unit}`
    toLabel = `${t}${unit}`
    curLabel = `${c}${unit}`
  }
  const progress = total === 0 ? 1 : cur / total
  const reached = total === 0 ? true : progress >= 1
  const fillPct = Math.max(0, Math.min(100, progress * 100))
  const pctText = Math.round(Math.max(0, Math.min(progress, 1)) * 100)
  return (
    <div className="gapbar">
      <div className="gapbar-track">
        <div className="gapbar-fill" style={{ width: `${fillPct}%` }} />
        <div className="gapbar-marker" style={{ left: `${fillPct}%` }}>
          <span className="gapbar-bubble">{curLabel}</span>
        </div>
      </div>
      <div className="gapbar-ends">
        <span>现状 {fromLabel}</span>
        <span className={reached ? 'gb-reached' : 'gb-pct'}>{reached ? '已达成 ✓' : `已完成 ${pctText}%`}</span>
        <span>目标 {toLabel}</span>
      </div>
    </div>
  )
}
