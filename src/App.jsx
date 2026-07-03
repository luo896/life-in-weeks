import { useEffect, useState } from 'react'
import { useStore } from './store.jsx'
import { lifeStats } from './lib/date.js'
import { useI18n, LANGS } from './lib/i18n.jsx'
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
  { key: 'grid', icon: '🗓️', labelKey: 'nav.grid' },
  { key: 'baseline', icon: '📍', labelKey: 'nav.baseline' },
  { key: 'goals', icon: '🎯', labelKey: 'nav.goals' },
  { key: 'plan', icon: '🧭', labelKey: 'nav.plan' },
  { key: 'log', icon: '✅', labelKey: 'nav.log' },
  { key: 'progress', icon: '📈', labelKey: 'nav.progress' },
  { key: 'share', icon: '🔗', labelKey: 'nav.share' },
]

export default function App() {
  const { state } = useStore()
  const { t, lang } = useI18n()
  const [view, setView] = useState('grid')
  const [settingsOpen, setSettingsOpen] = useState(false)

  // keep the tab title & html lang in sync with the active language
  useEffect(() => {
    document.title = t('app.title')
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
  }, [t, lang])

  if (!state.profile.birthdate) return <Onboarding />

  const stats = lifeStats(state.profile.birthdate, state.profile.lifeExpectancyYears)

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">◳</span>
          <span className="brand-text">{t('app.brand')}</span>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <button
              key={n.key}
              className={`nav-item ${view === n.key ? 'active' : ''}`}
              onClick={() => setView(n.key)}
            >
              <span className="nav-ic">{n.icon}</span>
              <span className="nav-label">{t(n.labelKey)}</span>
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <button className="nav-item" onClick={() => setSettingsOpen(true)}>
            <span className="nav-ic">⚙️</span>
            <span className="nav-label">{t('nav.settings')}</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">{t(NAV.find((n) => n.key === view)?.labelKey)}</div>
          <div className="topbar-right">
            <div className="mini-stat">
              <span className="mini-num">{stats.remaining.toLocaleString()}</span> {t('topbar.weeksLeft')}
            </div>
            <div className="mini-bar" title={t('topbar.lifeUsed', { p: stats.pct.toFixed(1) })}>
              <div style={{ width: `${stats.pct}%` }} />
            </div>
          </div>
        </header>

        <main className={`content ${view === 'grid' ? 'content-wide' : ''}`}>
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
              <span className="tab-label">{t(n.labelKey)}</span>
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
  const { t } = useI18n()
  const p = state.profile
  const [form, setForm] = useState({
    name: p.name || '',
    birthdate: p.birthdate || '',
    lifeExpectancyYears: p.lifeExpectancyYears || 90,
    weightUnit: p.weightUnit || 'kg',
    lang: p.lang || '',
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
          <h2>{t('settings.title')}</h2>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </header>
        <Field label={t('settings.name')}>
          <input type="text" value={form.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label={t('settings.birthdate')}>
          <input type="date" value={form.birthdate} onChange={(e) => set({ birthdate: e.target.value })} />
        </Field>
        <Field label={t('settings.lifeExpectancy')}>
          <input
            type="number"
            min="40"
            max="120"
            value={form.lifeExpectancyYears}
            onChange={(e) => set({ lifeExpectancyYears: e.target.value })}
          />
        </Field>
        <Field label={t('settings.weightUnit')}>
          <select value={form.weightUnit} onChange={(e) => set({ weightUnit: e.target.value })}>
            <option value="kg">kg</option>
            <option value="lb">lb</option>
          </select>
        </Field>
        <Field label={t('settings.language')}>
          <select value={form.lang} onChange={(e) => set({ lang: e.target.value })}>
            {LANGS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.labelKey ? t(l.labelKey) : l.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="actions">
          <Button onClick={save}>{t('settings.save')}</Button>
          <Button variant="ghost" onClick={onClose}>
            {t('settings.cancel')}
          </Button>
        </div>
      </div>
    </div>
  )
}
