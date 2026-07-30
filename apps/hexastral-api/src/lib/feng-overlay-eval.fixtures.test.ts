/**
 * ≥2 mock sites: overlayHints palace must match palaceAtDegree(bearingDeg).
 */

import { describe, expect, test } from 'bun:test'
import { palaceAtDegree } from '@zhop/astro-core'
import siteA from './__fixtures__/feng-overlay-site-a.json'
import siteB from './__fixtures__/feng-overlay-site-b.json'
import { buildMacroTerrainTyped, buildOverlayHints } from './feng-overlay-hints'

type FixtureSite = {
  id: string
  formAzimuths: Array<{
    kind: string
    palace: string
    bearingDeg: number
    distanceM: number
  }>
  elevation: {
    laiLong?: string | null
    byPalace: Record<string, { relativeM?: number; isMountain?: boolean }>
  }
  vision: { 形煞?: Array<{ type: string; direction: string; severity?: number }> }
}

const SITES: FixtureSite[] = [siteA, siteB]

describe('feng overlay eval fixtures (≥2 sites)', () => {
  test('fixtures cover at least two sites', () => {
    expect(SITES.length).toBeGreaterThanOrEqual(2)
  })

  for (const site of SITES) {
    test(`${site.id}: formAzimuths palace matches bearingDeg`, () => {
      for (const az of site.formAzimuths) {
        expect(palaceAtDegree(az.bearingDeg)).toBe(az.palace)
      }
    })

    test(`${site.id}: overlayHints water/formSha palace ↔ bearing`, () => {
      const macro = buildMacroTerrainTyped({
        elevation: site.elevation,
        formAzimuths: site.formAzimuths,
      })
      const hints = buildOverlayHints({
        vision: site.vision,
        formAzimuths: site.formAzimuths,
        macro,
      })

      for (const w of hints.water) {
        expect(palaceAtDegree(w.bearingDeg)).toBe(w.palace)
      }
      for (const s of hints.formSha) {
        expect(palaceAtDegree(s.bearingDeg)).toBe(s.palace)
      }
      if (hints.shuiKou) {
        expect(Object.keys(macro.waterByPalace)).toContain(hints.shuiKou.palace)
      }
    })
  }
})
