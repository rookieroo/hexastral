import { describe, expect, test } from 'bun:test'
import type { AuspiceBirthInfo } from '../birth'
import {
  birthInfosEqual,
  fromPortfolioBirth,
  toPortfolioBirth,
} from '../birth-account-mapping'

describe('birth-account-mapping', () => {
  const sample: AuspiceBirthInfo = {
    solarDate: '1990-05-06',
    calendar: 'lunar',
    lunarInput: '1990-04-12',
    lunarIsLeap: false,
    timeIndex: null,
    gender: '女',
    city: 'Shanghai',
    lat: 31.2,
    lng: 121.5,
    timezone: 'Asia/Shanghai',
    clockMinutes: null,
    calibrate: true,
  }

  test('round-trips through portfolio shape', () => {
    const remote = toPortfolioBirth(sample)
    expect(remote.birthSolarDate).toBe('1990-05-06')
    expect(remote.birthTimeIndex).toBeNull()
    const back = fromPortfolioBirth(remote)
    expect(birthInfosEqual(sample, back)).toBe(true)
  })

  test('detects timeIndex change as unequal', () => {
    expect(birthInfosEqual(sample, { ...sample, timeIndex: 3 })).toBe(false)
  })
})
