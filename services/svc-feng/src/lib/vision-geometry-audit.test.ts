import { describe, expect, test } from 'bun:test'
import { auditVisionGeometry } from '@zhop/astro-core'

describe('auditVisionGeometry (svc-feng matrix)', () => {
  test('downgrades near sha when close tile missing', () => {
    const out = auditVisionGeometry(
      {
        形煞: [
          {
            type: '路冲',
            direction: '巽',
            distance: 'near',
            severity: 4,
            evidence: 'highway',
          },
        ],
        砂: [],
        水: [],
        朝案: [],
      },
      {
        hasWater: false,
        hasMountain: false,
        flatUrban: true,
        nearestRoadBearingDeg: 140,
        closeTileRendered: false,
      }
    )
    expect(out.形煞[0]?.adjustedSeverity).toBeLessThanOrEqual(3)
  })

  test('nullifies road sha when road bearing mismatches palace', () => {
    const out = auditVisionGeometry(
      {
        形煞: [
          {
            type: '路冲',
            direction: '巽',
            distance: 'mid',
            severity: 5,
            evidence: 'road',
          },
        ],
        砂: [],
        水: [],
        朝案: [],
      },
      {
        hasWater: false,
        hasMountain: false,
        flatUrban: true,
        nearestRoadBearingDeg: 10,
        closeTileRendered: true,
      }
    )
    expect(out.形煞[0]?.geometrySupport).toBe('none')
    expect(out.形煞[0]?.adjustedSeverity).toBe(1)
  })

  test('flags river claim without prefetch water', () => {
    const out = auditVisionGeometry(
      {
        形煞: [],
        砂: [],
        水: [{ type: '河', direction: '坎', distance: 'mid', flow: 'in' }],
        朝案: [],
      },
      {
        hasWater: false,
        hasMountain: false,
        flatUrban: true,
        nearestRoadBearingDeg: null,
        closeTileRendered: true,
      }
    )
    expect(out.水[0]?.geometrySupport).toBe('inferred-only')
  })
})
