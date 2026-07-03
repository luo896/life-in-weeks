// Date & time helpers for the life-in-weeks grid and habit tracking.

const WEEK_MS = 7 * 24 * 3600 * 1000
const YEAR_MS = 365.25 * 24 * 3600 * 1000

export function parseDate(s) {
  if (!s) return null
  const d = new Date(s + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
}

export function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO() {
  return toISODate(new Date())
}

export function weeksBetween(a, b) {
  return Math.floor((b.getTime() - a.getTime()) / WEEK_MS)
}

// Core life statistics from a birthdate + life expectancy in years.
export function lifeStats(birthdate, years) {
  const totalWeeks = Math.round((years || 90) * 52)
  const birth = parseDate(birthdate)
  if (!birth) {
    return { ok: false, totalWeeks, lived: 0, remaining: totalWeeks, pct: 0, currentWeekIndex: 0, ageYears: 0, birthYear: null }
  }
  const now = new Date()
  const lived = Math.min(totalWeeks, Math.max(0, weeksBetween(birth, now)))
  const remaining = Math.max(0, totalWeeks - lived)
  const pct = totalWeeks ? Math.min(100, (lived / totalWeeks) * 100) : 0
  const ageYears = Math.max(0, Math.floor((now.getTime() - birth.getTime()) / YEAR_MS))
  // currentWeekIndex is used to address grid cells / journals, so keep it in
  // range even when the user has outlived the configured expectancy.
  const currentWeekIndex = Math.max(0, Math.min(lived, totalWeeks - 1))
  return { ok: true, totalWeeks, lived, remaining, pct, currentWeekIndex, ageYears, birthYear: birth.getFullYear() }
}

// "HH:MM" -> minutes since midnight
export function timeToMinutes(t) {
  if (!t || typeof t !== 'string') return null
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

// minutes -> "HH:MM" (wraps around 24h)
export function minutesToTime(min) {
  const total = (((Math.round(min) % 1440) + 1440) % 1440)
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Sleep duration in hours, handling crossing midnight.
export function sleepHours(bedtime, wake) {
  const b = timeToMinutes(bedtime)
  const w = timeToMinutes(wake)
  if (b == null || w == null) return null
  let dur = w - b
  if (dur <= 0) dur += 1440
  return Math.round((dur / 60) * 10) / 10
}

// Smallest signed minute difference between two clock times in [-720, 720].
export function clockDiff(from, to) {
  const f = timeToMinutes(from)
  const t = timeToMinutes(to)
  if (f == null || t == null) return null
  let diff = t - f
  if (diff > 720) diff -= 1440
  if (diff < -720) diff += 1440
  return diff
}

// The calendar date a given life-week begins on.
export function weekStartDate(birthdate, weekIndex) {
  const birth = parseDate(birthdate)
  if (!birth) return null
  return new Date(birth.getTime() + weekIndex * WEEK_MS)
}

// Which life-week a calendar date falls in.
export function weekIndexForDate(birthdate, dateStr) {
  const birth = parseDate(birthdate)
  const d = parseDate(dateStr)
  if (!birth || !d) return null
  return Math.floor((d.getTime() - birth.getTime()) / WEEK_MS)
}

// Short human label for a date, e.g. "2026年6月" / "Jun 2026".
export function monthLabel(d, lang = 'zh') {
  if (!d) return ''
  if (lang === 'en') return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  return `${d.getFullYear()}年${d.getMonth() + 1}月`
}
