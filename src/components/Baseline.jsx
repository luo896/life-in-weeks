import { useState } from 'react'
import { useStore } from '../store.jsx'
import { useI18n } from '../lib/i18n.jsx'
import { Card, Field, Button, Stat, EvidenceHint } from './ui.jsx'
import { SleepBar } from './Visuals.jsx'
import { sleepHours, todayISO } from '../lib/date.js'
import { bmi, bmiBandAsia, whtr } from '../lib/health.js'

export default function Baseline() {
  const { state, setBaseline } = useStore()
  const { t } = useI18n()
  const init = state.baseline || {}
  const [form, setForm] = useState({
    date: init.date || todayISO(),
    bedtime: init.bedtime || '00:30',
    wakeTime: init.wakeTime || '08:00',
    weightKg: init.weightKg ?? '',
    heightCm: init.heightCm ?? '',
    waistCm: init.waistCm ?? '',
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
  // BMI/腰高比只在公制体重下计算（lb 用户暂不换算，显示 —）
  const bmiVal = unit === 'kg' ? bmi(form.weightKg, form.heightCm) : null
  const bmiBand = bmiBandAsia(bmiVal)
  const whtrVal = whtr(form.waistCm, form.heightCm)

  const save = () => {
    setBaseline({
      ...form,
      weightKg: form.weightKg === '' ? '' : Number(form.weightKg),
      heightCm: form.heightCm === '' ? '' : Number(form.heightCm),
      waistCm: form.waistCm === '' ? '' : Number(form.waistCm),
    })
    setSaved(true)
  }

  return (
    <div className="stack">
      {/* live visual snapshot of the current state */}
      <Card title={t('b.overviewTitle')} subtitle={t('b.overviewSub')}>
        <div className="stat-row">
          <Stat value={dur != null ? `${dur}h` : '—'} label={t('b.sleepPerNight')} accent />
          <Stat value={form.weightKg !== '' ? `${form.weightKg}` : '—'} label={t('b.weightLabel', { u: unit })} />
          <Stat value={bmiVal != null ? `${bmiVal}` : '—'} label={bmiBand ? `BMI · ${t(`bmi.${bmiBand}`)}` : 'BMI'} />
          <Stat
            value={whtrVal != null ? `${whtrVal}` : '—'}
            label={whtrVal != null ? `${t('b.whtr')} · ${t(whtrVal < 0.5 ? 'whtr.ok' : 'whtr.high')}` : t('b.whtr')}
          />
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
          <EvidenceHint k="sleep" />
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
          <Field label={t('b.height')}>
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              placeholder="170"
              value={form.heightCm}
              onChange={(e) => set({ heightCm: e.target.value })}
            />
          </Field>
          <Field label={t('b.waist')}>
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              placeholder="80"
              value={form.waistCm}
              onChange={(e) => set({ waistCm: e.target.value })}
            />
          </Field>
          <EvidenceHint k="weight" />
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
          <EvidenceHint k="activity" />
          <EvidenceHint k="screen" />
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

        <EvidenceHint k="diet" />

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
