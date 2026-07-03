import { useStore } from '../store.jsx'
import { useI18n } from '../lib/i18n.jsx'
import { Card, Stat, Empty } from './ui.jsx'
import { LineChart } from './Charts.jsx'
import { weightSeries, sleepDurationSeries, bedtimeSeries, computeStreak, adherenceRate, seriesDelta } from '../lib/stats.js'

export default function Progress() {
  const { state } = useStore()
  const { t } = useI18n()
  const { logs, goals } = state

  const wSeries = weightSeries(logs)
  const sSeries = sleepDurationSeries(logs)
  const bSeries = bedtimeSeries(logs)

  const weightGoal = goals.find((g) => g.metric === 'weight')
  const bedGoal = goals.find((g) => g.metric === 'bedtime')
  const bedGoalHours = (() => {
    if (!bedGoal?.target) return null
    const [h, m] = bedGoal.target.split(':').map(Number)
    let hr = h + m / 60
    if (hr < 12) hr += 24
    return Math.round(hr * 10) / 10
  })()

  const streak = computeStreak(logs)
  const adh = adherenceRate(logs)
  const wDelta = seriesDelta(wSeries)
  const sLatest = sSeries.slice(-1)[0]

  if (logs.length === 0) {
    return (
      <Card title={t('nav.progress')}>
        <Empty icon="🌱">{t('pr.empty')}</Empty>
      </Card>
    )
  }

  return (
    <div className="stack">
      <Card title={t('pr.overview')}>
        <div className="stat-row">
          <Stat value={`${logs.length}`} label={t('pr.days')} />
          <Stat value={`${streak}`} label={t('pr.streak')} accent />
          <Stat value={wDelta != null ? `${wDelta > 0 ? '+' : ''}${wDelta}` : '—'} label={t('pr.wDelta')} />
          <Stat value={adh != null ? `${adh}%` : '—'} label={t('pr.adherence')} />
        </div>
      </Card>

      <Card
        title={t('pr.wTitle')}
        subtitle={weightGoal ? t('pr.wGoal', { t: weightGoal.target, u: weightGoal.unit || 'kg' }) : t('pr.wSub')}
      >
        <LineChart data={wSeries} goal={weightGoal?.target} unit={weightGoal?.unit || 'kg'} color="#34d399" />
      </Card>

      <Card title={t('pr.sTitle')} subtitle={t('pr.sSub')}>
        <LineChart data={sSeries} goal={8} unit="h" color="#60a5fa" />
      </Card>

      <Card title={t('pr.bTitle')} subtitle={bedGoal ? t('pr.bGoal', { t: bedGoal.target }) : t('pr.bSub')}>
        <LineChart data={bSeries} goal={bedGoalHours} unit="h" color="#f59e0b" invertHint={t('pr.hint')} />
      </Card>

      {sLatest && <p className="muted center">{t('pr.latest', { h: sLatest.y })}</p>}
    </div>
  )
}
