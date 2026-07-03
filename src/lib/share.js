// Sharing: JSON backup/restore, a PNG "result card", and a printable process report.
import { lifeStats, weekStartDate, monthLabel } from './date.js'
import { computeStreak, weightSeries, sleepDurationSeries, seriesDelta, adherenceRate } from './stats.js'
import { METRICS } from './plan.js'

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

export function exportJSON(state) {
  downloadBlob(JSON.stringify(state, null, 2), `人生周历-备份-${stamp()}.json`)
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
  ctx.fillText(profile.name ? `${profile.name} 的人生周历` : '我的人生周历', 80, 72)
  ctx.fillStyle = '#8b98a5'
  ctx.font = '400 ' + font(28)
  ctx.fillText(`每一格代表一周 · 一生约 ${stats.totalWeeks.toLocaleString()} 周`, 80, 146)

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
  ctx.fillText(`已度过 ${stats.lived.toLocaleString()} 周`, 80, fy)
  ctx.fillStyle = '#34d399'
  ctx.fillText(`剩余 ${stats.remaining.toLocaleString()} 周`, 80, fy + 56)
  ctx.fillStyle = '#8b98a5'
  ctx.font = '400 ' + font(26)
  ctx.fillText(`生命已走过 ${stats.pct.toFixed(1)}% · ${stats.ageYears} 岁`, 80, fy + 116)

  // wins (right column)
  const streak = computeStreak(logs)
  const wDelta = seriesDelta(weightSeries(logs))
  const sleepNow = sleepDurationSeries(logs).slice(-1)[0]
  const adh = adherenceRate(logs)
  const wins = []
  if (streak) wins.push(`🔥 连续打卡 ${streak} 天`)
  if (wDelta != null) wins.push(`⚖️ 体重 ${wDelta > 0 ? '+' : ''}${wDelta} kg`)
  if (sleepNow) wins.push(`😴 近期睡眠 ${sleepNow.y} 小时`)
  if (adh != null) wins.push(`✅ 计划坚持率 ${adh}%`)
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
  ctx.fillText('人生周历 · 习惯改造计划', 80, H - 70)

  cv.toBlob((b) => downloadBlob(b, `人生周历-分享卡-${stamp()}.png`, 'image/png'), 'image/png')
}

// Self-contained, printable HTML report of the full process.
export function exportReport(state) {
  downloadBlob(buildReportHTML(state), `人生周历-过程报告-${stamp()}.html`, 'text/html')
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

function buildReportHTML(state) {
  const { profile, baseline, goals, plan, logs } = state
  const journals = state.journals || []
  const stats = lifeStats(profile.birthdate, profile.lifeExpectancyYears)
  const sorted = [...logs].sort((a, b) => (a.date < b.date ? 1 : -1))
  const journalsSorted = [...journals].sort((a, b) => b.weekIndex - a.weekIndex)

  const goalRows = (goals || [])
    .map((g) => {
      const m = METRICS[g.metric] || {}
      const cur = g.current ?? '—'
      const tar = g.target ?? '—'
      return `<tr><td>${m.icon || ''} ${esc(m.label || g.metric)}</td><td>${esc(cur)}</td><td>${esc(tar)}${g.unit ? ' ' + esc(g.unit) : ''}</td><td>${esc(g.targetDate || '')}</td></tr>`
    })
    .join('')

  const milestoneBlocks = (plan?.milestones || [])
    .map(
      (m) => `<div class="ms"><h3>${esc(m.title)}</h3><p class="muted">${esc(m.perWeek)} · 约 ${m.durationWeeks} 周</p><ul>${(m.steps || [])
        .map((s) => `<li>${esc(s.label)}</li>`)
        .join('')}</ul></div>`,
    )
    .join('')

  const logRows = sorted
    .map((l) => {
      const adh = l.adherence ? Object.entries(l.adherence).filter(([, v]) => v).map(([k]) => k).join('、') : ''
      return `<tr><td>${esc(l.date)}</td><td>${esc(l.bedtime || '')}</td><td>${esc(l.wakeTime || '')}</td><td>${esc(l.weightKg ?? '')}</td><td>${esc(adh)}</td><td>${esc(l.note || '')}</td></tr>`
    })
    .join('')

  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>人生周历 · 过程报告</title>
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
  <h1>人生周历 · 习惯改造过程报告</h1>
  <div class="muted">${esc(profile.name || '匿名')} · 导出于 ${stamp()}</div>
  <div class="hero">
    <div>已度过 <b>${stats.lived.toLocaleString()}</b> 周 · 剩余 ${stats.remaining.toLocaleString()} 周</div>
    <div style="margin-top:6px;opacity:.8">生命已走过 ${stats.pct.toFixed(1)}%（按 ${profile.lifeExpectancyYears || 90} 岁估算，${stats.ageYears} 岁）</div>
  </div>

  <h2>① 现状基线</h2>
  ${
    baseline
      ? `<table><tr><th>入睡</th><th>起床</th><th>体重</th><th>记录日期</th></tr>
         <tr><td>${esc(baseline.bedtime || '—')}</td><td>${esc(baseline.wakeTime || '—')}</td><td>${esc(baseline.weightKg ?? '—')} ${esc(profile.weightUnit || 'kg')}</td><td>${esc(baseline.date || '')}</td></tr></table>
         <div>${(baseline.dietTags || []).map((t) => `<span class="pill">${esc(t)}</span>`).join('')}</div>
         ${baseline.dietNotes ? `<p class="muted">饮食备注：${esc(baseline.dietNotes)}</p>` : ''}
         ${baseline.notes ? `<p class="muted">其他：${esc(baseline.notes)}</p>` : ''}`
      : '<p class="muted">尚未记录基线。</p>'
  }

  <h2>② 目标</h2>
  ${goals && goals.length ? `<table><tr><th>指标</th><th>现状</th><th>目标</th><th>期望日期</th></tr>${goalRows}</table>` : '<p class="muted">尚未设定目标。</p>'}

  <h2>③ 改善计划</h2>
  ${milestoneBlocks || '<p class="muted">尚未生成计划。</p>'}

  <h2>④ 打卡记录（${sorted.length} 条）</h2>
  ${
    sorted.length
      ? `<table><tr><th>日期</th><th>入睡</th><th>起床</th><th>体重</th><th>已完成</th><th>备注</th></tr>${logRows}</table>`
      : '<p class="muted">还没有打卡记录。</p>'
  }

  <h2>⑤ 周记（${journalsSorted.length} 篇）</h2>
  ${
    journalsSorted.length
      ? journalsSorted
          .map((j) => {
            const d = weekStartDate(profile.birthdate, j.weekIndex)
            return `<div class="ms"><h3>第 ${j.weekIndex + 1} 周 <span class="muted" style="font-weight:400">· ${esc(monthLabel(d))}</span></h3><p style="margin:6px 0 0;white-space:pre-wrap">${esc(j.text)}</p></div>`
          })
          .join('')
      : '<p class="muted">还没有周记。</p>'
  }

  <footer>由「人生周历 · 习惯改造计划」生成 · 想保存为 PDF？在浏览器中按 ⌘P / Ctrl+P 打印</footer>
</body></html>`
}
