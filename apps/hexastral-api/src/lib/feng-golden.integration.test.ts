import { describe, expect, test } from 'bun:test'
import { detectPatterns, computeFlyingStars } from '@zhop/astro-core'
import { deriveDataQuality } from './feng-analyze'
import { FENG_GOLDEN_SITES } from './feng-golden-sites'
import type { fengSites } from '../db/schema'

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

  test('golden set has ten fixed coordinates', () => {
    expect(FENG_GOLDEN_SITES).toHaveLength(10)
    const ids = new Set(FENG_GOLDEN_SITES.map((s) => s.id))
    expect(ids.size).toBe(10)
  })

  test('deriveDataQuality penalizes legacy missing facingConfirmed in input_meta', () => {
    const site = {
      buildYearAccuracy: 'exact',
      buildYear: 2010,
      floorplanKey: null,
      floorplanJson: null,
      residenceType: 'apartment',
      floor: null,
      inputMeta: JSON.stringify({ pinOffsetM: 350, orientFacingDeltaDeg: 18 }),
    } as typeof fengSites.$inferSelect
    const dq = deriveDataQuality(site)
    expect(dq.inputScore).toBeLessThan(60)
    expect(dq.notes.some((n) => n.includes('facing_confirmed=false'))).toBe(true)
    expect(dq.notes.some((n) => n.includes('pin_offset_m=350'))).toBe(true)
  })
})
