import { useStore } from '../store.jsx'
import { Card, Stat, Empty } from './ui.jsx'
import { LineChart } from './Charts.jsx'
import { weightSeries, sleepDurationSeries, bedtimeSeries, computeStreak, adherenceRate, seriesDelta } from '../lib/stats.js'

export default function Progress() {
  const { state } = useStore()
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
      <Card title="进度">
        <Empty icon="🌱">还没有打卡数据。去「打卡」记录几天，趋势图与统计就会出现在这里。</Empty>
      </Card>
    )
  }

  return (
    <div className="stack">
      <Card title="概览">
        <div className="stat-row">
          <Stat value={`${logs.length}`} label="打卡天数" />
          <Stat value={`${streak}`} label="连续天数" accent />
          <Stat value={wDelta != null ? `${wDelta > 0 ? '+' : ''}${wDelta}` : '—'} label="体重变化" />
          <Stat value={adh != null ? `${adh}%` : '—'} label="计划坚持率" />
        </div>
      </Card>

      <Card title="体重趋势" subtitle={weightGoal ? `目标 ${weightGoal.target} ${weightGoal.unit || 'kg'}` : '记录体重以查看趋势'}>
        <LineChart data={wSeries} goal={weightGoal?.target} unit={weightGoal?.unit || 'kg'} color="#34d399" />
      </Card>

      <Card title="睡眠时长趋势" subtitle="每晚实际睡眠小时数">
        <LineChart data={sSeries} goal={8} unit="h" color="#60a5fa" />
      </Card>

      <Card title="入睡时间趋势" subtitle={bedGoal ? `目标 ${bedGoal.target}` : '越低越早睡（如 25 表示次日 01:00）'}>
        <LineChart
          data={bSeries}
          goal={bedGoalHours}
          unit="h"
          color="#f59e0b"
          invertHint="数值 = 入睡的小时（24 = 午夜，23 = 晚 11 点）；越低越早睡。"
        />
      </Card>

      {sLatest && (
        <p className="muted center">最近一次睡眠 {sLatest.y} 小时 · 继续保持，每一格周历都在见证你的改变。</p>
      )}
    </div>
  )
}
