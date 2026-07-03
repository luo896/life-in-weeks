import { useState } from 'react'
import { useStore } from '../store.jsx'
import { Card, Field, Button, Stat } from './ui.jsx'
import { SleepBar } from './Visuals.jsx'
import { sleepHours, todayISO } from '../lib/date.js'

const DIET_TAGS = [
  '常吃夜宵',
  '含糖饮料',
  '不吃早餐',
  '外卖为主',
  '爱吃油炸',
  '蔬菜不足',
  '饮水偏少',
  '咖啡因偏多',
  '常喝酒',
  '吃饭很快',
]

export default function Baseline() {
  const { state, setBaseline } = useStore()
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

  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }))
    setSaved(false)
  }
  const toggleTag = (t) =>
    set({ dietTags: form.dietTags.includes(t) ? form.dietTags.filter((x) => x !== t) : [...form.dietTags, t] })

  const dur = sleepHours(form.bedtime, form.wakeTime)
  const unit = state.profile.weightUnit || 'kg'

  const save = () => {
    setBaseline({ ...form, weightKg: form.weightKg === '' ? '' : Number(form.weightKg) })
    setSaved(true)
  }

  return (
    <div className="stack">
      {/* live visual snapshot of the current state */}
      <Card title="现状一览" subtitle="下面的输入会实时画成你此刻的作息与状态。">
        <div className="stat-row">
          <Stat value={dur != null ? `${dur}h` : '—'} label="每晚睡眠" accent />
          <Stat value={form.weightKg !== '' ? `${form.weightKg}` : '—'} label={`体重 (${unit})`} />
          <Stat value={form.dietTags.length} label="需注意的饮食项" />
          <Stat value={form.exercise ? '有' : '—'} label="运动习惯" />
        </div>
        <div className="viz-label">作息（睡眠时段）</div>
        <SleepBar bedtime={form.bedtime} wakeTime={form.wakeTime} />
        {form.dietTags.length > 0 && (
          <div className="viz-tags">
            {form.dietTags.map((t) => (
              <span key={t} className="chip chip-on chip-static">
                {t}
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card title="现状基线" subtitle="先诚实地记录现在的样子 —— 这是所有改变的起点。可随时更新。">
        <div className="form-grid">
          <Field label="记录日期">
            <input type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
          </Field>
          <Field label="通常入睡时间">
            <input type="time" value={form.bedtime} onChange={(e) => set({ bedtime: e.target.value })} />
          </Field>
          <Field label="通常起床时间" hint={dur != null ? `≈ 每晚睡 ${dur} 小时` : ''}>
            <input type="time" value={form.wakeTime} onChange={(e) => set({ wakeTime: e.target.value })} />
          </Field>
          <Field label={`当前体重（${unit}）`}>
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              placeholder="例如 72.5"
              value={form.weightKg}
              onChange={(e) => set({ weightKg: e.target.value })}
            />
          </Field>
          <Field label="运动频率">
            <input
              type="text"
              placeholder="例如 每周 1 次 / 几乎不运动"
              value={form.exercise}
              onChange={(e) => set({ exercise: e.target.value })}
            />
          </Field>
          <Field label="每日屏幕时间">
            <input
              type="text"
              placeholder="例如 睡前刷手机 1.5 小时"
              value={form.screenTime}
              onChange={(e) => set({ screenTime: e.target.value })}
            />
          </Field>
        </div>

        <Field label="饮食习惯（点选符合你的标签）">
          <div className="chips">
            {DIET_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                className={`chip ${form.dietTags.includes(t) ? 'chip-on' : ''}`}
                onClick={() => toggleTag(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>

        <Field label="饮食备注">
          <textarea
            rows={2}
            placeholder="想多说几句你的饮食现状……"
            value={form.dietNotes}
            onChange={(e) => set({ dietNotes: e.target.value })}
          />
        </Field>

        <Field label="其他想记录的现状">
          <textarea
            rows={2}
            placeholder="精力、情绪、压力、想改掉的其他习惯……"
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </Field>

        <div className="actions">
          <Button onClick={save}>{saved ? '已保存 ✓' : '保存基线'}</Button>
          {state.baseline && <span className="muted">上次记录：{state.baseline.date}</span>}
        </div>
      </Card>
    </div>
  )
}
