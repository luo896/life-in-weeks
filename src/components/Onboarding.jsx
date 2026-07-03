import { useState } from 'react'
import { useStore } from '../store.jsx'
import { Button, Field } from './ui.jsx'
import { lifeStats } from '../lib/date.js'

export default function Onboarding() {
  const { setProfile } = useStore()
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
        <div className="onboard-grid" aria-hidden>
          {Array.from({ length: 96 }, (_, i) => (
            <span key={i} className={`ob-cell ${i < 34 ? 'on' : i === 34 ? 'now' : ''}`} />
          ))}
        </div>
        <h1>人生周历</h1>
        <p className="onboard-lead">
          如果把一生画成一张表，每个方块是一周 —— 你会发现格子比想象的少得多。
          <br />
          用这份紧迫感，认真改造你的生活习惯。
        </p>

        <Field label="你的名字（可选）">
          <input type="text" value={name} placeholder="怎么称呼你" onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="出生日期">
          <input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
        </Field>
        <Field label="预期寿命（岁）" hint="经典的人生周历用 90；你也可以用让你最受触动的数字，比如 70。">
          <input type="number" min="40" max="120" value={years} onChange={(e) => setYears(e.target.value)} />
        </Field>

        {preview?.ok && (
          <div className="onboard-preview">
            你已经度过了约 <b>{preview.lived.toLocaleString()}</b> 周，还剩 <b>{preview.remaining.toLocaleString()}</b> 周。
          </div>
        )}

        <Button onClick={start} disabled={!birthdate} className="block">
          开始 →
        </Button>
        <p className="onboard-foot">数据只保存在本机浏览器，不会上传任何服务器。</p>
      </div>
    </div>
  )
}
