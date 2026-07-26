import { describe, expect, it } from 'bun:test'
import {
  TIMEZONE_POOL,
  canonicalizeTimezoneToPool,
  timezoneOffsetMinutes,
} from './index'

describe('canonicalizeTimezoneToPool', () => {
  it('leaves pool members unchanged', () => {
    for (const id of TIMEZONE_POOL) {
      expect(canonicalizeTimezoneToPool(id)).toBe(id)
    }
  })

  it('maps common UTC+8 aliases to Asia/Shanghai', () => {
    expect(canonicalizeTimezoneToPool('Asia/Hong_Kong')).toBe('Asia/Shanghai')
    expect(canonicalizeTimezoneToPool('Asia/Singapore')).toBe('Asia/Shanghai')
    expect(canonicalizeTimezoneToPool('Asia/Taipei')).toBe('Asia/Shanghai')
    expect(canonicalizeTimezoneToPool('Asia/Macau')).toBe('Asia/Shanghai')
  })

  it('maps Europe/Berlin to Europe/Paris', () => {
    expect(canonicalizeTimezoneToPool('Europe/Berlin')).toBe('Europe/Paris')
  })

  it('maps Asia/Seoul to Asia/Tokyo', () => {
    expect(canonicalizeTimezoneToPool('Asia/Seoul')).toBe('Asia/Tokyo')
  })

  it('falls back for empty / invalid to Europe/London', () => {
    expect(canonicalizeTimezoneToPool('')).toBe('Europe/London')
    expect(canonicalizeTimezoneToPool('Not/A_Real_Zone')).toBe('Europe/London')
  })

  it('matches by offset when alias missing but offset known', () => {
    // America/Nassau is Eastern — same offset as New_York when not on weird DST edge;
    // use a fixed winter date to avoid DST flakiness between zones.
    const winter = new Date('2026-01-15T12:00:00Z')
    const nassau = timezoneOffsetMinutes('America/Nassau', winter)
    const ny = timezoneOffsetMinutes('America/New_York', winter)
    expect(nassau).toBe(ny)
    expect(canonicalizeTimezoneToPool('America/Nassau', winter)).toBe('America/New_York')
  })
})
