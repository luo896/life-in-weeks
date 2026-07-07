import { useMemo, useState, useRef, useLayoutEffect, useEffect } from 'react'
import { useStore } from '../store.jsx'
import { lifeStats, weekStartDate, weekIndexForDate, monthLabel } from '../lib/date.js'
import { METRICS } from '../lib/plan.js'
import { useI18n } from '../lib/i18n.jsx'
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
  const { t, lang } = useI18n()
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

  // 可选锚点：健康区（预计健康无失能的周）与期望退休周
  const healthWeeks = profile.healthspanYears
    ? Math.min(stats.totalWeeks, Math.round(Number(profile.healthspanYears) * COLS))
    : null
  const retireWeek = profile.retirementAge ? Math.round(Number(profile.retirementAge) * COLS) : null

  // 人生清单（体验型目标）落点周 → 星标
  const expWeeks = useMemo(() => {
    const s = new Set()
    goals.forEach((g) => {
      if (g.metric === 'experience' && g.targetDate) {
        const wk = weekIndexForDate(profile.birthdate, g.targetDate)
        if (wk != null && wk >= 0 && wk < stats.totalWeeks) s.add(wk)
      }
    })
    return s
  }, [goals, profile.birthdate, stats.totalWeeks])

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
        } else if (healthWeeks != null && i < healthWeeks) cls += ' wk-health'
        else cls += ' wk-future'
      }
      if (retireWeek != null && i === retireWeek) cls += ' wk-retire'
      if (expWeeks.has(i)) cls += ' wk-exp'
      if (journalByWeek.has(i)) cls += ' wk-j'
      if (i === selectedWeek) cls += ' wk-sel'
      arr[i] = { i, cls, style }
    }
    return arr
  }, [stats.totalWeeks, stats.lived, stats.currentWeekIndex, bands, journalByWeek, selectedWeek, healthWeeks, retireWeek, expWeeks])

  if (!stats.ok) {
    return <div className="card">{t('grid.setBirthFirst')}</div>
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
              {t('grid.stats', {
                lived: stats.lived.toLocaleString(),
                remaining: stats.remaining.toLocaleString(),
                pct: stats.pct.toFixed(1),
                age: stats.ageYears,
              })}
            </div>
            <div className="orient-toggle" title={t('grid.orientTitle')}>
              <button
                className={`ot-btn ${orientation === 'portrait' ? 'on' : ''}`}
                onClick={() => setProfile({ gridOrientation: 'portrait' })}
              >
                {t('grid.portrait')}
              </button>
              <button
                className={`ot-btn ${orientation === 'landscape' ? 'on' : ''}`}
                onClick={() => setProfile({ gridOrientation: 'landscape' })}
              >
                {t('grid.landscape')}
              </button>
            </div>
          </div>
          <div className="grid-caption">
            {hover != null ? (
              <span>
                {t('grid.week', { n: hover + 1 })} · {monthLabel(hoverDate, lang)} ·{' '}
                {t('grid.age', { n: Math.floor(hover / COLS) })} ·{' '}
                {hover === stats.currentWeekIndex ? t('grid.now') : hover < stats.lived ? t('grid.past') : t('grid.future')}
                {journalByWeek.has(hover) ? ` · ${t('grid.hasJournal')}` : ''}
              </span>
            ) : (
              <span className="muted">{t('grid.hoverHint')}</span>
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
            <span><i className="sw wk-past" /> {t('grid.past')}</span>
            <span><i className="sw wk-now" /> {t('grid.now')}</span>
            {healthWeeks != null && <span><i className="sw sw-health" /> {t('grid.legendHealth')}</span>}
            <span><i className="sw wk-future" /> {t('grid.future')}</span>
            {retireWeek != null && <span><i className="sw sw-retire" /> {t('grid.legendRetire')}</span>}
            {expWeeks.size > 0 && <span><i className="sw sw-exp" /> {t('grid.legendExp')}</span>}
            <span><i className="sw wk-j-legend" /> {t('grid.legendJournal')}</span>
            {bands.map((b, i) => (
              <span key={i}><i className="sw" style={{ background: b.color }} /> {b.title}</span>
            ))}
          </div>
          <div className="scroll-hint">{t('grid.scrollHint')}</div>
        </div>
      </section>

      {/* ---- below the fold: goal timeline ---- */}
      <section className="card">
        <h2 className="card-title">{t('tl.title')}</h2>
        <p className="card-sub">{t('tl.sub')}</p>
        {goalNodes.length === 0 ? (
          <p className="muted">{t('tl.empty')}</p>
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
                      {g.targetDate || t('tl.noDate')}
                      {weeksAway != null && (
                        <span className="tl-away">
                          {weeksAway > 0 ? t('tl.weeksAway', { n: weeksAway }) : t('tl.due')}
                        </span>
                      )}
                    </div>
                    <div className="tl-what">
                      <span className="tl-ic">{g.metric === 'experience' ? '✨' : mm.icon}</span>
                      {g.metric === 'experience' ? (
                        <>
                          {g.target}
                          {g.why ? <span className="tl-why"> — {g.why}</span> : null}
                        </>
                      ) : g.metric === 'habit' ? (
                        g.target
                      ) : (
                        `${t(mm.labelKey)} ${g.current ?? '—'} → ${g.target ?? '—'} ${g.metric === 'weight' ? g.unit || 'kg' : ''}`
                      )}
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
        <h2 className="card-title">{t('j.title')}</h2>
        <p className="card-sub">{t('j.sub')}</p>

        <div className="composer">
          <div className="composer-head">
            <span>
              <b>{t('grid.week', { n: selectedWeek + 1 })}</b> · {monthLabel(selDate, lang)}
              {selectedWeek === stats.currentWeekIndex && <span className="composer-now">{t('j.thisWeek')}</span>}
            </span>
            {selectedWeek !== stats.currentWeekIndex && (
              <button className="link-btn" onClick={() => setSelectedWeek(stats.currentWeekIndex)}>
                {t('j.jumpNow')}
              </button>
            )}
          </div>
          <textarea
            rows={3}
            placeholder={t('j.ph')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="actions">
            <Button onClick={() => upsertJournal(selectedWeek, draft)} disabled={!draft.trim()}>
              {t('j.save')}
            </Button>
            <span className="muted">{t('j.pickHint')}</span>
          </div>
        </div>

        {journalList.length > 0 && (
          <ul className="journal-list">
            {journalList.map((j) => {
              const d = weekStartDate(profile.birthdate, j.weekIndex)
              return (
                <li className="journal-item" key={j.id}>
                  <button className="journal-when" onClick={() => pickWeek(j.weekIndex)} title={t('j.editTitle')}>
                    {t('grid.week', { n: j.weekIndex + 1 })}
                    <em>{monthLabel(d, lang)}</em>
                  </button>
                  <p className="journal-text">{j.text}</p>
                  <button className="icon-btn" title={t('common.delete')} onClick={() => removeJournal(j.id)}>
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
