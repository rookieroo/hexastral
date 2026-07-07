/**
 * Unit tests for CoinCast upgrade helpers (parse + access logic).
 */

import { describe, expect, test } from 'bun:test'

function parsePortfolioResultJson(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    /* fall through */
  }
  return {}
}

describe('parsePortfolioResultJson', () => {
  test('parses valid JSON object', () => {
    const result = parsePortfolioResultJson(
      JSON.stringify({ interpretationMode: 'classical', summary: 'test' })
    )
    expect(result.interpretationMode).toBe('classical')
    expect(result.summary).toBe('test')
  })

  test('returns empty object for invalid JSON', () => {
    expect(parsePortfolioResultJson('not-json')).toEqual({})
  })

  test('returns empty object for JSON array', () => {
    expect(parsePortfolioResultJson('[1,2]')).toEqual({})
  })
})

describe('upgrade merge shape', () => {
  test('preserves classical block when upgrading', () => {
    const previous = {
      interpretationMode: 'classical',
      classical: { judgment: '乾：元亨利贞。' },
      interpretation: 'zh explain',
    }
    const astro = {
      interpretationMode: 'ai',
      interpretation: 'AI text',
      advice: '1. step',
      summary: 'go',
      fortune: 'fortune',
      hexagram: { number: 1, name: '乾', changingLines: [] },
    }
    const merged = {
      ...previous,
      ...astro,
      interpretationMode: 'ai',
      classical: previous.classical,
      aiUpgradedAt: '2026-01-01T00:00:00.000Z',
    }
    expect(merged.classical).toEqual({ judgment: '乾：元亨利贞。' })
    expect(merged.interpretationMode).toBe('ai')
    expect(merged.interpretation).toBe('AI text')
  })
})
