import { useState } from 'react'
import { useStore } from '../store.jsx'
import { Card, Field, Button, Empty } from './ui.jsx'
import { GapBar } from './Visuals.jsx'
import { METRICS } from '../lib/plan.js'
import { latest } from '../lib/stats.js'

const BLANK = { metric: 'bedtime', current: '', target: '', unit: 'kg', targetDate: '', pace: '', weeks: 8 }

export default function Goals() {
  const { state, addGoal, removeGoal } = useStore()
  const b = state.baseline || {}
  const [form, setForm] = useState(BLANK)

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  // When picking a metric, prefill "current" from the baseline where we can.
  const pickMetric = (metric) => {
    let current = ''
    if (metric === 'bedtime') current = b.bedtime || ''
    else if (metric === 'wakeTime') current = b.wakeTime || ''
    else if (metric === 'weight') current = b.weightKg ?? ''
    setForm({ ...BLANK, metric, current, unit: state.profile.weightUnit || 'kg' })
  }

  const canAdd = () => {
    if (form.metric === 'habit') return !!form.target.trim()
    return form.current !== '' && form.target !== ''
  }

  const add = () => {
    if (!canAdd()) return
    const goal = { metric: form.metric, targetDate: form.targetDate }
    if (form.metric === 'habit') {
      goal.target = form.target.trim()
      goal.weeks = Number(form.weeks) || 8
    } else if (form.metric === 'weight') {
      goal.current = form.current
      goal.target = form.target
      goal.unit = form.unit || 'kg'
      goal.pace = form.pace
    } else {
      goal.current = form.current
      goal.target = form.target
    }
    addGoal(goal)
    pickMetric(form.metric)
  }

  const m = METRICS[form.metric]

  // latest actual values to show "where you are now" on each goal.
  const actual = {
    weight: latest(state.logs, 'weightKg'),
    bedtime: latest(state.logs, 'bedtime'),
    wakeTime: latest(state.logs, 'wakeTime'),
  }

  return (
    <div className="stack">
      <Card title="设定目标" subtitle="你希望变成什么样？给每个目标一个清晰的数字和期限。">
        <Field label="目标类型">
          <div className="seg">
            {Object.entries(METRICS).map(([k, v]) => (
              <button
                key={k}
                type="button"
                className={`seg-btn ${form.metric === k ? 'seg-on' : ''}`}
                onClick={() => pickMetric(k)}
              >
                {v.icon} {v.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="form-grid">
          {form.metric === 'habit' ? (
            <>
              <Field label="想养成 / 改掉的习惯">
                <input
                  type="text"
                  placeholder="例如 戒掉睡前刷手机"
                  value={form.target}
                  onChange={(e) => set({ target: e.target.value })}
                />
              </Field>
              <Field label="计划周期（周）">
                <input type="number" min="1" value={form.weeks} onChange={(e) => set({ weeks: e.target.value })} />
              </Field>
            </>
          ) : m.kind === 'time' ? (
            <>
              <Field label="现状">
                <input type="time" value={form.current} onChange={(e) => set({ current: e.target.value })} />
              </Field>
              <Field label="目标">
                <input type="time" value={form.target} onChange={(e) => set({ target: e.target.value })} />
              </Field>
            </>
          ) : (
            <>
              <Field label={`现状（${form.unit}）`}>
                <input
                  type="number"
                  step="0.1"
                  value={form.current}
                  onChange={(e) => set({ current: e.target.value })}
                />
              </Field>
              <Field label={`目标（${form.unit}）`}>
                <input
                  type="number"
                  step="0.1"
                  value={form.target}
                  onChange={(e) => set({ target: e.target.value })}
                />
              </Field>
              <Field label="每周节奏" hint="留空则用安全默认 0.5 kg/周">
                <input
                  type="number"
                  step="0.1"
                  placeholder="0.5"
                  value={form.pace}
                  onChange={(e) => set({ pace: e.target.value })}
                />
              </Field>
            </>
          )}
          <Field label="期望达成日期（可选）">
            <input type="date" value={form.targetDate} onChange={(e) => set({ targetDate: e.target.value })} />
          </Field>
        </div>

        <div className="actions">
          <Button onClick={add} disabled={!canAdd()}>
            + 添加目标
          </Button>
          {!state.baseline && <span className="muted">提示：先填「现状基线」可自动带入当前值。</span>}
        </div>
      </Card>

      <Card title={`我的目标（${state.goals.length}）`} subtitle="进度条显示「现状 → 最近打卡 → 目标」，一眼看出还差多少。">
        {state.goals.length === 0 ? (
          <Empty icon="🎯">还没有目标。先添加一个，下一步就能生成改善计划。</Empty>
        ) : (
          <ul className="goal-list">
            {state.goals.map((g) => {
              const mm = METRICS[g.metric] || {}
              const cur = actual[g.metric] ?? g.current
              const showBar = g.metric === 'weight' || g.metric === 'bedtime' || g.metric === 'wakeTime'
              return (
                <li key={g.id} className="goal-item goal-item-viz">
                  <div className="goal-row">
                    <span className="goal-ic">{mm.icon}</span>
                    <div className="goal-main">
                      <div className="goal-title">{mm.label}</div>
                      <div className="goal-detail">
                        {g.metric === 'habit'
                          ? `${g.target} · ${g.weeks || 8} 周`
                          : `${g.current ?? '—'} → ${g.target ?? '—'} ${g.unit && g.metric === 'weight' ? g.unit : ''}`}
                        {g.targetDate ? ` · 期望 ${g.targetDate}` : ''}
                      </div>
                    </div>
                    <button className="icon-btn" title="删除" onClick={() => removeGoal(g.id)}>
                      ✕
                    </button>
                  </div>
                  {showBar && (
                    <GapBar
                      kind={g.metric === 'weight' ? 'number' : 'time'}
                      from={g.current}
                      to={g.target}
                      current={cur}
                      unit={g.metric === 'weight' ? g.unit || 'kg' : ''}
                    />
                  )}
                  {g.metric === 'habit' && <div className="goal-habit-chip">进行中 · {g.weeks || 8} 周养成计划</div>}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
