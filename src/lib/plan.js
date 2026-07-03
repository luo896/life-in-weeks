// Turn a baseline + goals into a phased, week-by-week improvement plan.
import { timeToMinutes, minutesToTime, clockDiff } from './date.js'

export const METRICS = {
  bedtime: { label: '入睡时间', kind: 'time', icon: '🌙' },
  wakeTime: { label: '起床时间', kind: 'time', icon: '☀️' },
  weight: { label: '体重', kind: 'number', icon: '⚖️', unit: 'kg' },
  habit: { label: '习惯', kind: 'text', icon: '🎯' },
}

// Generate milestones. Each: { id, metric, title, startOffset, durationWeeks, from, to, perWeek, steps:[{week,label}] }
export function generatePlan(baseline, goals, opts = {}) {
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
      const verb = g.metric === 'bedtime' ? '入睡' : '起床'
      const steps = []
      for (let w = 1; w <= weeks; w++) {
        steps.push({ week: w, label: `第 ${w} 周：${verb} ${minutesToTime(fm + perWeek * w)}` })
      }
      milestones.push({
        id: g.id + '-m',
        metric: g.metric,
        title: `${METRICS[g.metric].label} ${from} → ${to}`,
        startOffset: 0,
        durationWeeks: weeks,
        from,
        to,
        perWeek: `每周提前/推后约 ${Math.round(Math.abs(perWeek))} 分钟`,
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
        steps.push({ week: w, label: `第 ${w} 周：目标约 ${(from + perWeek * w).toFixed(1)} ${unit}` })
      }
      milestones.push({
        id: g.id + '-m',
        metric: 'weight',
        title: `体重 ${from} → ${to} ${unit}`,
        startOffset: 0,
        durationWeeks: weeks,
        from,
        to,
        perWeek: `每周约 ${Math.abs(perWeek).toFixed(2)} ${unit}`,
        steps,
      })
    } else {
      // generic habit replacement — research-based ~8 week formation arc
      const weeks = Number(g.weeks) || 8
      const target = g.target || g.label || '新习惯'
      const steps = [
        { week: 1, label: '第 1–2 周：记录触发场景，看清旧习惯何时发生' },
        { week: 3, label: '第 3–4 周：用新行为替换旧行为，布置环境提示' },
        { week: 5, label: '第 5–6 周：连续打卡，给每个里程碑一点奖励' },
        { week: 7, label: `第 7–${weeks} 周：让「${target}」变成不费力的自动行为` },
      ]
      milestones.push({
        id: g.id + '-m',
        metric: 'habit',
        title: target,
        startOffset: 0,
        durationWeeks: weeks,
        from: '现状',
        to: target,
        perWeek: '行为养成通常需 21–66 天',
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
