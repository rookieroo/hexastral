import { describe, expect, it } from 'bun:test'
import { getJieQiInstant, getYearJieQi } from '../jieqi'
import { apparentSolarLongitude, dateToJulianDay, deltaTSeconds } from '../solar-longitude'

const NAMES = [
  '小寒',
  '大寒',
  '立春',
  '雨水',
  '惊蛰',
  '春分',
  '清明',
  '谷雨',
  '立夏',
  '小满',
  '芒种',
  '夏至',
  '小暑',
  '大暑',
  '立秋',
  '处暑',
  '白露',
  '秋分',
  '寒露',
  '霜降',
  '立冬',
  '小雪',
  '大雪',
  '冬至',
] as const

/** target solar longitude (°) for year-order index i: 285 + 15·i (mod 360). */
const targetLongitude = (i: number): number => (285 + 15 * i) % 360

/** UTC ms for a Beijing-time (UTC+8) wall-clock datetime. */
const cstMs = (y: number, mo: number, d: number, h: number, mi: number): number =>
  Date.UTC(y, mo - 1, d, h - 8, mi)

/**
 * Authoritative 2024 节气 in Beijing time (UTC+8).
 * Source: National Astronomical Observatory of Japan koyomi (JST) − 1h; the four
 * cardinal points cross-checked against the published UTC equinox/solstice times.
 * [name, idx, month, day, hour, minute]
 */
const JIEQI_2024_CST: ReadonlyArray<[string, number, number, number, number, number]> = [
  ['小寒', 0, 1, 6, 4, 49],
  ['大寒', 1, 1, 20, 22, 7],
  ['立春', 2, 2, 4, 16, 27],
  ['雨水', 3, 2, 19, 12, 13],
  ['惊蛰', 4, 3, 5, 10, 23],
  ['春分', 5, 3, 20, 11, 6],
  ['清明', 6, 4, 4, 15, 2],
  ['谷雨', 7, 4, 19, 22, 0],
  ['立夏', 8, 5, 5, 8, 10],
  ['小满', 9, 5, 20, 21, 0],
  ['芒种', 10, 6, 5, 12, 10],
  ['夏至', 11, 6, 21, 4, 51],
  ['小暑', 12, 7, 6, 22, 20],
  ['大暑', 13, 7, 22, 15, 44],
  ['立秋', 14, 8, 7, 8, 9],
  ['处暑', 15, 8, 22, 22, 55],
  ['白露', 16, 9, 7, 11, 11],
  ['秋分', 17, 9, 22, 20, 44],
  ['寒露', 18, 10, 8, 3, 0],
  ['霜降', 19, 10, 23, 6, 15],
  ['立冬', 20, 11, 7, 6, 20],
  ['小雪', 21, 11, 22, 3, 56],
  ['大雪', 22, 12, 6, 23, 17],
  ['冬至', 23, 12, 21, 17, 21],
]

describe('apparentSolarLongitude', () => {
  it('crosses exactly the target longitude at each computed 2024 节气 instant', () => {
    for (let i = 0; i < 24; i++) {
      const inst = getJieQiInstant(2024, i)!
      const jdeTT = dateToJulianDay(inst) + deltaTSeconds(2024) / 86400
      const lon = apparentSolarLongitude(jdeTT)
      let diff = ((lon - targetLongitude(i) + 180) % 360) - 180
      if (diff < -180) diff += 360
      expect(Math.abs(diff)).toBeLessThan(0.001)
    }
  })
})

describe('节气 precise instants vs authoritative 2024 table (UTC+8)', () => {
  for (const [name, idx, mo, d, h, mi] of JIEQI_2024_CST) {
    it(`${name} 2024 matches NAO to within 3 minutes`, () => {
      const inst = getJieQiInstant(2024, idx)!
      const expected = cstMs(2024, mo, d, h, mi)
      const diffMin = Math.abs(inst.getTime() - expected) / 60000
      expect(diffMin).toBeLessThanOrEqual(3)
      // Beijing-time calendar day must be exact (the whole point of the fix).
      const cst = new Date(inst.getTime() + 8 * 3600 * 1000)
      expect(cst.getUTCDate()).toBe(d)
      expect(cst.getUTCMonth() + 1).toBe(mo)
    })
  }
})

describe('节气 anchors that downstream tests depend on', () => {
  it('立夏 2006 falls on May 5 (UTC+8) — index.test getJieQiDay golden', () => {
    const cst = new Date(getJieQiInstant(2006, 8)!.getTime() + 8 * 3600 * 1000)
    expect(cst.getUTCMonth() + 1).toBe(5)
    expect(cst.getUTCDate()).toBe(5)
  })

  it('立夏 2026 = May 5, 小满 2026 = May 21 (UTC+8) — 立夏 segment golden', () => {
    const lixia = new Date(getJieQiInstant(2026, 8)!.getTime() + 8 * 3600 * 1000)
    const xiaoman = new Date(getJieQiInstant(2026, 9)!.getTime() + 8 * 3600 * 1000)
    expect([lixia.getUTCMonth() + 1, lixia.getUTCDate()]).toEqual([5, 5])
    expect([xiaoman.getUTCMonth() + 1, xiaoman.getUTCDate()]).toEqual([5, 21])
  })
})

describe('节气 structural invariants across a wide year range', () => {
  for (const year of [1920, 1950, 1984, 2000, 2024, 2050, 2099]) {
    it(`${year}: 24 terms, monotonic, ~15-day spacing, correct months`, () => {
      const terms = getYearJieQi(year)
      expect(terms).toHaveLength(24)

      let prev = getJieQiInstant(year, 0)!.getTime()
      for (let i = 1; i < 24; i++) {
        const cur = getJieQiInstant(year, i)!.getTime()
        expect(cur).toBeGreaterThan(prev)
        const gapDays = (cur - prev) / 86_400_000
        expect(gapDays).toBeGreaterThan(13)
        expect(gapDays).toBeLessThan(17)
        prev = cur
      }

      for (let i = 0; i < 24; i++) {
        expect(terms[i]!.jieqi.name).toBe(NAMES[i]!)
        expect(terms[i]!.month).toBe(Math.floor(i / 2) + 1)
        const cstMonth =
          new Date(getJieQiInstant(year, i)!.getTime() + 8 * 3600 * 1000).getUTCMonth() + 1
        expect(cstMonth).toBe(Math.floor(i / 2) + 1)
      }
    })
  }
})
