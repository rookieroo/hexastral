import { describe, expect, it } from 'bun:test'
import { getFourPillars } from '../ganzhi'
import { resolveBirthHour, shichenMidpointHour } from '../geo-time/birth-hour'

describe('shichenMidpointHour — 时辰中点 (修复旧的左边界 bug)', () => {
  const cases: Array<[number, number]> = [
    [0, 0], // 早子 00-01
    [1, 2], // 丑 01-03
    [2, 4], // 寅 03-05
    [3, 6], // 卯 05-07
    [4, 8], // 辰 07-09
    [5, 10], // 巳 09-11
    [6, 12], // 午 11-13
    [7, 14], // 未 13-15
    [8, 16], // 申 15-17
    [9, 18], // 酉 17-19
    [10, 20], // 戌 19-21
    [11, 22], // 亥 21-23
    [12, 23], // 晚子 23-24
  ]
  for (const [idx, hour] of cases) {
    it(`时辰 ${idx} → 中点小时 ${hour}`, () => {
      expect(shichenMidpointHour(idx)).toBe(hour)
    })
  }

  it('每个时辰的中点都落回它自己的地支 (中点不跨格)', () => {
    for (let idx = 0; idx <= 12; idx++) {
      const hour = shichenMidpointHour(idx)
      const branch = getFourPillars({ year: 2000, month: 6, day: 15, hour }).hour.branch
      // 早子(0)与晚子(12)都是子时
      const expected = idx === 0 || idx === 12 ? '子' : '子丑寅卯辰巳午未申酉戌亥'[idx]
      expect(branch).toBe(expected)
    }
  })
})

describe('resolveBirthHour — 时辰模式 (永不校准)', () => {
  it('用中点小时, mode=shichen, calibrated=false', () => {
    const r = resolveBirthHour({ year: 1995, month: 7, day: 15, timeIndex: 7 })
    expect(r.hour).toBe(14)
    expect(r.mode).toBe('shichen')
    expect(r.calibrated).toBe(false)
    expect(r.solarTimeResult).toBeUndefined()
  })

  it('核心反 bug 约束: 时辰模式即使在档有经纬度/时区也绝不校准、绝不跨格', () => {
    const withGeo = resolveBirthHour({
      year: 1995,
      month: 7,
      day: 15,
      timeIndex: 7,
      longitude: -122.4194,
      timezoneId: 'America/Los_Angeles',
      city: 'San Francisco',
    })
    const without = resolveBirthHour({ year: 1995, month: 7, day: 15, timeIndex: 7 })
    expect(withGeo.hour).toBe(without.hour) // 经度没有改变任何东西
    expect(withGeo.calibrated).toBe(false)
    expect(withGeo.mode).toBe('shichen')
  })

  it('中点小时落在正确的时辰地支上 (未时 → 未)', () => {
    const r = resolveBirthHour({ year: 1995, month: 7, day: 15, timeIndex: 7 })
    const pillars = getFourPillars({ year: 1995, month: 7, day: 15, hour: r.hour })
    expect(pillars.hour.branch).toBe('未')
  })

  it('timeIndex 缺失 → 退回早子时 (hour 0)', () => {
    const r = resolveBirthHour({ year: 2000, month: 1, day: 1 })
    expect(r.hour).toBe(0)
    expect(r.mode).toBe('shichen')
  })
})

describe('resolveBirthHour — 精确模式', () => {
  it('不校准: 直接用钟点小时/分钟', () => {
    const r = resolveBirthHour({
      year: 1995,
      month: 7,
      day: 15,
      clockMinutes: 14 * 60 + 30,
      calibrate: false,
      longitude: -74,
      timezoneId: 'America/New_York',
    })
    expect(r.hour).toBe(14)
    expect(r.minute).toBe(30)
    expect(r.mode).toBe('clock')
    expect(r.calibrated).toBe(false)
  })

  it('clockMinutes 覆盖 timeIndex (精确优先)', () => {
    const r = resolveBirthHour({
      year: 1995,
      month: 7,
      day: 15,
      timeIndex: 0, // 早子, 若被采用 hour=0
      clockMinutes: 16 * 60, // 16:00
      calibrate: false,
    })
    expect(r.hour).toBe(16)
    expect(r.mode).toBe('clock')
  })

  it('校准默认开: 有经度+时区 → calibrated=true + solarTimeResult', () => {
    const r = resolveBirthHour({
      year: 1995,
      month: 7,
      day: 15,
      clockMinutes: 14 * 60 + 30,
      longitude: -74.006,
      timezoneId: 'America/New_York',
      city: 'New York',
    })
    expect(r.calibrated).toBe(true)
    expect(r.mode).toBe('clock')
    expect(r.solarTimeResult).toBeDefined()
    expect(r.solarTimeResult?.displayNote).toContain('True Solar Time')
  })

  it('校准开但缺经度 → 无法校准, 退回原始钟点', () => {
    const r = resolveBirthHour({
      year: 1995,
      month: 7,
      day: 15,
      clockMinutes: 14 * 60 + 30,
      calibrate: true,
    })
    expect(r.calibrated).toBe(false)
    expect(r.hour).toBe(14)
    expect(r.mode).toBe('clock')
  })
})

describe('resolveBirthHour — 真太阳时校准结果 (锁定引擎修复，防回归到 UTC 叠加 bug)', () => {
  // 以下断言已验证与运行时时区无关 (UTC / Tokyo 输出一致)。
  const branchOf = (r: { year: number; month: number; day: number; hour: number }) =>
    getFourPillars({ year: r.year, month: r.month, day: r.day, hour: r.hour }).hour.branch

  it('纽约夏季 14:30 EDT → 真太阳时 13:xx (未时)', () => {
    const r = resolveBirthHour({
      year: 1995,
      month: 7,
      day: 15,
      clockMinutes: 14 * 60 + 30,
      longitude: -74.006,
      timezoneId: 'America/New_York',
      city: 'New York',
    })
    expect(r.hour).toBe(13)
    expect(branchOf(r)).toBe('未')
  })

  it('上海正午 → 真太阳时 12:xx (午时)，几乎不变', () => {
    const r = resolveBirthHour({
      year: 2024,
      month: 6,
      day: 21,
      clockMinutes: 12 * 60,
      longitude: 121.474,
      timezoneId: 'Asia/Shanghai',
      city: 'Shanghai',
    })
    expect(r.hour).toBe(12)
    expect(branchOf(r)).toBe('午')
  })

  it('成都 13:00 → 真太阳时 11:xx (午时)，西部经度拉回一格', () => {
    const r = resolveBirthHour({
      year: 1990,
      month: 3,
      day: 10,
      clockMinutes: 13 * 60,
      longitude: 104.066,
      timezoneId: 'Asia/Shanghai',
      city: 'Chengdu',
    })
    expect(r.hour).toBe(11)
    expect(branchOf(r)).toBe('午')
  })

  it('旧金山 15:05 PDT (申时钟点) → 真太阳时落到未时 (校准跨时辰)', () => {
    const r = resolveBirthHour({
      year: 1995,
      month: 7,
      day: 15,
      clockMinutes: 15 * 60 + 5,
      longitude: -122.4194,
      timezoneId: 'America/Los_Angeles',
      city: 'San Francisco',
    })
    expect(branchOf(r)).toBe('未')
  })
})
