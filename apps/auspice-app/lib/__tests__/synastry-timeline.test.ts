import { describe, expect, it } from 'bun:test'
import { resolveSolarInput, type SynastryBirth } from '../synastry-timeline'

describe('resolveSolarInput', () => {
  it('passes a solar birth through, mapping 时辰 index → hour', () => {
    const b: SynastryBirth = { solarDate: '1990-06-15', timeIndex: 6 }
    expect(resolveSolarInput(b)).toEqual({ year: 1990, month: 6, day: 15, hour: 12 })
  })

  it('defaults the hour to noon when 时辰 is unknown', () => {
    expect(resolveSolarInput({ solarDate: '1990-06-15' })).toEqual({
      year: 1990,
      month: 6,
      day: 15,
      hour: 12,
    })
  })

  it('converts a 农历 (lunar) birth to a solar date', () => {
    const lunar: SynastryBirth = { solarDate: '1992-03-20', timeIndex: 4, calendar: 'lunar' }
    const solar = resolveSolarInput(lunar)
    expect(solar).not.toBeNull()
    // 农历 1992-03-20 ≠ Gregorian 1992-03-20 — conversion must move the date.
    expect(`${solar?.year}-${solar?.month}-${solar?.day}`).not.toBe('1992-3-20')
    expect(solar?.hour).toBe(8)
  })

  it('returns null for missing or unparseable input', () => {
    expect(resolveSolarInput(null)).toBeNull()
    expect(resolveSolarInput(undefined)).toBeNull()
    expect(resolveSolarInput({ solarDate: '' })).toBeNull()
    expect(resolveSolarInput({ solarDate: 'not-a-date' })).toBeNull()
  })
})
