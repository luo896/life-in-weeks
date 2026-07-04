import { useStore } from '../store.jsx'
import { useI18n } from '../lib/i18n.jsx'
import { Card, Button, Empty } from './ui.jsx'
import { generatePlan, METRICS, actionsForWeek } from '../lib/plan.js'

const PLAN_COLORS = ['#f59e0b', '#60a5fa', '#f472b6', '#a78bfa', '#22d3ee', '#fb7185']

export default function Plan() {
  const { state, setPlan } = useStore()
  const { t, lang } = useI18n()
  const { goals, plan, baseline } = state

  // plan text is generated in the active language and stored as-is
  const regenerate = () => setPlan(generatePlan(baseline, goals, { t }))

  const longest = Math.max(0, ...(plan.milestones || []).map((m) => m.durationWeeks || 0))
  const previewWeeks = Math.min(longest, 6)

  return (
    <div className="stack">
      <Card
        title={t('pv.title')}
        subtitle={t('pv.sub')}
        right={
          <Button onClick={regenerate} disabled={goals.length === 0}>
            {plan.generatedAt ? t('pv.regenerate') : t('pv.generate')}
          </Button>
        }
      >
        {goals.length === 0 ? (
          <Empty icon="🧭">{t('pv.emptyGoals')}</Empty>
        ) : !plan.generatedAt ? (
          <Empty icon="✨">{t('pv.emptyPlan')}</Empty>
        ) : (
          <>
            <p className="muted">
              {t('pv.meta', {
                d: new Date(plan.generatedAt).toLocaleString(lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : 'en-US'),
                n: plan.milestones.length,
              })}
            </p>
            <div className="ms-grid">
              {plan.milestones.map((m, idx) => (
                <div className="ms-card" key={m.id} style={{ '--ms': PLAN_COLORS[idx % PLAN_COLORS.length] }}>
                  <div className="ms-top">
                    <span className="ms-ic">{METRICS[m.metric]?.icon || '🎯'}</span>
                    <div>
                      <div className="ms-title">{m.title}</div>
                      <div className="ms-meta">
                        {m.perWeek} · {t('pv.aboutWeeks', { n: m.durationWeeks })}
                      </div>
                    </div>
                  </div>
                  <ol className="ms-steps">
                    {m.steps.map((s, i) => (
                      <li key={i}>{s.label}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {plan.generatedAt && previewWeeks > 0 && (
        <Card title={t('pv.nextTitle')} subtitle={t('pv.nextSub')}>
          <div className="weekplan">
            {Array.from({ length: previewWeeks }, (_, i) => i + 1).map((w) => {
              const acts = actionsForWeek(plan, w)
              if (acts.length === 0) return null
              return (
                <div className="weekplan-row" key={w}>
                  <div className="weekplan-no">{t('grid.week', { n: w })}</div>
                  <ul>
                    {acts.map((a, i) => (
                      <li key={i}>
                        <span className="tag-ic">{METRICS[a.metric]?.icon || '•'}</span> {a.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
