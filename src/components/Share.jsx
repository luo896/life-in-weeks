import { useRef, useState } from 'react'
import { useStore } from '../store.jsx'
import { useI18n } from '../lib/i18n.jsx'
import { Card, Button } from './ui.jsx'
import { exportJSON, readJSONFile, exportShareCard, exportReport } from '../lib/share.js'

export default function Share() {
  const { state, importData, resetData } = useStore()
  const { t } = useI18n()
  const fileRef = useRef(null)
  const [msg, setMsg] = useState('')

  const flash = (text) => {
    setMsg(text)
    setTimeout(() => setMsg(''), 2600)
  }

  const onImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await readJSONFile(file)
      if (!data || typeof data !== 'object') throw new Error('bad format')
      if (!confirm(t('s.confirmImport'))) return
      importData(data)
      flash(t('s.imported'))
    } catch {
      flash(t('s.importFail'))
    } finally {
      e.target.value = ''
    }
  }

  const reset = () => {
    if (confirm(t('s.confirmReset'))) {
      resetData()
      flash(t('s.resetDone'))
    }
  }

  return (
    <div className="stack">
      <Card title={t('s.title')} subtitle={t('s.sub')}>
        <div className="share-grid">
          <div className="share-tile" onClick={() => exportShareCard(state)}>
            <div className="share-ic">🖼️</div>
            <div className="share-name">{t('s.cardName')}</div>
            <div className="share-desc">{t('s.cardDesc')}</div>
          </div>
          <div className="share-tile" onClick={() => exportReport(state)}>
            <div className="share-ic">📄</div>
            <div className="share-name">{t('s.reportName')}</div>
            <div className="share-desc">{t('s.reportDesc')}</div>
          </div>
        </div>
      </Card>

      <Card title={t('s.backupTitle')} subtitle={t('s.backupSub')}>
        <div className="actions wrap">
          <Button onClick={() => exportJSON(state)}>{t('s.export')}</Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            {t('s.import')}
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImport} />
          <Button variant="danger" onClick={reset}>
            {t('s.reset')}
          </Button>
        </div>
        {msg && <p className="flash">{msg}</p>}
        <p className="muted">
          {t('s.summary', {
            g: state.goals.length,
            m: state.plan.milestones?.length || 0,
            l: state.logs.length,
            j: state.journals?.length || 0,
          })}
        </p>
      </Card>
    </div>
  )
}
