import { describe, expect, it } from 'bun:test'
import type { PortfolioReadingItem } from '@zhop/portfolio-client'

import { clampExcerpt, formatChromeDate, localeFromTag, periodCaption } from './period-caption'

function item(partial: Partial<PortfolioReadingItem>): PortfolioReadingItem {
  return {
    id: 'r1',
    readingType: 'faceoracle',
    inputJson: '{}',
    resultJson: '',
    createdAt: '2026-08-12T04:00:00.000Z',
    ...partial,
  }
}

describe('localeFromTag', () => {
  it('maps frozen generation tags', () => {
    expect(localeFromTag('zh-Hant-TW')).toBe('zh-Hant')
    expect(localeFromTag('zh-CN')).toBe('zh')
    expect(localeFromTag('ja-JP')).toBe('ja')
    expect(localeFromTag(undefined)).toBe('en')
  })
})

describe('clampExcerpt', () => {
  it('returns short text unchanged', () => {
    expect(clampExcerpt('金水相涵')).toBe('金水相涵')
  })

  it('truncates long copy', () => {
    const long = '金水相涵，午未之交宜守，形开而神未收，位点宜对夜读。'
    const out = clampExcerpt(long, 12)
    expect(out.endsWith('…')).toBe(true)
    expect(out.length).toBeLessThanOrEqual(13)
  })
})

describe('formatChromeDate', () => {
  it('formats a compact single-line rail date', () => {
    const zh = formatChromeDate('2026-08-12T12:00:00.000Z', 'zh')
    // Single line: `YYYY.MM.DD`, no embedded newline.
    expect(zh).toMatch(/^\d{4}\.\d{2}\.\d{2}$/)
    const en = formatChromeDate('2026-08-12T12:00:00.000Z', 'en')
    expect(en).toMatch(/^\d{4}\.\d{2}\.\d{2}$/)
  })

  it('returns empty for invalid dates', () => {
    expect(formatChromeDate('not-a-date', 'en')).toBe('')
  })
})

describe('periodCaption', () => {
  it('keeps date and empty excerpt when body is missing', () => {
    const cap = periodCaption(item({ resultJson: '{}' }), 'zh')
    expect(cap.title.includes('2026')).toBe(true)
    expect(cap.excerpt).toBe('')
  })

  it('uses stored golden line as excerpt', () => {
    const resultJson = JSON.stringify({
      aiInterpretation: {
        overview: '金水相涵，午未之交宜守。',
      },
    })
    const cap = periodCaption(item({ resultJson, locale: 'zh' }), 'en')
    expect(cap.excerpt.startsWith('金水相涵')).toBe(true)
    expect(cap.title.includes('2026')).toBe(true)
  })
})
