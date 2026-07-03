import { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { Card, Field, Button, Empty } from './ui.jsx'
import { todayISO, sleepHours } from '../lib/date.js'
import { computeStreak } from '../lib/stats.js'

const MOODS = ['😣', '🙁', '😐', '🙂', '😄']

export default function Log() {
  const { state, addLog, removeLog } = useStore()

  // Checklist items derive from the plan; fall back to sensible defaults.
  const checklist = useMemo(() => {
    const fromPlan = (state.plan.milestones || []).map((m) => m.title)
    return fromPlan.length ? fromPlan : ['按计划作息', '健康饮食', '今日运动']
  }, [state.plan])

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
        title="今日打卡"
        subtitle="每天花一分钟，记录真实发生的事。坚持本身就是改变。"
        right={streak > 0 ? <div className="streak">🔥 {streak} 天连续</div> : null}
      >
        <div className="form-grid">
          <Field label="日期">
            <input type="date" value={form.date} max={todayISO()} onChange={(e) => loadDate(e.target.value)} />
          </Field>
          <Field label="实际入睡">
            <input type="time" value={form.bedtime} onChange={(e) => set({ bedtime: e.target.value })} />
          </Field>
          <Field label="实际起床" hint={dur != null ? `睡了 ${dur} 小时` : ''}>
            <input type="time" value={form.wakeTime} onChange={(e) => set({ wakeTime: e.target.value })} />
          </Field>
          <Field label={`体重（${state.profile.weightUnit || 'kg'}）`}>
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              value={form.weightKg}
              onChange={(e) => set({ weightKg: e.target.value })}
            />
          </Field>
        </div>

        <Field label="今天完成了哪些？">
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

        <Field label="今日心情">
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

        <Field label="备注">
          <textarea
            rows={2}
            placeholder="今天的感受、困难或小胜利……"
            value={form.note}
            onChange={(e) => set({ note: e.target.value })}
          />
        </Field>

        <div className="actions">
          <Button onClick={save}>{justSaved ? '已保存 ✓' : '保存今日记录'}</Button>
        </div>
      </Card>

      <Card title="最近记录">
        {recent.length === 0 ? (
          <Empty icon="📅">还没有记录。完成上面的打卡，这里会出现你的足迹。</Empty>
        ) : (
          <ul className="log-list">
            {recent.map((l) => {
              const d = sleepHours(l.bedtime, l.wakeTime)
              const done = l.adherence ? Object.values(l.adherence).filter(Boolean).length : 0
              return (
                <li key={l.id} className="log-item">
                  <button className="log-date" onClick={() => loadDate(l.date)} title="点击载入编辑">
                    {l.date}
                  </button>
                  <span className="log-mood">{l.mood}</span>
                  <span className="log-bits">
                    {d != null && <em>😴 {d}h</em>}
                    {l.weightKg !== '' && l.weightKg != null && <em>⚖️ {l.weightKg}</em>}
                    {done > 0 && <em>✅ {done}</em>}
                  </span>
                  <span className="log-note">{l.note}</span>
                  <button className="icon-btn" title="删除" onClick={() => removeLog(l.id)}>
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
