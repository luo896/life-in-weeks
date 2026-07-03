// Turn a baseline + goals into a phased, week-by-week improvement plan.
// Generated labels are produced with the ACTIVE language's t() and stored as-is;
// regenerate the plan after switching language to refresh them.
import { timeToMinutes, minutesToTime, clockDiff } from './date.js'
import { makeT } from './i18n.jsx'

export const METRICS = {
  bedtime: { labelKey: 'm.bedtime', kind: 'time', icon: '🌙' },
  wakeTime: { labelKey: 'm.wakeTime', kind: 'time', icon: '☀️' },
  weight: { labelKey: 'm.weight', kind: 'number', icon: '⚖️', unit: 'kg' },
  habit: { labelKey: 'm.habit', kind: 'text', icon: '🎯' },
}

// Generate milestones. Each: { id, metric, title, startOffset, durationWeeks, from, to, perWeek, steps:[{week,label}] }
export function generatePlan(baseline, goals, opts = {}) {
  const t = opts.t || makeT('zh')
  const bedStep = opts.bedStepMin ?? 15 // shift sleep schedule by 15 min / week
  const weightRate = opts.weightRate ?? 0.5 // safe ~0.5 kg / week
  const milestones = []

  for (const g of goals) {
    if (g.metric === 'bedtime' || g.metric === 'wakeTime') {
      const from = g.current
      const to = g.target
      const fm = timeToMinutes(from)
      const diff = clockDiff(from, to)
      if (fm == null || diff == null) continue
      if (diff === 0) continue
      const weeks = Math.max(1, Math.ceil(Math.abs(diff) / bedStep))
      const perWeek = diff / weeks
      const verb = t(g.metric === 'bedtime' ? 'p.verbBed' : 'p.verbWake')
      const steps = []
      for (let w = 1; w <= weeks; w++) {
        steps.push({ week: w, label: t('p.weekStep', { w, verb, time: minutesToTime(fm + perWeek * w) }) })
      }
      milestones.push({
        id: g.id + '-m',
        metric: g.metric,
        title: `${t(METRICS[g.metric].labelKey)} ${from} → ${to}`,
        startOffset: 0,
        durationWeeks: weeks,
        from,
        to,
        perWeek: t('p.perWeekMin', { m: Math.round(Math.abs(perWeek)) }),
        steps,
      })
    } else if (g.metric === 'weight') {
      const from = Number(g.current)
      const to = Number(g.target)
      if (Number.isNaN(from) || Number.isNaN(to) || from === to) continue
      const unit = g.unit || 'kg'
      const rate = g.pace ? Math.abs(Number(g.pace)) || weightRate : weightRate
      const diff = to - from
      const weeks = Math.max(1, Math.ceil(Math.abs(diff) / rate))
      const perWeek = diff / weeks
      const steps = []
      for (let w = 1; w <= weeks; w++) {
        steps.push({ week: w, label: t('p.weightStep', { w, v: (from + perWeek * w).toFixed(1), u: unit }) })
      }
      milestones.push({
        id: g.id + '-m',
        metric: 'weight',
        title: `${t('m.weight')} ${from} → ${to} ${unit}`,
        startOffset: 0,
        durationWeeks: weeks,
        from,
        to,
        perWeek: t('p.perWeekW', { v: Math.abs(perWeek).toFixed(2), u: unit }),
        steps,
      })
    } else {
      // generic habit replacement — research-based ~8 week formation arc
      const weeks = Number(g.weeks) || 8
      const target = g.target || g.label || t('p.newHabit')
      const steps = [
        { week: 1, label: t('p.h1') },
        { week: 3, label: t('p.h2') },
        { week: 5, label: t('p.h3') },
        { week: 7, label: t('p.h4', { w: weeks, t: target }) },
      ]
      milestones.push({
        id: g.id + '-m',
        metric: 'habit',
        title: target,
        startOffset: 0,
        durationWeeks: weeks,
        from: t('p.habitFrom'),
        to: target,
        perWeek: t('p.habitPerWeek'),
        steps,
      })
    }
  }

  return { milestones, generatedAt: new Date().toISOString() }
}

// Flatten the plan into the actions for a given upcoming week number (1-based).
export function actionsForWeek(plan, weekNo) {
  const out = []
  for (const m of plan.milestones || []) {
    const step = (m.steps || []).find((s) => s.week === weekNo)
    if (step) out.push({ milestone: m.title, metric: m.metric, label: step.label })
  }
  return out
}
