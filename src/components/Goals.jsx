import { useState } from 'react'
import { useStore } from '../store.jsx'
import { useI18n } from '../lib/i18n.jsx'
import { Card, Field, Button, Empty, EvidenceHint } from './ui.jsx'
import { GapBar } from './Visuals.jsx'
import { METRICS } from '../lib/plan.js'
import { latest } from '../lib/stats.js'

const BLANK = { metric: 'bedtime', current: '', target: '', unit: 'kg', targetDate: '', pace: '', weeks: 8, expAge: '', why: '' }

export default function Goals() {
  const { state, addGoal, removeGoal } = useStore()
  const { t } = useI18n()
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
    if (form.metric === 'habit' || form.metric === 'experience') return !!form.target.trim()
    return form.current !== '' && form.target !== ''
  }

  // 「希望在 N 岁前」→ 具体日期（出生日期 + N 年）
  const ageToDate = (age) => {
    if (!age || !state.profile.birthdate) return ''
    const d = new Date(state.profile.birthdate)
    d.setFullYear(d.getFullYear() + Number(age))
    return d.toISOString().slice(0, 10)
  }

  const add = () => {
    if (!canAdd()) return
    const goal = { metric: form.metric, targetDate: form.targetDate }
    if (form.metric === 'experience') {
      goal.kind = 'experience'
      goal.target = form.target.trim()
      goal.why = form.why.trim()
      goal.targetDate = form.expAge ? ageToDate(form.expAge) : form.targetDate
    } else if (form.metric === 'habit') {
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
      <Card title={t('g.title')} subtitle={t('g.sub')}>
        <Field label={t('g.type')}>
          <div className="seg">
            {Object.entries(METRICS).map(([k, v]) => (
              <button
                key={k}
                type="button"
                className={`seg-btn ${form.metric === k ? 'seg-on' : ''}`}
                onClick={() => pickMetric(k)}
              >
                {v.icon} {t(v.labelKey)}
              </button>
            ))}
            <button
              type="button"
              className={`seg-btn ${form.metric === 'experience' ? 'seg-on' : ''}`}
              onClick={() => pickMetric('experience')}
            >
              ✨ {t('g.expType')}
            </button>
          </div>
        </Field>

        <div className="form-grid">
          {form.metric === 'experience' ? (
            <>
              <Field label={t('g.expTitle')}>
                <input
                  type="text"
                  placeholder={t('g.expTitlePh')}
                  value={form.target}
                  onChange={(e) => set({ target: e.target.value })}
                />
              </Field>
              <Field label={t('g.expAge')}>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={form.expAge}
                  onChange={(e) => set({ expAge: e.target.value })}
                />
              </Field>
              <Field label={t('g.expWhy')}>
                <input
                  type="text"
                  placeholder={t('g.expWhyPh')}
                  value={form.why}
                  onChange={(e) => set({ why: e.target.value })}
                />
              </Field>
              <EvidenceHint k="experience" />
            </>
          ) : form.metric === 'habit' ? (
            <>
              <Field label={t('g.habitLabel')}>
                <input
                  type="text"
                  placeholder={t('g.habitPh')}
                  value={form.target}
                  onChange={(e) => set({ target: e.target.value })}
                />
              </Field>
              <Field label={t('g.weeks')}>
                <input type="number" min="1" value={form.weeks} onChange={(e) => set({ weeks: e.target.value })} />
              </Field>
              <EvidenceHint k="habit" />
            </>
          ) : m.kind === 'time' ? (
            <>
              <Field label={t('g.current')}>
                <input type="time" value={form.current} onChange={(e) => set({ current: e.target.value })} />
              </Field>
              <Field label={t('g.target')}>
                <input type="time" value={form.target} onChange={(e) => set({ target: e.target.value })} />
              </Field>
            </>
          ) : (
            <>
              <Field label={t('g.currentU', { u: form.unit })}>
                <input
                  type="number"
                  step="0.1"
                  value={form.current}
                  onChange={(e) => set({ current: e.target.value })}
                />
              </Field>
              <Field label={t('g.targetU', { u: form.unit })}>
                <input
                  type="number"
                  step="0.1"
                  value={form.target}
                  onChange={(e) => set({ target: e.target.value })}
                />
              </Field>
              <Field label={t('g.pace')} hint={t('g.paceHint')}>
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
          {form.metric !== 'experience' && (
            <Field label={t('g.date')}>
              <input type="date" value={form.targetDate} onChange={(e) => set({ targetDate: e.target.value })} />
            </Field>
          )}
        </div>

        <div className="actions">
          <Button onClick={add} disabled={!canAdd()}>
            {t('g.add')}
          </Button>
          {!state.baseline && <span className="muted">{t('g.baselineTip')}</span>}
        </div>
      </Card>

      <Card title={t('g.mine', { n: state.goals.length })} subtitle={t('g.mineSub')}>
        {state.goals.length === 0 ? (
          <Empty icon="🎯">{t('g.empty')}</Empty>
        ) : (
          <ul className="goal-list">
            {state.goals.map((g) => {
              const mm = METRICS[g.metric] || {}
              const cur = actual[g.metric] ?? g.current
              const showBar = g.metric === 'weight' || g.metric === 'bedtime' || g.metric === 'wakeTime'
              return (
                <li key={g.id} className="goal-item goal-item-viz">
                  <div className="goal-row">
                    <span className="goal-ic">{g.metric === 'experience' ? '✨' : mm.icon}</span>
                    <div className="goal-main">
                      <div className="goal-title">
                        {g.metric === 'experience' ? g.target : mm.labelKey ? t(mm.labelKey) : g.metric}
                      </div>
                      <div className="goal-detail">
                        {g.metric === 'experience'
                          ? g.why || t('g.expDetail')
                          : g.metric === 'habit'
                            ? `${g.target} · ${g.weeks || 8}w`
                            : `${g.current ?? '—'} → ${g.target ?? '—'} ${g.unit && g.metric === 'weight' ? g.unit : ''}`}
                        {g.targetDate ? ` · ${t('g.expect', { d: g.targetDate })}` : ''}
                      </div>
                    </div>
                    <button className="icon-btn" title={t('common.delete')} onClick={() => removeGoal(g.id)}>
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
                  {g.metric === 'habit' && <div className="goal-habit-chip">{t('g.habitChip', { w: g.weeks || 8 })}</div>}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
