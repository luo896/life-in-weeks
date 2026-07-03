import { useMemo, useState, useRef, useLayoutEffect, useEffect } from 'react'
import { useStore } from '../store.jsx'
import { lifeStats, weekStartDate, weekIndexForDate, monthLabel } from '../lib/date.js'
import { METRICS } from '../lib/plan.js'
import { Button } from './ui.jsx'

const COLS = 52
const PLAN_COLORS = ['#f59e0b', '#60a5fa', '#f472b6', '#a78bfa', '#22d3ee', '#fb7185']
const MAX_CELL = 30

// Size the grid cells so the whole life fits in the first screen, for either orientation.
function useFitGrid(cols, rows) {
  const ref = useRef(null)
  const [size, setSize] = useState({ cell: 10, gap: 2 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const compute = () => {
      const rect = el.getBoundingClientRect()
      const absTop = rect.top + window.scrollY
      const isMobile = window.innerWidth <= 860
      const reserve = isMobile ? 128 : 78 // legend + hint + breathing room (+ tab bar on mobile)
      const availH = Math.max(120, window.innerHeight - absTop - reserve)
      const availW = el.clientWidth
      // size against the largest gap we might render with, so it never overflows
      const gap = 2
      const cell = Math.max(
        3,
        Math.min(MAX_CELL, Math.floor(Math.min((availW - (cols - 1) * gap) / cols, (availH - (rows - 1) * gap) / rows))),
      )
      const finalGap = cell >= 9 ? 2 : 1
      setSize({ cell, gap: finalGap })
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    window.addEventListener('resize', compute)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', compute)
    }
  }, [cols, rows])
  return [ref, size]
}

export function LifeGridView() {
  const { state, upsertJournal, removeJournal, setProfile } = useStore()
  const { profile, plan, goals, journals } = state
  const years = profile.lifeExpectancyYears || 90
  // explicit user choice wins; otherwise pick by screen shape (wide → landscape),
  // tracked in state so window resizes re-evaluate the auto choice
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 860)
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth <= 860)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const orientation = profile.gridOrientation || (narrow ? 'portrait' : 'landscape')
  const stats = useMemo(() => lifeStats(profile.birthdate, years), [profile, years])
  const cols = orientation === 'portrait' ? COLS : years
  const rows = orientation === 'portrait' ? years : COLS
  const [boxRef, { cell, gap }] = useFitGrid(cols, rows)
  const gridStyle =
    orientation === 'portrait'
      ? { gridTemplateColumns: `repeat(${COLS}, ${cell}px)`, gridAutoRows: `${cell}px`, gap: `${gap}px` }
      : {
          gridTemplateRows: `repeat(${COLS}, ${cell}px)`,
          gridAutoColumns: `${cell}px`,
          gridAutoFlow: 'column',
          gap: `${gap}px`,
        }
  const [hover, setHover] = useState(null)
  const [selectedWeek, setSelectedWeek] = useState(stats.currentWeekIndex)
  const [draft, setDraft] = useState('')
  const composerRef = useRef(null)

  const bands = useMemo(() => {
    return (plan?.milestones || []).map((m, idx) => {
      const start = stats.lived + (m.startOffset || 0)
      return { start, end: start + (m.durationWeeks || 0), color: PLAN_COLORS[idx % PLAN_COLORS.length], title: m.title }
    })
  }, [plan, stats.lived])

  const journalByWeek = useMemo(() => {
    const m = new Map()
    journals.forEach((j) => m.set(j.weekIndex, j))
    return m
  }, [journals])

  // Load the selected week's existing journal into the editor.
  useEffect(() => {
    setDraft(journalByWeek.get(selectedWeek)?.text || '')
  }, [selectedWeek, journalByWeek])

  function bandFor(i) {
    for (const b of bands) if (i >= b.start && i < b.end) return b
    return null
  }

  const cells = useMemo(() => {
    const arr = new Array(stats.totalWeeks)
    for (let i = 0; i < stats.totalWeeks; i++) {
      let cls = 'wk'
      let style
      if (i === stats.currentWeekIndex) cls += ' wk-now'
      else if (i < stats.lived) cls += ' wk-past'
      else {
        const b = bandFor(i)
        if (b) {
          cls += ' wk-plan'
          style = { background: b.color }
        } else cls += ' wk-future'
      }
      if (journalByWeek.has(i)) cls += ' wk-j'
      if (i === selectedWeek) cls += ' wk-sel'
      arr[i] = { i, cls, style }
    }
    return arr
  }, [stats.totalWeeks, stats.lived, stats.currentWeekIndex, bands, journalByWeek, selectedWeek])

  if (!stats.ok) {
    return <div className="card">请先在右上角「设置」里填写出生日期。</div>
  }

  const pickWeek = (i) => {
    setSelectedWeek(i)
    composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const selDate = weekStartDate(profile.birthdate, selectedWeek)
  const hoverDate = hover != null ? weekStartDate(profile.birthdate, hover) : null

  // Goal timeline nodes, ordered by date.
  const goalNodes = useMemo(() => {
    return goals
      .map((g) => {
        const wk = g.targetDate ? weekIndexForDate(profile.birthdate, g.targetDate) : null
        return { ...g, wk }
      })
      .sort((a, b) => {
        const da = a.targetDate || '9999-99-99'
        const db = b.targetDate || '9999-99-99'
        return da < db ? -1 : da > db ? 1 : 0
      })
  }, [goals, profile.birthdate])

  const journalList = useMemo(() => [...journals].sort((a, b) => b.weekIndex - a.weekIndex), [journals])

  return (
    <div className="grid-page">
      {/* ---- first screen: the whole life ---- */}
      <section className="grid-stage card">
        <div className="grid-head">
          <div className="grid-head-row">
            <div className="gstats">
              已度过 <b>{stats.lived.toLocaleString()}</b> 周 ·{' '}
              <span className="accent">
                剩余 <b>{stats.remaining.toLocaleString()}</b> 周
              </span>{' '}
              · 走过 <b>{stats.pct.toFixed(1)}%</b> · {stats.ageYears} 岁
            </div>
            <div className="orient-toggle" title="切换周历方向">
              <button
                className={`ot-btn ${orientation === 'portrait' ? 'on' : ''}`}
                onClick={() => setProfile({ gridOrientation: 'portrait' })}
              >
                ▯ 竖放
              </button>
              <button
                className={`ot-btn ${orientation === 'landscape' ? 'on' : ''}`}
                onClick={() => setProfile({ gridOrientation: 'landscape' })}
              >
                ▭ 横放
              </button>
            </div>
          </div>
          <div className="grid-caption">
            {hover != null ? (
              <span>
                第 <b>{hover + 1}</b> 周 · {monthLabel(hoverDate)} · {Math.floor(hover / COLS)} 岁
                {hover === stats.currentWeekIndex ? ' · 本周' : hover < stats.lived ? ' · 已度过' : ' · 未来'}
                {journalByWeek.has(hover) ? ' · 有周记 📝' : ''}
              </span>
            ) : (
              <span className="muted">点任意方块写下那一周的周记 · 鼠标悬停查看是哪一周</span>
            )}
          </div>
        </div>

        <div className="weeks-box" ref={boxRef} onMouseLeave={() => setHover(null)}>
          <div className="weeks" style={gridStyle}>
            {cells.map((c) => (
              <div
                key={c.i}
                className={c.cls}
                style={c.style}
                onMouseEnter={() => setHover(c.i)}
                onClick={() => pickWeek(c.i)}
              />
            ))}
          </div>
        </div>

        <div className="grid-foot">
          <div className="legend">
            <span><i className="sw wk-past" /> 已度过</span>
            <span><i className="sw wk-now" /> 本周</span>
            <span><i className="sw wk-future" /> 未来</span>
            <span><i className="sw wk-j-legend" /> 有周记</span>
            {bands.map((b, i) => (
              <span key={i}><i className="sw" style={{ background: b.color }} /> {b.title}</span>
            ))}
          </div>
          <div className="scroll-hint">↓ 下滑查看目标时间线与周记</div>
        </div>
      </section>

      {/* ---- below the fold: goal timeline ---- */}
      <section className="card">
        <h2 className="card-title">🎯 目标时间线</h2>
        <p className="card-sub">你的目标按时间排布。给目标设个「期望日期」就会落到对应的周。</p>
        {goalNodes.length === 0 ? (
          <p className="muted">还没有目标。去「目标」页添加，它们会出现在这条时间线上。</p>
        ) : (
          <ol className="timeline">
            {goalNodes.map((g) => {
              const mm = METRICS[g.metric] || {}
              const weeksAway = g.wk != null ? g.wk - stats.lived : null
              return (
                <li className="tl-node" key={g.id}>
                  <span className="tl-dot" />
                  <div className="tl-body">
                    <div className="tl-when">
                      {g.targetDate || '未设期限'}
                      {weeksAway != null && (
                        <span className="tl-away">{weeksAway > 0 ? `还有 ${weeksAway} 周` : '已到期'}</span>
                      )}
                    </div>
                    <div className="tl-what">
                      <span className="tl-ic">{mm.icon}</span>
                      {g.metric === 'habit'
                        ? g.target
                        : `${mm.label} ${g.current ?? '—'} → ${g.target ?? '—'} ${g.metric === 'weight' ? g.unit || 'kg' : ''}`}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {/* ---- below the fold: weekly journal ---- */}
      <section className="card" ref={composerRef}>
        <h2 className="card-title">📝 周记</h2>
        <p className="card-sub">每周写一句话，记录这一周的状态与心情。它会标记在上面的周历里。</p>

        <div className="composer">
          <div className="composer-head">
            <span>
              第 <b>{selectedWeek + 1}</b> 周 · {monthLabel(selDate)}
              {selectedWeek === stats.currentWeekIndex && <span className="composer-now">本周</span>}
            </span>
            {selectedWeek !== stats.currentWeekIndex && (
              <button className="link-btn" onClick={() => setSelectedWeek(stats.currentWeekIndex)}>
                跳到本周
              </button>
            )}
          </div>
          <textarea
            rows={3}
            placeholder="这一周过得怎么样？睡得好吗？有没有坚持计划？"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="actions">
            <Button onClick={() => upsertJournal(selectedWeek, draft)} disabled={!draft.trim()}>
              保存周记
            </Button>
            <span className="muted">想写哪一周？回到上面点对应的方块即可。</span>
          </div>
        </div>

        {journalList.length > 0 && (
          <ul className="journal-list">
            {journalList.map((j) => {
              const d = weekStartDate(profile.birthdate, j.weekIndex)
              return (
                <li className="journal-item" key={j.id}>
                  <button className="journal-when" onClick={() => pickWeek(j.weekIndex)} title="点击编辑这一周">
                    第 {j.weekIndex + 1} 周
                    <em>{monthLabel(d)}</em>
                  </button>
                  <p className="journal-text">{j.text}</p>
                  <button className="icon-btn" title="删除" onClick={() => removeJournal(j.id)}>
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
