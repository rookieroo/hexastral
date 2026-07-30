/**
 * Golden vectors for Yuun Widget AlmanacEngine (Swift) parity.
 * Keep in sync with apps/auspice-app/targets/widget/AlmanacEngine.swift jianChu + officerYiJi.
 */

import { describe, expect, test } from 'bun:test'
import { jianChu, OFFICER_YIJI, TWELVE_OFFICERS } from '../almanac'
import type { EarthlyBranch } from '../types'

const BRANCHES: EarthlyBranch[] = [
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥',
]

/** Mirror AlmanacEngine.officerYiJi — first 2 good + first 2 bad joined with " · ". */
function swiftOfficerPrefix(officer: keyof typeof OFFICER_YIJI): { yi: string; ji: string } {
  const row = OFFICER_YIJI[officer]
  return {
    yi: row.good.slice(0, 2).join(' · '),
    ji: row.bad.slice(0, 2).join(' · '),
  }
}

describe('AlmanacEngine Swift golden (jianChu)', () => {
  test('anchors used by AlmanacEngine.goldenJianChuOk', () => {
    expect(jianChu('寅', '寅')).toBe('建')
    expect(jianChu('寅', '卯')).toBe('除')
    expect(jianChu('寅', '丑')).toBe('闭')
  })

  test('full 寅月 cycle matches TWELVE_OFFICERS', () => {
    const seq = Array.from({ length: 12 }, (_, i) => jianChu('寅', BRANCHES[(2 + i) % 12]!))
    expect(seq).toEqual([...TWELVE_OFFICERS])
  })
})

describe('AlmanacEngine Swift golden (officerYiJi prefix)', () => {
  test('建日 prefix matches OFFICER_YIJI (was historically drifted)', () => {
    expect(swiftOfficerPrefix('建')).toEqual({
      yi: '出行 · 祈福',
      ji: '动土 · 破土',
    })
  })

  test('every officer’s first two verbs are stable prefixes of OFFICER_YIJI', () => {
    for (const officer of TWELVE_OFFICERS) {
      const row = OFFICER_YIJI[officer]
      const prefix = swiftOfficerPrefix(officer)
      expect(row.good.join(' · ').startsWith(prefix.yi)).toBe(true)
      expect(row.bad.join(' · ').startsWith(prefix.ji)).toBe(true)
    }
  })
})
