// Derived statistics from the daily log.
import { sleepHours, toISODate } from './date.js'

export function sortedLogs(logs) {
  return [...logs].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

export function weightSeries(logs) {
  return sortedLogs(logs)
    .filter((l) => l.weightKg !== null && l.weightKg !== undefined && l.weightKg !== '')
    .map((l) => ({ x: l.date, y: Number(l.weightKg) }))
}

export function sleepDurationSeries(logs) {
  return sortedLogs(logs)
    .filter((l) => l.bedtime && l.wakeTime)
    .map((l) => ({ x: l.date, y: sleepHours(l.bedtime, l.wakeTime) }))
    .filter((p) => p.y != null)
}

export function bedtimeSeries(logs) {
  // express bedtime as hours, mapping after-midnight times onto a continuous scale (e.g. 01:00 -> 25)
  return sortedLogs(logs)
    .filter((l) => l.bedtime)
    .map((l) => {
      const [h, m] = l.bedtime.split(':').map(Number)
      let hours = h + m / 60
      if (hours < 12) hours += 24 // 00:30 -> 24.5 so it sits "after" 23:00
      return { x: l.date, y: Math.round(hours * 10) / 10 }
    })
}

// Consecutive-day streak ending today (or yesterday).
export function computeStreak(logs) {
  if (!logs.length) return 0
  const days = new Set(logs.map((l) => l.date))
  const d = new Date()
  if (!days.has(toISODate(d))) {
    d.setDate(d.getDate() - 1)
    if (!days.has(toISODate(d))) return 0
  }
  let streak = 0
  while (days.has(toISODate(d))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

// Overall adherence rate across all checklists, as a 0-100 integer (or null).
export function adherenceRate(logs) {
  let total = 0
  let done = 0
  for (const l of logs) {
    if (!l.adherence) continue
    const vals = Object.values(l.adherence)
    total += vals.length
    done += vals.filter(Boolean).length
  }
  return total ? Math.round((done / total) * 100) : null
}

// Change between first and most-recent numeric value in a series.
export function seriesDelta(series) {
  if (series.length < 2) return null
  return Math.round((series[series.length - 1].y - series[0].y) * 10) / 10
}

// Most-recent non-empty value of a field across the daily log.
export function latest(logs, field) {
  const sorted = [...logs].sort((a, b) => (a.date < b.date ? 1 : -1))
  const hit = sorted.find((l) => l[field] !== null && l[field] !== undefined && l[field] !== '')
  return hit ? hit[field] : null
}
