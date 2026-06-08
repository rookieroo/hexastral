import { describe, expect, it } from 'bun:test'
import {
  elementName,
  formatLean,
  formatVerdict,
  formatWindowMonth,
  formatWindowReasons,
} from '../lib/makeif-format'
import type { RelMakeIfResponse, RelMakeIfWindow } from '../types'

function win(over: Partial<RelMakeIfWindow> = {}): RelMakeIfWindow {
  return {
    key: '2026-3',
    year: 2026,
    month: 3,
    date: '2026-03-01',
    ganZhi: '辛卯',
    element: '金',
    score: 3,
    lean: 'favorable',
    isYongshen: true,
    feedsYongshen: false,
    harmony: false,
    clash: false,
    reasons: ['流月金当令，正合你们的用神【金】，气最顺'],
    ...over,
  }
}

describe('elementName / month / lean', () => {
  it('localizes element names (Latin for en, glyph for cjk)', () => {
    expect(elementName('金', 'en')).toBe('Metal')
    expect(elementName('金', 'zh')).toBe('金')
    expect(elementName('火', 'ja')).toBe('火')
  })
  it('formats the window month per locale', () => {
    expect(formatWindowMonth(win(), 'en')).toBe('Mar 2026')
    expect(formatWindowMonth(win(), 'zh')).toBe('2026年3月')
  })
  it('localizes lean labels', () => {
    expect(formatLean('favorable', 'en')).toBe('Favorable')
    expect(formatLean('caution', 'zh')).toBe('宜避')
    expect(formatLean('mixed', 'ja')).toBe('平')
  })
})

describe('formatWindowReasons', () => {
  it('zh returns the engine reasons verbatim', () => {
    const w = win()
    expect(formatWindowReasons(w, '金', 'zh')).toEqual(w.reasons)
  })
  it('en rebuilds reasons from flags (no Chinese leaks)', () => {
    const w = win({ isYongshen: false, feedsYongshen: true, element: '土', harmony: true })
    const out = formatWindowReasons(w, '金', 'en')
    expect(out.join(' ')).toContain('Earth')
    expect(out.join(' ')).toContain('Metal')
    expect(out.some((r) => /[一-龥]/.test(r))).toBe(false)
  })
})

describe('formatVerdict', () => {
  const result: RelMakeIfResponse = {
    pro: true,
    yongshen: '金',
    windows: [win(), win({ key: '2026-7', month: 7, ganZhi: '乙未', score: -3, lean: 'caution' })],
    bestKey: '2026-3',
    verdict: 'zh server verdict',
  }
  it('zh uses the server verdict verbatim', () => {
    expect(formatVerdict(result, 'zh')).toBe('zh server verdict')
  })
  it('en rebuilds with the best month + disclaimer, no Chinese', () => {
    const v = formatVerdict(result, 'en')
    expect(v).toContain('Mar 2026')
    expect(v).toContain('Metal')
    expect(v).toContain('choice is yours')
    expect(/[一-龥]/.test(v.replace(/[辛卯乙未]/g, ''))).toBe(false)
  })
})
