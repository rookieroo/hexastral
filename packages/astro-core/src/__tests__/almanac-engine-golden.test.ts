/**
 * Golden vectors for Yuun Widget AlmanacEngine (Swift) parity.
 * Keep in sync with apps/auspice-app/targets/widget/AlmanacEngine.swift jianChu.
 */

import { describe, expect, test } from 'bun:test'
import { jianChu, TWELVE_OFFICERS } from '../almanac'
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
