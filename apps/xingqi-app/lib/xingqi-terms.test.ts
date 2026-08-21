import { describe, expect, it } from 'bun:test'

import { resolveXingqiTerm, segmentXingqiTerms, toZhHant } from './xingqi-terms'

describe('segmentXingqiTerms', () => {
  it('matches Traditional 浮陽外越 to canonical 浮阳', () => {
    const segs = segmentXingqiTerms('近日見浮陽外越，宜收斂節奏。')
    const hit = segs.find((s) => s.termZh === '浮阳')
    expect(hit?.text).toBe('浮陽外越')
  })

  it('matches 火炎土燥 in mixed Hant prose', () => {
    const segs = segmentXingqiTerms('形氣偏火炎土燥，口乾急躁之象。')
    const hit = segs.find((s) => s.termZh === '火炎土燥')
    expect(hit).toBeDefined()
    expect(hit?.text).toContain('火炎土燥')
  })

  it('matches 氣機 via Hant map', () => {
    const segs = segmentXingqiTerms('本期氣機宜留意窗口。')
    const hit = segs.find((s) => s.termZh === '气机')
    expect(hit?.text).toBe('氣機')
  })
})

describe('resolveXingqiTerm Hant / ja', () => {
  it('Hant glosses use Traditional script, not English', () => {
    const dayun = resolveXingqiTerm('大运', 'zh-Hant')
    expect(dayun).not.toBeNull()
    expect(dayun!.zh).toBe('大運')
    expect(dayun!.short).toContain('階')
    expect(dayun!.long).toContain('運')
    expect(dayun!.short).not.toMatch(/ten-year|chapter/i)

    const mu = resolveXingqiTerm('木', 'zh-Hant')
    expect(mu!.short).toMatch(/長|仁|上/)
    expect(mu!.long).toContain('長')
    expect(mu!.short).not.toMatch(/growing|kind/i)

    const qi = resolveXingqiTerm('氣機', 'zh-Hant')
    expect(qi?.zh).toBe('氣機')
  })

  it('ja BaZi subset is Japanese, not English', () => {
    const dayun = resolveXingqiTerm('大运', 'ja')
    expect(dayun!.short).toMatch(/十年|人生/)
    expect(dayun!.short).not.toMatch(/ten-year|chapter/i)
    const mu = resolveXingqiTerm('木', 'ja')
    expect(mu!.short).toMatch(/成長|仁/)
    expect(mu!.long).not.toMatch(/Wood element/i)
  })

  it('toZhHant maps diagnosis / axis chars', () => {
    expect(toZhHant('诊断')).toBe('診斷')
    expect(toZhHant('健康轴')).toBe('健康軸')
    expect(toZhHant('运势')).toBe('運勢')
  })
})
