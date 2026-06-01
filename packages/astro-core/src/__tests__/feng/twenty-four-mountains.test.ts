/**
 * 二十四山 golden tests.
 *
 * Coverage:
 * 1. Table shape (24 entries, 12 阳 / 12 阴, 8 天元 / 8 人元 / 8 地元)
 * 2. Boundary degrees — 子 山 wraps around 0°
 * 3. mountainAtDegree edge cases at every 7.5° boundary
 * 4. sitMountainForFacing = facing + 180°
 * 5. 兼向 (compound facing) detector
 * 6. 洛书 round-trip
 */

import { describe, expect, test } from 'bun:test'
import {
  isCompoundFacing,
  LUOSHU_TO_PALACE,
  mountainAtDegree,
  normalizeDegree,
  PALACE_CENTERS,
  PALACE_LUOSHU,
  palaceAtDegree,
  sitMountainForFacing,
  TWENTY_FOUR_MOUNTAINS,
} from '../../feng/twenty-four-mountains'

describe('TWENTY_FOUR_MOUNTAINS table', () => {
  test('has exactly 24 entries', () => {
    expect(TWENTY_FOUR_MOUNTAINS).toHaveLength(24)
  })

  test('12 阳 / 12 阴', () => {
    const yang = TWENTY_FOUR_MOUNTAINS.filter((m) => m.yinYang === '阳').length
    const yin = TWENTY_FOUR_MOUNTAINS.filter((m) => m.yinYang === '阴').length
    expect(yang).toBe(12)
    expect(yin).toBe(12)
  })

  test('8 each of 天元 / 人元 / 地元', () => {
    const tian = TWENTY_FOUR_MOUNTAINS.filter((m) => m.dragon === '天元').length
    const ren = TWENTY_FOUR_MOUNTAINS.filter((m) => m.dragon === '人元').length
    const di = TWENTY_FOUR_MOUNTAINS.filter((m) => m.dragon === '地元').length
    expect(tian).toBe(8)
    expect(ren).toBe(8)
    expect(di).toBe(8)
  })

  test('each palace contains exactly 3 mountains, one per 三元龙', () => {
    const palaces: Array<'坎' | '艮' | '震' | '巽' | '离' | '坤' | '兑' | '乾'> = [
      '坎',
      '艮',
      '震',
      '巽',
      '离',
      '坤',
      '兑',
      '乾',
    ]
    for (const p of palaces) {
      const inPalace = TWENTY_FOUR_MOUNTAINS.filter((m) => m.palace === p)
      expect(inPalace).toHaveLength(3)
      const dragons = inPalace.map((m) => m.dragon).sort()
      expect(dragons).toEqual(['人元', '地元', '天元'])
    }
  })

  test('子 山 centers on 0° and wraps', () => {
    const zi = TWENTY_FOUR_MOUNTAINS[0]
    expect(zi?.name).toBe('子')
    expect(zi?.centerDeg).toBe(0)
    expect(zi?.startDeg).toBe(352.5)
    expect(zi?.endDeg).toBe(7.5)
  })
})

describe('mountainAtDegree', () => {
  test('center degree of every mountain returns that mountain', () => {
    for (const m of TWENTY_FOUR_MOUNTAINS) {
      expect(mountainAtDegree(m.centerDeg).name).toBe(m.name)
    }
  })

  test('handles the 子-山 wrap correctly', () => {
    expect(mountainAtDegree(0).name).toBe('子')
    expect(mountainAtDegree(359).name).toBe('子')
    expect(mountainAtDegree(355).name).toBe('子')
    expect(mountainAtDegree(7).name).toBe('子')
  })

  test('7.5° boundary lands on 癸 (next mountain east)', () => {
    expect(mountainAtDegree(7.5).name).toBe('癸')
  })

  test('22.5° boundary lands on 丑 (next palace)', () => {
    expect(mountainAtDegree(22.5).name).toBe('丑')
  })

  test('normalizes negative or overflow degrees', () => {
    expect(mountainAtDegree(-5).name).toBe('子') // -5° = 355°
    expect(mountainAtDegree(365).name).toBe('子') // 365° = 5°
    expect(mountainAtDegree(720).name).toBe('子') // 2 full rotations
  })

  test('palaceAtDegree matches mountainAtDegree.palace', () => {
    for (const deg of [0, 45, 90, 135, 180, 225, 270, 315]) {
      expect(palaceAtDegree(deg)).toBe(mountainAtDegree(deg).palace)
    }
  })
})

describe('sitMountainForFacing', () => {
  test('sit is 180° opposite the face', () => {
    expect(sitMountainForFacing(0).name).toBe('午') // face 子 → sit 午
    expect(sitMountainForFacing(180).name).toBe('子') // face 午 → sit 子
    expect(sitMountainForFacing(90).name).toBe('酉') // face 卯 → sit 酉
    expect(sitMountainForFacing(270).name).toBe('卯')
  })
})

describe('isCompoundFacing', () => {
  test('false at mountain center', () => {
    expect(isCompoundFacing(0)).toBe(false) // 子 center
    expect(isCompoundFacing(180)).toBe(false) // 午 center
  })

  test('true near palace boundary', () => {
    expect(isCompoundFacing(22.5)).toBe(true) // 癸/丑 boundary
    expect(isCompoundFacing(7.5)).toBe(true) // 子/癸 boundary
    expect(isCompoundFacing(7.4)).toBe(true) // just under boundary on 子 side
  })

  test('respects custom tolerance', () => {
    // 5° off center → outside default 2.5° tolerance, inside 5° tolerance
    expect(isCompoundFacing(5, 2.5)).toBe(false)
    expect(isCompoundFacing(5, 5)).toBe(true)
  })
})

describe('洛书 round-trip', () => {
  test('PALACE_LUOSHU and LUOSHU_TO_PALACE are inverses', () => {
    for (const palace of Object.keys(PALACE_LUOSHU) as Array<keyof typeof PALACE_LUOSHU>) {
      const n = PALACE_LUOSHU[palace]
      expect(LUOSHU_TO_PALACE[n]).toBe(palace)
    }
  })

  test('5 is absent (center palace)', () => {
    expect(Object.values(PALACE_LUOSHU)).not.toContain(5)
  })
})

describe('PALACE_CENTERS', () => {
  test('each palace is 45° apart', () => {
    expect(PALACE_CENTERS['坎']).toBe(0)
    expect(PALACE_CENTERS['艮']).toBe(45)
    expect(PALACE_CENTERS['震']).toBe(90)
    expect(PALACE_CENTERS['巽']).toBe(135)
    expect(PALACE_CENTERS['离']).toBe(180)
    expect(PALACE_CENTERS['坤']).toBe(225)
    expect(PALACE_CENTERS['兑']).toBe(270)
    expect(PALACE_CENTERS['乾']).toBe(315)
  })
})

describe('normalizeDegree', () => {
  test('idempotent on [0, 360)', () => {
    expect(normalizeDegree(0)).toBe(0)
    expect(normalizeDegree(359.99)).toBeCloseTo(359.99)
  })
  test('wraps negatives', () => {
    expect(normalizeDegree(-1)).toBe(359)
    expect(normalizeDegree(-360)).toBe(0)
  })
  test('wraps overflow', () => {
    expect(normalizeDegree(360)).toBe(0)
    expect(normalizeDegree(540)).toBe(180)
  })
})
