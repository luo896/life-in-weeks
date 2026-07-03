// Visual representations of the baseline and goal status.
import { useI18n } from '../lib/i18n.jsx'
import { timeToMinutes, sleepHours, clockDiff } from '../lib/date.js'

// A 24-hour bar with the sleep window highlighted (handles crossing midnight).
export function SleepBar({ bedtime, wakeTime }) {
  const { t } = useI18n()
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
        {ticks.map((tk) => (
          <span key={tk} className="sleepbar-tick" style={{ left: `${(tk / 24) * 100}%` }} />
        ))}
        {segs.map(([s, e], i) => (
          <div key={i} className="sleepbar-fill" style={{ left: `${pct(s)}%`, width: `${pct(e - s)}%` }} />
        ))}
      </div>
      <div className="sleepbar-axis">
        <span>{t('v.axis0')}</span>
        <span>{t('v.axis6')}</span>
        <span>{t('v.axis12')}</span>
        <span>{t('v.axis18')}</span>
        <span>{t('v.axis0')}</span>
      </div>
      <div className="sleepbar-cap">
        🌙 {bedtime || '—'} → ☀️ {wakeTime || '—'}
        {dur != null && <b> · {t('v.approxHours', { h: dur })}</b>}
      </div>
    </div>
  )
}

// A track from current baseline to target, with a marker at the latest actual value.
export function GapBar({ kind, from, to, current, unit = '' }) {
  const { t } = useI18n()
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
    const tt = Number(to)
    const hasCur = current !== null && current !== undefined && current !== ''
    const c = hasCur ? Number(current) : f
    total = tt - f
    cur = c - f
    fromLabel = `${f}${unit}`
    toLabel = `${tt}${unit}`
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
        <span>{t('v.current', { v: fromLabel })}</span>
        <span className={reached ? 'gb-reached' : 'gb-pct'}>
          {reached ? t('v.reached') : t('v.done', { p: pctText })}
        </span>
        <span>{t('v.target', { v: toLabel })}</span>
      </div>
    </div>
  )
}
