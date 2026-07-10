import { describe, expect, test } from 'bun:test'
import {
  computeFlyingStars,
  describePalaceCombination,
  detectPatterns,
  isCompoundFacing,
} from '@zhop/astro-core'
import { deriveDataQuality } from './feng-analyze'
import { FENG_GOLDEN_SITES } from './feng-golden-sites'
import type { fengSites } from '../db/schema'

function baseSite(
  overrides: Partial<typeof fengSites.$inferSelect>
): typeof fengSites.$inferSelect {
  return {
    buildYearAccuracy: 'exact',
    buildYear: 2010,
    floorplanKey: null,
    floorplanJson: null,
    residenceType: 'apartment',
    floor: null,
    inputMeta: JSON.stringify({ facingConfirmed: true }),
    ...overrides,
  } as typeof fengSites.$inferSelect
}

describe('feng golden sites harness', () => {
  for (const site of FENG_GOLDEN_SITES) {
    test(`${site.id} computes flying stars when build year known`, () => {
      if (site.buildYearAccuracy === 'unknown') {
        expect(site.minInputScore).toBeLessThanOrEqual(35)
        return
      }
      const year = site.buildYear ?? 2000
      const fs = computeFlyingStars({
        buildYear: year,
        facingDegTrue: site.facingDegTrue,
        asOf: new Date('2026-06-01'),
      })
      expect(fs.sitMountain.name.length).toBeGreaterThan(0)
      expect(fs.faceMountain.name.length).toBeGreaterThan(0)
      const patterns = detectPatterns({
        yuanYun: fs.buildYuanYun.yuanYun,
        sitPalace: fs.sitMountain.palace,
        facePalace: fs.faceMountain.palace,
        periodChart: fs.periodChart,
        mountainChart: fs.mountainChart,
        facingChart: fs.facingChart,
      })
      expect(Array.isArray(patterns)).toBe(true)
    })
  }

  test(`golden set has ${FENG_GOLDEN_SITES.length} fixed coordinates`, () => {
    expect(FENG_GOLDEN_SITES.length).toBeGreaterThanOrEqual(10)
    const ids = new Set(FENG_GOLDEN_SITES.map((s) => s.id))
    expect(ids.size).toBe(FENG_GOLDEN_SITES.length)
  })

  test('兼向 172.6° triggers 替卦 chart method', () => {
    expect(isCompoundFacing(172.6)).toBe(true)
    const fs = computeFlyingStars({
      buildYear: 2004,
      facingDegTrue: 172.6,
      asOf: new Date('2026-06-01'),
    })
    expect(fs.isCompoundFacing).toBe(true)
    expect(fs.chartMethod).toBe('替卦')
  })

  test('下卦 facing inside mountain span uses 下卦', () => {
    expect(isCompoundFacing(180)).toBe(false)
    const fs = computeFlyingStars({
      buildYear: 2004,
      facingDegTrue: 180,
      asOf: new Date('2026-06-01'),
    })
    expect(fs.chartMethod).toBe('下卦')
  })

  test('unknown build year omits flying stars in data quality', () => {
    const dq = deriveDataQuality(
      baseSite({ buildYearAccuracy: 'unknown', buildYear: null, floorplanKey: null })
    )
    expect(dq.flyingStarsConfidence).toBe('omitted')
    expect(dq.notes.some((n) => n.includes('flying_stars_omitted'))).toBe(true)
    expect(dq.notes).toContain('floorplan=false')
  })

  test('no floorplan note when floorplan absent', () => {
    const dq = deriveDataQuality(baseSite({ floorplanKey: null, floorplanJson: null }))
    expect(dq.notes).toContain('floorplan=false')
  })

  test('二五交加 reads 衰 in 9运 (煞组合 not 旺 on 生气)', () => {
    const d = describePalaceCombination(2, 5, 9)
    expect(d.phase).toBe('衰')
    expect(d.reading).toMatch(/凶|病|煞/i)
  })

  test('deriveDataQuality penalizes legacy missing facingConfirmed in input_meta', () => {
    const site = baseSite({
      inputMeta: JSON.stringify({ pinOffsetM: 350, orientFacingDeltaDeg: 18 }),
    })
    const dq = deriveDataQuality(site)
    expect(dq.inputScore).toBeLessThan(60)
    expect(dq.notes.some((n) => n.includes('facing_confirmed=false'))).toBe(true)
    expect(dq.notes.some((n) => n.includes('pin_offset_m=350'))).toBe(true)
  })
})
