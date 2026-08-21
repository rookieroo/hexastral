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

  it('matches Hant 比劫 and 傷官見官', () => {
    const segs = segmentXingqiTerms('比劫旺時，傷官見官宜收束。')
    expect(segs.find((s) => s.termZh === '比劫')?.text).toBe('比劫')
    expect(segs.find((s) => s.termZh === '伤官见官')?.text).toBe('傷官見官')
  })

  it('resolves 比劫 gloss in Hant', () => {
    const t = resolveXingqiTerm('比劫', 'zh-Hant')
    expect(t).not.toBeNull()
    expect(t!.zh).toBe('比劫')
    expect(t!.short).toContain('比肩')
    expect(t!.long).toContain('劫')
  })

  it('matches 双壬生身 and 藤萝系甲 / 击甲 alias', () => {
    const a = segmentXingqiTerms('乙木日主见双壬生身，宜守根基。')
    expect(a.find((s) => s.termZh === '双壬生身')?.text).toBe('双壬生身')
    const b = segmentXingqiTerms('口相见藤萝系甲之变格。')
    expect(b.find((s) => s.termZh === '藤萝系甲')?.text).toBe('藤萝系甲')
    const c = segmentXingqiTerms('俗称藤萝击甲亦可点。')
    expect(c.find((s) => s.termZh === '藤萝系甲')?.text).toBe('藤萝击甲')
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
