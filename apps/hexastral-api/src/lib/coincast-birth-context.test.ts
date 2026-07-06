import { describe, expect, it } from 'bun:test'
import {
  buildCoincastBirthContext,
  coincastBirthPillarsSummary,
  hasCoincastBirthInfo,
} from './coincast-birth-context'

describe('coincast-birth-context', () => {
  it('hasCoincastBirthInfo requires solar date and time index', () => {
    expect(hasCoincastBirthInfo({ birthSolarDate: null, birthTimeIndex: 0, birthGender: '男' })).toBe(
      false
    )
    expect(
      hasCoincastBirthInfo({
        birthSolarDate: '1990-08-15',
        birthTimeIndex: 6,
        birthGender: '男',
      })
    ).toBe(true)
  })

  it('buildCoincastBirthContext returns markdown with four pillars', () => {
    const ctx = buildCoincastBirthContext({
      birthSolarDate: '1990-08-15',
      birthTimeIndex: 6,
      birthGender: '男',
    })
    expect(ctx).toContain('Four pillars:')
    expect(ctx).toContain('Day master')
    expect(ctx).toContain('never override hexagram')
  })

  it('coincastBirthPillarsSummary extracts pillar string', () => {
    const summary = coincastBirthPillarsSummary({
      birthSolarDate: '1990-08-15',
      birthTimeIndex: 6,
      birthGender: '女',
    })
    expect(typeof summary).toBe('string')
    expect(summary?.includes('·')).toBe(true)
  })

  it('returns empty when birth info incomplete', () => {
    expect(buildCoincastBirthContext({ birthSolarDate: '', birthTimeIndex: 0, birthGender: null })).toBe(
      ''
    )
  })
})
