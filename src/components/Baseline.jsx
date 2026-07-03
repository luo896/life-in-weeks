import { useState } from 'react'
import { useStore } from '../store.jsx'
import { useI18n } from '../lib/i18n.jsx'
import { Card, Field, Button, Stat } from './ui.jsx'
import { SleepBar } from './Visuals.jsx'
import { sleepHours, todayISO } from '../lib/date.js'

export default function Baseline() {
  const { state, setBaseline } = useStore()
  const { t } = useI18n()
  const init = state.baseline || {}
  const [form, setForm] = useState({
    date: init.date || todayISO(),
    bedtime: init.bedtime || '00:30',
    wakeTime: init.wakeTime || '08:00',
    weightKg: init.weightKg ?? '',
    dietTags: init.dietTags || [],
    dietNotes: init.dietNotes || '',
    exercise: init.exercise || '',
    screenTime: init.screenTime || '',
    mood: init.mood || '',
    notes: init.notes || '',
  })
  const [saved, setSaved] = useState(false)

  const DIET_TAGS = t('diet.tags')

  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }))
    setSaved(false)
  }
  const toggleTag = (tag) =>
    set({ dietTags: form.dietTags.includes(tag) ? form.dietTags.filter((x) => x !== tag) : [...form.dietTags, tag] })

  const dur = sleepHours(form.bedtime, form.wakeTime)
  const unit = state.profile.weightUnit || 'kg'

  const save = () => {
    setBaseline({ ...form, weightKg: form.weightKg === '' ? '' : Number(form.weightKg) })
    setSaved(true)
  }

  return (
    <div className="stack">
      {/* live visual snapshot of the current state */}
      <Card title={t('b.overviewTitle')} subtitle={t('b.overviewSub')}>
        <div className="stat-row">
          <Stat value={dur != null ? `${dur}h` : '—'} label={t('b.sleepPerNight')} accent />
          <Stat value={form.weightKg !== '' ? `${form.weightKg}` : '—'} label={t('b.weightLabel', { u: unit })} />
          <Stat value={form.dietTags.length} label={t('b.dietFlags')} />
          <Stat value={form.exercise ? t('b.yes') : '—'} label={t('b.exerciseHabit')} />
        </div>
        <div className="viz-label">{t('b.sleepViz')}</div>
        <SleepBar bedtime={form.bedtime} wakeTime={form.wakeTime} />
        {form.dietTags.length > 0 && (
          <div className="viz-tags">
            {form.dietTags.map((tag) => (
              <span key={tag} className="chip chip-on chip-static">
                {tag}
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card title={t('b.title')} subtitle={t('b.sub')}>
        <div className="form-grid">
          <Field label={t('b.date')}>
            <input type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
          </Field>
          <Field label={t('b.bedtime')}>
            <input type="time" value={form.bedtime} onChange={(e) => set({ bedtime: e.target.value })} />
          </Field>
          <Field label={t('b.wake')} hint={dur != null ? t('b.sleepHint', { h: dur }) : ''}>
            <input type="time" value={form.wakeTime} onChange={(e) => set({ wakeTime: e.target.value })} />
          </Field>
          <Field label={t('b.weight', { u: unit })}>
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              placeholder={t('b.weightPh')}
              value={form.weightKg}
              onChange={(e) => set({ weightKg: e.target.value })}
            />
          </Field>
          <Field label={t('b.exercise')}>
            <input
              type="text"
              placeholder={t('b.exercisePh')}
              value={form.exercise}
              onChange={(e) => set({ exercise: e.target.value })}
            />
          </Field>
          <Field label={t('b.screen')}>
            <input
              type="text"
              placeholder={t('b.screenPh')}
              value={form.screenTime}
              onChange={(e) => set({ screenTime: e.target.value })}
            />
          </Field>
        </div>

        <Field label={t('b.dietTags')}>
          <div className="chips">
            {DIET_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`chip ${form.dietTags.includes(tag) ? 'chip-on' : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t('b.dietNotes')}>
          <textarea
            rows={2}
            placeholder={t('b.dietNotesPh')}
            value={form.dietNotes}
            onChange={(e) => set({ dietNotes: e.target.value })}
          />
        </Field>

        <Field label={t('b.other')}>
          <textarea
            rows={2}
            placeholder={t('b.otherPh')}
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </Field>

        <div className="actions">
          <Button onClick={save}>{saved ? t('b.saved') : t('b.save')}</Button>
          {state.baseline && <span className="muted">{t('b.last', { d: state.baseline.date })}</span>}
        </div>
      </Card>
    </div>
  )
}
