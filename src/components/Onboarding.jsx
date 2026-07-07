import { useState } from 'react'
import { useStore } from '../store.jsx'
import { useI18n } from '../lib/i18n.jsx'
import { useSync } from '../lib/sync.jsx'
import { Button, Field } from './ui.jsx'
import { lifeStats } from '../lib/date.js'

export default function Onboarding() {
  const { setProfile } = useStore()
  const { t, lang } = useI18n()
  const { login, loggedIn, status } = useSync()
  const [name, setName] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [years, setYears] = useState(90)

  const preview = birthdate ? lifeStats(birthdate, years) : null

  const start = () => {
    if (!birthdate) return
    setProfile({ name: name.trim(), birthdate, lifeExpectancyYears: Number(years) || 90 })
  }

  return (
    <div className="onboard">
      <div className="onboard-card">
        <div className="onboard-lang orient-toggle">
          <button className={`ot-btn ${lang === 'zh' ? 'on' : ''}`} onClick={() => setProfile({ lang: 'zh' })}>
            中文
          </button>
          <button className={`ot-btn ${lang === 'en' ? 'on' : ''}`} onClick={() => setProfile({ lang: 'en' })}>
            EN
          </button>
          <button className={`ot-btn ${lang === 'ja' ? 'on' : ''}`} onClick={() => setProfile({ lang: 'ja' })}>
            日本語
          </button>
        </div>
        <div className="onboard-grid" aria-hidden>
          {Array.from({ length: 96 }, (_, i) => (
            <span key={i} className={`ob-cell ${i < 34 ? 'on' : i === 34 ? 'now' : ''}`} />
          ))}
        </div>
        <h1>{t('app.brand')}</h1>
        <p className="onboard-lead">
          {t('ob.lead1')}
          <br />
          {t('ob.lead2')}
        </p>

        <Field label={t('ob.name')}>
          <input type="text" value={name} placeholder={t('ob.namePh')} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t('ob.birth')}>
          <input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
        </Field>
        <Field label={t('ob.life')} hint={t('ob.lifeHint')}>
          <input type="number" min="40" max="120" value={years} onChange={(e) => setYears(e.target.value)} />
        </Field>

        {preview?.ok && (
          <div className="onboard-preview">
            {t('ob.preview', { lived: preview.lived.toLocaleString(), remaining: preview.remaining.toLocaleString() })}
          </div>
        )}

        <Button onClick={start} disabled={!birthdate} className="block">
          {t('ob.start')}
        </Button>
        <p className="onboard-foot">{t('ob.privacy')}</p>
        {loggedIn && status === 'syncing' ? (
          <p className="onboard-foot">{t('sync.status.syncing')}</p>
        ) : (
          <button className="onboard-login" onClick={login}>
            {t('auth.onboardLogin')}
          </button>
        )}
        <a
          className="onboard-about"
          href={`${import.meta.env.BASE_URL}about.html`}
          target="_blank"
          rel="noreferrer"
        >
          {t('ob.about')}
        </a>
      </div>
    </div>
  )
}
