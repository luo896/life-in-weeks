import { useState } from 'react'
import { useStore } from './store.jsx'
import { lifeStats } from './lib/date.js'
import { Button, Field } from './components/ui.jsx'
import Onboarding from './components/Onboarding.jsx'
import { LifeGridView } from './components/LifeGrid.jsx'
import Baseline from './components/Baseline.jsx'
import Goals from './components/Goals.jsx'
import Plan from './components/Plan.jsx'
import Log from './components/Log.jsx'
import Progress from './components/Progress.jsx'
import Share from './components/Share.jsx'

const NAV = [
  { key: 'grid', icon: '🗓️', label: '人生周历' },
  { key: 'baseline', icon: '📍', label: '现状基线' },
  { key: 'goals', icon: '🎯', label: '目标' },
  { key: 'plan', icon: '🧭', label: '改善计划' },
  { key: 'log', icon: '✅', label: '打卡' },
  { key: 'progress', icon: '📈', label: '进度' },
  { key: 'share', icon: '🔗', label: '分享' },
]

export default function App() {
  const { state } = useStore()
  const [view, setView] = useState('grid')
  const [settingsOpen, setSettingsOpen] = useState(false)

  if (!state.profile.birthdate) return <Onboarding />

  const stats = lifeStats(state.profile.birthdate, state.profile.lifeExpectancyYears)

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">◳</span>
          <span className="brand-text">人生周历</span>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <button
              key={n.key}
              className={`nav-item ${view === n.key ? 'active' : ''}`}
              onClick={() => setView(n.key)}
            >
              <span className="nav-ic">{n.icon}</span>
              <span className="nav-label">{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <button className="nav-item" onClick={() => setSettingsOpen(true)}>
            <span className="nav-ic">⚙️</span>
            <span className="nav-label">设置</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">{NAV.find((n) => n.key === view)?.label}</div>
          <div className="topbar-right">
            <div className="mini-stat">
              <span className="mini-num">{stats.remaining.toLocaleString()}</span> 周剩余
            </div>
            <div className="mini-bar" title={`生命已走过 ${stats.pct.toFixed(1)}%`}>
              <div style={{ width: `${stats.pct}%` }} />
            </div>
          </div>
        </header>

        <main className={`content ${view === 'grid' && state.profile.gridOrientation === 'landscape' ? 'content-wide' : ''}`}>
          {view === 'grid' && <LifeGridView />}
          {view === 'baseline' && <Baseline />}
          {view === 'goals' && <Goals />}
          {view === 'plan' && <Plan />}
          {view === 'log' && <Log />}
          {view === 'progress' && <Progress />}
          {view === 'share' && <Share />}
        </main>

        <nav className="tabbar">
          {NAV.map((n) => (
            <button
              key={n.key}
              className={`tab ${view === n.key ? 'active' : ''}`}
              onClick={() => setView(n.key)}
            >
              <span className="tab-ic">{n.icon}</span>
              <span className="tab-label">{n.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}

function Settings({ onClose }) {
  const { state, setProfile } = useStore()
  const p = state.profile
  const [form, setForm] = useState({
    name: p.name || '',
    birthdate: p.birthdate || '',
    lifeExpectancyYears: p.lifeExpectancyYears || 90,
    weightUnit: p.weightUnit || 'kg',
  })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const save = () => {
    setProfile({ ...form, lifeExpectancyYears: Number(form.lifeExpectancyYears) || 90 })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>设置</h2>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </header>
        <Field label="名字">
          <input type="text" value={form.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="出生日期">
          <input type="date" value={form.birthdate} onChange={(e) => set({ birthdate: e.target.value })} />
        </Field>
        <Field label="预期寿命（岁）">
          <input
            type="number"
            min="40"
            max="120"
            value={form.lifeExpectancyYears}
            onChange={(e) => set({ lifeExpectancyYears: e.target.value })}
          />
        </Field>
        <Field label="体重单位">
          <select value={form.weightUnit} onChange={(e) => set({ weightUnit: e.target.value })}>
            <option value="kg">kg</option>
            <option value="lb">lb</option>
          </select>
        </Field>
        <div className="actions">
          <Button onClick={save}>保存</Button>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
        </div>
      </div>
    </div>
  )
}
