// Sharing: JSON backup/restore, a PNG "result card", and a printable process report.
// All user-facing text is produced with the profile's active language at export time.
import { lifeStats, weekStartDate, monthLabel } from './date.js'
import { computeStreak, weightSeries, sleepDurationSeries, seriesDelta, adherenceRate } from './stats.js'
import { METRICS } from './plan.js'
import { makeT, resolveLang } from './i18n.jsx'

export function downloadBlob(content, filename, type = 'application/json') {
  const blob = content instanceof Blob ? content : new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

function stamp() {
  return new Date().toISOString().slice(0, 10)
}

function tFor(state) {
  return makeT(resolveLang(state.profile?.lang))
}

export function exportJSON(state) {
  const t = tFor(state)
  downloadBlob(JSON.stringify(state, null, 2), t('sc.fileBackup', { d: stamp() }))
}

export function readJSONFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => {
      try {
        resolve(JSON.parse(r.result))
      } catch (e) {
        reject(e)
      }
    }
    r.onerror = reject
    r.readAsText(file)
  })
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

// 1080x1350 shareable summary card.
export function exportShareCard(state) {
  const t = tFor(state)
  const { profile, logs } = state
  const stats = lifeStats(profile.birthdate, profile.lifeExpectancyYears)
  const years = profile.lifeExpectancyYears || 90
  const cols = 52
  const W = 1080
  const H = 1350
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')
  const font = (s) => `${s}px -apple-system, "PingFang SC", "Hiragino Sans GB", system-ui, sans-serif`

  // background
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0f141a')
  bg.addColorStop(1, '#0a0d11')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  ctx.textBaseline = 'top'
  ctx.fillStyle = '#f5f7fa'
  ctx.font = '700 ' + font(54)
  ctx.fillText(profile.name ? t('sc.titleNamed', { name: profile.name }) : t('sc.titleAnon'), 80, 72)
  ctx.fillStyle = '#8b98a5'
  ctx.font = '400 ' + font(28)
  ctx.fillText(t('sc.sub', { n: stats.totalWeeks.toLocaleString() }), 80, 146)

  // grid
  const gridTop = 220
  const footerH = 360
  const availH = H - gridTop - footerH
  const pitch = Math.min((W - 160) / cols, availH / years)
  const cell = Math.max(3, pitch * 0.78)
  const gridW = pitch * cols
  const ox = (W - gridW) / 2
  for (let r = 0; r < years; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c
      const x = ox + c * pitch
      const y = gridTop + r * pitch
      if (i < stats.lived) ctx.fillStyle = '#6a7787'
      else if (i === stats.lived) ctx.fillStyle = '#34d399'
      else ctx.fillStyle = '#2b3542'
      roundRect(ctx, x, y, cell, cell, Math.max(1, cell * 0.22))
      ctx.fill()
    }
  }

  // footer stats
  let fy = gridTop + years * pitch + 48
  ctx.fillStyle = '#f5f7fa'
  ctx.font = '700 ' + font(40)
  ctx.fillText(t('sc.lived', { n: stats.lived.toLocaleString() }), 80, fy)
  ctx.fillStyle = '#34d399'
  ctx.fillText(t('sc.remaining', { n: stats.remaining.toLocaleString() }), 80, fy + 56)
  ctx.fillStyle = '#8b98a5'
  ctx.font = '400 ' + font(26)
  ctx.fillText(t('sc.pctAge', { p: stats.pct.toFixed(1), a: stats.ageYears }), 80, fy + 116)

  // wins (right column)
  const streak = computeStreak(logs)
  const wDelta = seriesDelta(weightSeries(logs))
  const sleepNow = sleepDurationSeries(logs).slice(-1)[0]
  const adh = adherenceRate(logs)
  const wins = []
  if (streak) wins.push(t('sc.winStreak', { n: streak }))
  if (wDelta != null) wins.push(t('sc.winWeight', { d: `${wDelta > 0 ? '+' : ''}${wDelta}` }))
  if (sleepNow) wins.push(t('sc.winSleep', { h: sleepNow.y }))
  if (adh != null) wins.push(t('sc.winAdh', { p: adh }))
  ctx.textAlign = 'right'
  ctx.font = '600 ' + font(30)
  wins.slice(0, 4).forEach((line, idx) => {
    ctx.fillStyle = '#cdd6df'
    ctx.fillText(line, W - 80, fy + idx * 48)
  })
  ctx.textAlign = 'left'

  // tagline
  ctx.fillStyle = '#5b6b7a'
  ctx.font = '400 ' + font(24)
  ctx.fillText(t('sc.tagline'), 80, H - 70)

  cv.toBlob((b) => downloadBlob(b, t('sc.fileCard', { d: stamp() }), 'image/png'), 'image/png')
}

// Self-contained, printable HTML report of the full process.
export function exportReport(state) {
  const t = tFor(state)
  downloadBlob(buildReportHTML(state, t), t('sc.fileReport', { d: stamp() }), 'text/html')
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

function buildReportHTML(state, t) {
  const { profile, baseline, goals, plan, logs } = state
  const lang = resolveLang(profile?.lang)
  const journals = state.journals || []
  const stats = lifeStats(profile.birthdate, profile.lifeExpectancyYears)
  const sorted = [...logs].sort((a, b) => (a.date < b.date ? 1 : -1))
  const journalsSorted = [...journals].sort((a, b) => b.weekIndex - a.weekIndex)

  const goalRows = (goals || [])
    .map((g) => {
      const m = METRICS[g.metric] || {}
      const cur = g.current ?? '—'
      const tar = g.target ?? '—'
      return `<tr><td>${m.icon || ''} ${esc(m.labelKey ? t(m.labelKey) : g.metric)}</td><td>${esc(cur)}</td><td>${esc(tar)}${g.unit ? ' ' + esc(g.unit) : ''}</td><td>${esc(g.targetDate || '')}</td></tr>`
    })
    .join('')

  const milestoneBlocks = (plan?.milestones || [])
    .map(
      (m) => `<div class="ms"><h3>${esc(m.title)}</h3><p class="muted">${esc(t('r.aboutWeeks', { p: m.perWeek, w: m.durationWeeks }))}</p><ul>${(m.steps || [])
        .map((s) => `<li>${esc(s.label)}</li>`)
        .join('')}</ul></div>`,
    )
    .join('')

  const logRows = sorted
    .map((l) => {
      const adh = l.adherence ? Object.entries(l.adherence).filter(([, v]) => v).map(([k]) => k).join(lang === 'zh' ? '、' : ', ') : ''
      return `<tr><td>${esc(l.date)}</td><td>${esc(l.bedtime || '')}</td><td>${esc(l.wakeTime || '')}</td><td>${esc(l.weightKg ?? '')}</td><td>${esc(adh)}</td><td>${esc(l.note || '')}</td></tr>`
    })
    .join('')

  const journalBlocks = journalsSorted
    .map((j) => {
      const d = weekStartDate(profile.birthdate, j.weekIndex)
      return `<div class="ms"><h3>${esc(t('r.weekN', { n: j.weekIndex + 1 }))} <span class="muted" style="font-weight:400">· ${esc(monthLabel(d, lang))}</span></h3><p style="margin:6px 0 0;white-space:pre-wrap">${esc(j.text)}</p></div>`
    })
    .join('')

  return `<!doctype html><html lang="${lang === 'zh' ? 'zh-CN' : 'en'}"><head><meta charset="utf-8"><title>${esc(t('r.docTitle'))}</title>
<style>
  :root{color-scheme:light}
  body{font-family:-apple-system,"PingFang SC","Hiragino Sans GB",system-ui,sans-serif;max-width:820px;margin:40px auto;padding:0 24px;color:#1c2530;line-height:1.6}
  h1{font-size:28px;margin:0 0 4px} h2{font-size:20px;margin:36px 0 12px;border-bottom:2px solid #e5e9ed;padding-bottom:6px}
  h3{font-size:16px;margin:0 0 4px}
  .muted{color:#74808c;font-size:13px;margin:2px 0 8px}
  .hero{background:linear-gradient(135deg,#0f141a,#16202b);color:#fff;border-radius:16px;padding:24px 28px;margin:16px 0}
  .hero b{font-size:34px;color:#34d399}
  table{width:100%;border-collapse:collapse;font-size:14px;margin:8px 0}
  th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #eceff2;vertical-align:top}
  th{color:#74808c;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
  .ms{background:#f7f9fa;border:1px solid #eceff2;border-radius:12px;padding:14px 18px;margin:10px 0}
  .ms ul{margin:6px 0 0;padding-left:20px} .ms li{margin:2px 0}
  .pill{display:inline-block;background:#eef6f2;color:#1c7a55;border-radius:999px;padding:2px 10px;font-size:12px;margin:2px 4px 2px 0}
  footer{margin:48px 0 24px;color:#9aa6b1;font-size:12px;text-align:center}
  @media print{body{margin:0}.hero{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
  <h1>${esc(t('r.h1'))}</h1>
  <div class="muted">${esc(profile.name || t('r.anon'))} · ${esc(t('r.exportedAt', { d: stamp() }))}</div>
  <div class="hero">
    <div>${t('r.heroLived', { n: stats.lived.toLocaleString(), m: stats.remaining.toLocaleString() })}</div>
    <div style="margin-top:6px;opacity:.8">${esc(t('r.heroPct', { p: stats.pct.toFixed(1), y: profile.lifeExpectancyYears || 90, a: stats.ageYears }))}</div>
  </div>

  <h2>${esc(t('r.s1'))}</h2>
  ${
    baseline
      ? `<table><tr><th>${esc(t('r.thBed'))}</th><th>${esc(t('r.thWake'))}</th><th>${esc(t('r.thWeight'))}</th><th>${esc(t('r.thDate'))}</th></tr>
         <tr><td>${esc(baseline.bedtime || '—')}</td><td>${esc(baseline.wakeTime || '—')}</td><td>${esc(baseline.weightKg ?? '—')} ${esc(profile.weightUnit || 'kg')}</td><td>${esc(baseline.date || '')}</td></tr></table>
         <div>${(baseline.dietTags || []).map((tag) => `<span class="pill">${esc(tag)}</span>`).join('')}</div>
         ${baseline.dietNotes ? `<p class="muted">${esc(t('r.dietNotes', { t: baseline.dietNotes }))}</p>` : ''}
         ${baseline.notes ? `<p class="muted">${esc(t('r.other', { t: baseline.notes }))}</p>` : ''}`
      : `<p class="muted">${esc(t('r.noBaseline'))}</p>`
  }

  <h2>${esc(t('r.s2'))}</h2>
  ${goals && goals.length ? `<table><tr><th>${esc(t('r.thMetric'))}</th><th>${esc(t('r.thCurrent'))}</th><th>${esc(t('r.thTarget'))}</th><th>${esc(t('r.thExpect'))}</th></tr>${goalRows}</table>` : `<p class="muted">${esc(t('r.noGoals'))}</p>`}

  <h2>${esc(t('r.s3'))}</h2>
  ${milestoneBlocks || `<p class="muted">${esc(t('r.noPlan'))}</p>`}

  <h2>${esc(t('r.s4', { n: sorted.length }))}</h2>
  ${
    sorted.length
      ? `<table><tr><th>${esc(t('r.thDay'))}</th><th>${esc(t('r.thBed'))}</th><th>${esc(t('r.thWake'))}</th><th>${esc(t('r.thWeight'))}</th><th>${esc(t('r.thDone'))}</th><th>${esc(t('r.thNote'))}</th></tr>${logRows}</table>`
      : `<p class="muted">${esc(t('r.noLogs'))}</p>`
  }

  <h2>${esc(t('r.s5', { n: journalsSorted.length }))}</h2>
  ${journalBlocks || `<p class="muted">${esc(t('r.noJournals'))}</p>`}

  <footer>${esc(t('r.footer'))}</footer>
</body></html>`
}
