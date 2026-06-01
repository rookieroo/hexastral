import { describe, expect, it } from 'vitest'
import { signature } from './signature'
import type { Locale } from './types'

const LOCALES: Locale[] = ['zh', 'zh-Hant', 'en', 'ja', 'ko', 'de', 'es', 'vi', 'th']

describe('signature()', () => {
  it('produces compact display for CJK locales and stacked for others', () => {
    for (const locale of LOCALES) {
      const out = signature({
        dayMasterStem: '丙',
        dayMasterStrength: '极强',
        ziweiPalaceStar: '紫微',
        dominantTenGod: '七杀',
        locale,
      })
      const isCjk = locale === 'zh' || locale === 'zh-Hant' || locale === 'ja' || locale === 'ko'
      expect(out.display).toBe(isCjk ? 'compact' : 'stacked')
      expect(out.tokens).toHaveLength(3)
      expect(out.primary).toBeTruthy()
      expect(out.secondary).toBeTruthy()
    }
  })

  it('falls back to base archetype when no strength override exists', () => {
    const out = signature({
      dayMasterStem: '己',
      dayMasterStrength: '中和',
      ziweiPalaceStar: '天府',
      dominantTenGod: '正财',
      locale: 'en',
    })
    expect(out.primary).toBe('Tilled Soil')
    expect(out.secondary).toBe('Treasury')
    expect(out.tokens[2]).toBe('Steady Yield')
  })

  it('uses strength override when defined', () => {
    const out = signature({
      dayMasterStem: '丙',
      dayMasterStrength: '极强',
      ziweiPalaceStar: '紫微',
      dominantTenGod: '七杀',
      locale: 'en',
    })
    expect(out.primary).toBe('Scorching Sun')
  })

  it('omits secondary when palace star is 空宫', () => {
    const out = signature({
      dayMasterStem: '甲',
      dayMasterStrength: '中和',
      ziweiPalaceStar: '空宫',
      dominantTenGod: '食神',
      locale: 'en',
    })
    expect(out.secondary).toBeNull()
    expect(out.tokens).toHaveLength(2)
  })

  it('omits tertiary when dominantTenGod is null', () => {
    const out = signature({
      dayMasterStem: '甲',
      dayMasterStrength: '中和',
      ziweiPalaceStar: '紫微',
      dominantTenGod: null,
      locale: 'en',
    })
    expect(out.tokens).toHaveLength(2)
  })

  it('snapshots a 丙火极强 sun-king across all 9 locales', () => {
    const snap = LOCALES.map((locale) => ({
      locale,
      ...signature({
        dayMasterStem: '丙',
        dayMasterStrength: '极强',
        ziweiPalaceStar: '紫微',
        dominantTenGod: '七杀',
        locale,
      }),
    }))
    expect(snap).toMatchSnapshot()
  })
})
