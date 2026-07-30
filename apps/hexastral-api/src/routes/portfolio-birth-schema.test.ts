/**
 * Contract: Yuun `toPortfolioBirth` payloads must parse with the API schema.
 * Guards the signed-in birth sync path that previously 422'd on device.
 */

import { describe, expect, it } from 'bun:test'
import { portfolioBirthInfoSchema } from './portfolio'

const CALLER = { targetApp: 'auspice', installationId: 'install-test-1' }

describe('portfolioBirthInfoSchema ↔ Yuun birth payloads', () => {
  it('accepts 时辰-only (null city / coords / clock)', () => {
    const parsed = portfolioBirthInfoSchema.safeParse({
      ...CALLER,
      birthSolarDate: '1990-05-15',
      birthTimeIndex: 3,
      gender: '男',
      birthCity: null,
      birthLatitude: null,
      birthLongitude: null,
      birthTimezoneId: null,
      birthClockMinutes: null,
      birthSolarCalibrate: null,
      birthCalendarType: 'solar',
    })
    expect(parsed.success).toBe(true)
  })

  it('accepts precise clock + city (true solar time fields)', () => {
    const parsed = portfolioBirthInfoSchema.safeParse({
      ...CALLER,
      birthSolarDate: '1990-05-15',
      // 10:30 → hour 10 → derived 时辰 index 5
      birthTimeIndex: 5,
      gender: '女',
      birthCity: '上海',
      birthLatitude: '31.2304',
      birthLongitude: '121.4737',
      birthTimezoneId: 'Asia/Shanghai',
      birthClockMinutes: 630,
      birthSolarCalibrate: true,
      birthCalendarType: 'solar',
    })
    expect(parsed.success).toBe(true)
  })

  it('accepts lunar calendar round-trip fields', () => {
    const parsed = portfolioBirthInfoSchema.safeParse({
      ...CALLER,
      birthSolarDate: '1990-06-07',
      birthTimeIndex: null,
      gender: '女',
      birthCity: null,
      birthLatitude: null,
      birthLongitude: null,
      birthTimezoneId: null,
      birthClockMinutes: null,
      birthSolarCalibrate: null,
      birthCalendarType: 'lunar',
      birthLunarInput: '1990-04-14',
      birthLunarIsLeap: false,
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects contradictory birthTimeIndex when clock is set', () => {
    const parsed = portfolioBirthInfoSchema.safeParse({
      ...CALLER,
      birthSolarDate: '1990-05-15',
      birthTimeIndex: 0,
      birthClockMinutes: 630,
    })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.includes('birthTimeIndex'))).toBe(true)
    }
  })
})
