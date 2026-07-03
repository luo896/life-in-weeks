import { useStore } from '../store.jsx'
import { Card, Button, Empty } from './ui.jsx'
import { generatePlan, METRICS, actionsForWeek } from '../lib/plan.js'

export default function Plan() {
  const { state, setPlan } = useStore()
  const { goals, plan, baseline } = state

  const regenerate = () => setPlan(generatePlan(baseline, goals))

  const longest = Math.max(0, ...(plan.milestones || []).map((m) => m.durationWeeks || 0))
  const previewWeeks = Math.min(longest, 6)

  return (
    <div className="stack">
      <Card
        title="改善计划"
        subtitle="把目标拆成可执行的每周小步。计划会以彩色色带画在「人生周历」未来的格子上。"
        right={
          <Button onClick={regenerate} disabled={goals.length === 0}>
            {plan.generatedAt ? '重新生成' : '生成计划'}
          </Button>
        }
      >
        {goals.length === 0 ? (
          <Empty icon="🧭">先去「目标」添加至少一个目标，再回来生成计划。</Empty>
        ) : !plan.generatedAt ? (
          <Empty icon="✨">点右上角「生成计划」，根据现状与目标自动排出循序渐进的方案。</Empty>
        ) : (
          <>
            <p className="muted">
              生成于 {new Date(plan.generatedAt).toLocaleString('zh-CN')} · 共 {plan.milestones.length} 个里程碑
            </p>
            <div className="ms-grid">
              {plan.milestones.map((m, idx) => (
                <div className="ms-card" key={m.id} style={{ '--ms': PLAN_COLORS[idx % PLAN_COLORS.length] }}>
                  <div className="ms-top">
                    <span className="ms-ic">{METRICS[m.metric]?.icon || '🎯'}</span>
                    <div>
                      <div className="ms-title">{m.title}</div>
                      <div className="ms-meta">
                        {m.perWeek} · 约 {m.durationWeeks} 周
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
        <Card title="接下来几周做什么" subtitle="把每周的小目标汇总到一起，照着做就好。">
          <div className="weekplan">
            {Array.from({ length: previewWeeks }, (_, i) => i + 1).map((w) => {
              const acts = actionsForWeek(plan, w)
              if (acts.length === 0) return null
              return (
                <div className="weekplan-row" key={w}>
                  <div className="weekplan-no">第 {w} 周</div>
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

const PLAN_COLORS = ['#f59e0b', '#60a5fa', '#f472b6', '#a78bfa', '#22d3ee', '#fb7185']
