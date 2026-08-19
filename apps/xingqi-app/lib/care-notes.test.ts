import { describe, expect, it } from 'bun:test'
import type { PortfolioReadingItem } from '@zhop/portfolio-client'
import { looksLikeCare, periodStripDots } from './care-notes'

describe('looksLikeCare', () => {
  it('keeps meal and sleep lines', () => {
    expect(looksLikeCare('这周按时吃饭，少熬夜。')).toBe(true)
    expect(looksLikeCare('Sleep before midnight on three nights.')).toBe(true)
  })

  it('drops diagnosis and census 铁口', () => {
    expect(looksLikeCare('疑似糖尿病风险，建议就医。')).toBe(false)
    expect(looksLikeCare('你已婚，今年有孩子。')).toBe(false)
  })
})

describe('periodStripDots', () => {
  it('returns four near-window months with the current month lit', () => {
    const item = {
      id: 'r1',
      readingType: 'faceoracle',
      inputJson: '{}',
      resultJson: JSON.stringify({
        events: [{ axis: 'health', startMonth: '2026-09', note: 'rest' }],
      }),
      createdAt: '2026-08-19T00:00:00.000Z',
    } as PortfolioReadingItem
    const dots = periodStripDots(item, 'en', new Date(2026, 7, 19))
    expect(dots).toHaveLength(4)
    expect(dots[0]?.key).toBe('2026-08')
    expect(dots[0]?.lit).toBe(true)
    expect(dots[1]?.key).toBe('2026-09')
    expect(dots[1]?.lit).toBe(true)
  })
})
