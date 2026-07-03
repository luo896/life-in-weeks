import { useRef, useState } from 'react'
import { useStore } from '../store.jsx'
import { Card, Button } from './ui.jsx'
import { exportJSON, readJSONFile, exportShareCard, exportReport } from '../lib/share.js'

export default function Share() {
  const { state, importData, resetData } = useStore()
  const fileRef = useRef(null)
  const [msg, setMsg] = useState('')

  const flash = (t) => {
    setMsg(t)
    setTimeout(() => setMsg(''), 2600)
  }

  const onImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await readJSONFile(file)
      if (!data || typeof data !== 'object') throw new Error('格式不对')
      if (!confirm('导入将覆盖当前所有数据，确定继续？')) return
      importData(data)
      flash('已导入 ✓')
    } catch {
      flash('导入失败：文件不是有效的备份 JSON')
    } finally {
      e.target.value = ''
    }
  }

  const reset = () => {
    if (confirm('确定要清空所有数据并重新开始吗？此操作不可撤销。')) {
      resetData()
      flash('已重置')
    }
  }

  return (
    <div className="stack">
      <Card title="分享成果" subtitle="把你的人生周历与进展做成一张图，发给朋友或自己存档。">
        <div className="share-grid">
          <div className="share-tile" onClick={() => exportShareCard(state)}>
            <div className="share-ic">🖼️</div>
            <div className="share-name">导出分享卡片（PNG）</div>
            <div className="share-desc">一张含周历缩略图与关键数据的方图，适合发社交媒体。</div>
          </div>
          <div className="share-tile" onClick={() => exportReport(state)}>
            <div className="share-ic">📄</div>
            <div className="share-name">导出过程报告（HTML）</div>
            <div className="share-desc">完整记录：基线 → 目标 → 计划 → 每日打卡。可在浏览器打印为 PDF。</div>
          </div>
        </div>
      </Card>

      <Card title="备份与迁移" subtitle="所有数据只存在你这台设备的浏览器里。导出备份可换设备或防丢失。">
        <div className="actions wrap">
          <Button onClick={() => exportJSON(state)}>⬇️ 导出备份（JSON）</Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            ⬆️ 导入备份
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImport} />
          <Button variant="danger" onClick={reset}>
            清空数据
          </Button>
        </div>
        {msg && <p className="flash">{msg}</p>}
        <p className="muted">
          当前数据：{state.goals.length} 个目标 · {state.plan.milestones?.length || 0} 个里程碑 · {state.logs.length} 条打卡 ·{' '}
          {state.journals?.length || 0} 篇周记
        </p>
      </Card>
    </div>
  )
}
