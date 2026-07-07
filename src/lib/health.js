// 体格指标计算：BMI（亚洲人群阈值）与腰高比（WHtR）。
// 阈值依据：WHO 2004 亚洲人群专家共识（Lancet）与《中国成人超重与肥胖预防控制指南》：
// BMI <18.5 偏瘦 / 18.5–23.9 正常 / 24–27.9 超重 / ≥28 肥胖。
// 腰高比：腰围不超过身高一半（<0.5）为宜（NICE 2022 等）。

export function bmi(weightKg, heightCm) {
  const w = Number(weightKg)
  const h = Number(heightCm)
  if (!w || !h || w <= 0 || h <= 0) return null
  const m = h / 100
  return Math.round((w / (m * m)) * 10) / 10
}

// 返回 'under' | 'normal' | 'over' | 'obese'（对应 i18n 键 bmi.*）
export function bmiBandAsia(v) {
  if (v == null) return null
  if (v < 18.5) return 'under'
  if (v < 24) return 'normal'
  if (v < 28) return 'over'
  return 'obese'
}

export function whtr(waistCm, heightCm) {
  const w = Number(waistCm)
  const h = Number(heightCm)
  if (!w || !h || w <= 0 || h <= 0) return null
  return Math.round((w / h) * 100) / 100
}
