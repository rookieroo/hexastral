/**
 * Unit tests for overlayHints + shuiKou derivation.
 */

import { describe, expect, test } from 'bun:test'
import { buildMacroTerrainTyped, buildOverlayHints, deriveShuiKou } from './feng-overlay-hints'

describe('deriveShuiKou', () => {
  test('picks lowest water palace', () => {
    const kou = deriveShuiKou(
      {
        laiLong: '乾',
        byPalace: {
          坎: { relativeM: -5, isMountain: false },
          兑: { relativeM: -20, isMountain: false },
          乾: { relativeM: 40, isMountain: true },
        },
      },
      [
        { kind: 'water', palace: '坎', bearingDeg: 0, distanceM: 100 },
        { kind: 'waterway', palace: '兑', bearingDeg: 270, distanceM: 80 },
      ]
    )
    expect(kou).toBe('兑')
  })

  test('null when no water azimuths', () => {
    expect(
      deriveShuiKou({ byPalace: { 坎: { relativeM: -10 } } }, [
        { kind: 'road', palace: '坎', bearingDeg: 0 },
      ])
    ).toBeNull()
  })
})

describe('buildOverlayHints', () => {
  test('includes formSha / water / sand / shuiKou', () => {
    const macro = buildMacroTerrainTyped({
      elevation: {
        laiLong: '乾',
        byPalace: {
          乾: { relativeM: 30, isMountain: true },
          兑: { relativeM: -15, isMountain: false },
        },
      },
      formAzimuths: [{ kind: 'water', palace: '兑', bearingDeg: 270, distanceM: 50 }],
    })
    const hints = buildOverlayHints({
      vision: {
        形煞: [{ type: '路冲', direction: '巽', severity: 4 }],
      },
      formAzimuths: [{ kind: 'water', palace: '兑', bearingDeg: 270, distanceM: 50 }],
      macro,
    })
    expect(hints.formSha[0]?.label).toBe('路冲')
    expect(hints.water.some((w) => w.palace === '兑')).toBe(true)
    expect(hints.sand.some((s) => s.palace === '乾' && s.label === '来龙')).toBe(true)
    expect(hints.shuiKou?.palace).toBe('兑')
  })
})
