import { describe, expect, it } from 'bun:test'

import { segmentXingqiTerms } from './xingqi-terms'

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
