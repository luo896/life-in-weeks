import { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { useI18n } from '../lib/i18n.jsx'
import { Card, Field, Button, Empty } from './ui.jsx'
import { todayISO, sleepHours } from '../lib/date.js'
import { computeStreak } from '../lib/stats.js'

const MOODS = ['😣', '🙁', '😐', '🙂', '😄']

export default function Log() {
  const { state, addLog, removeLog } = useStore()
  const { t } = useI18n()

  // Checklist items derive from the plan; fall back to sensible defaults.
  const checklist = useMemo(() => {
    const fromPlan = (state.plan.milestones || []).map((m) => m.title)
    return fromPlan.length ? fromPlan : [t('l.def1'), t('l.def2'), t('l.def3')]
  }, [state.plan, t])

  const todays = state.logs.find((l) => l.date === todayISO())
  const [form, setForm] = useState(() => ({
    date: todayISO(),
    bedtime: todays?.bedtime || state.baseline?.bedtime || '',
    wakeTime: todays?.wakeTime || state.baseline?.wakeTime || '',
    weightKg: todays?.weightKg ?? '',
    adherence: todays?.adherence || {},
    mood: todays?.mood || '',
    note: todays?.note || '',
  }))
  const [justSaved, setJustSaved] = useState(false)

  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }))
    setJustSaved(false)
  }
  const toggle = (key) => set({ adherence: { ...form.adherence, [key]: !form.adherence[key] } })

  // Loading an existing date's entry into the form.
  const loadDate = (date) => {
    const l = state.logs.find((x) => x.date === date)
    setForm({
      date,
      bedtime: l?.bedtime || state.baseline?.bedtime || '',
      wakeTime: l?.wakeTime || state.baseline?.wakeTime || '',
      weightKg: l?.weightKg ?? '',
      adherence: l?.adherence || {},
      mood: l?.mood || '',
      note: l?.note || '',
    })
    setJustSaved(false)
  }

  const save = () => {
    addLog({ ...form, weightKg: form.weightKg === '' ? '' : Number(form.weightKg) })
    setJustSaved(true)
  }

  const dur = sleepHours(form.bedtime, form.wakeTime)
  const streak = computeStreak(state.logs)
  const recent = [...state.logs].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 14)

  return (
    <div className="stack">
      <Card
        title={t('l.title')}
        subtitle={t('l.sub')}
        right={streak > 0 ? <div className="streak">{t('l.streak', { n: streak })}</div> : null}
      >
        <div className="form-grid">
          <Field label={t('l.date')}>
            <input type="date" value={form.date} max={todayISO()} onChange={(e) => loadDate(e.target.value)} />
          </Field>
          <Field label={t('l.bed')}>
            <input type="time" value={form.bedtime} onChange={(e) => set({ bedtime: e.target.value })} />
          </Field>
          <Field label={t('l.wake')} hint={dur != null ? t('l.slept', { h: dur }) : ''}>
            <input type="time" value={form.wakeTime} onChange={(e) => set({ wakeTime: e.target.value })} />
          </Field>
          <Field label={t('l.weight', { u: state.profile.weightUnit || 'kg' })}>
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              value={form.weightKg}
              onChange={(e) => set({ weightKg: e.target.value })}
            />
          </Field>
        </div>

        <Field label={t('l.doneQ')}>
          <div className="checks">
            {checklist.map((item) => (
              <button
                key={item}
                type="button"
                className={`check ${form.adherence[item] ? 'check-on' : ''}`}
                onClick={() => toggle(item)}
              >
                <span className="check-box">{form.adherence[item] ? '✓' : ''}</span> {item}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t('l.mood')}>
          <div className="moods">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                className={`mood ${form.mood === m ? 'mood-on' : ''}`}
                onClick={() => set({ mood: m })}
              >
                {m}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t('l.note')}>
          <textarea
            rows={2}
            placeholder={t('l.notePh')}
            value={form.note}
            onChange={(e) => set({ note: e.target.value })}
          />
        </Field>

        <div className="actions">
          <Button onClick={save}>{justSaved ? t('l.saved') : t('l.save')}</Button>
        </div>
      </Card>

      <Card title={t('l.recent')}>
        {recent.length === 0 ? (
          <Empty icon="📅">{t('l.empty')}</Empty>
        ) : (
          <ul className="log-list">
            {recent.map((l) => {
              const d = sleepHours(l.bedtime, l.wakeTime)
              const done = l.adherence ? Object.values(l.adherence).filter(Boolean).length : 0
              return (
                <li key={l.id} className="log-item">
                  <button className="log-date" onClick={() => loadDate(l.date)} title={t('l.editTitle')}>
                    {l.date}
                  </button>
                  <span className="log-mood">{l.mood}</span>
                  <span className="log-bits">
                    {d != null && <em>😴 {d}h</em>}
                    {l.weightKg !== '' && l.weightKg != null && <em>⚖️ {l.weightKg}</em>}
                    {done > 0 && <em>✅ {done}</em>}
                  </span>
                  <span className="log-note">{l.note}</span>
                  <button className="icon-btn" title={t('common.delete')} onClick={() => removeLog(l.id)}>
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
