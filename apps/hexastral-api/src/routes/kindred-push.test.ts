import { describe, expect, test } from 'bun:test'
import { dayGanZhi, getFourPillars } from '@zhop/astro-core'
import { kindredPushRoutes, pickStrongestBond } from './kindred-push'

// The handler reads only `c.env.INTERNAL_KEY` + `c.get('db')`. Run in isolation
// (no dbMiddleware) so `db` is undefined → the empty-response branch, which lets
// us cover auth + param guards without a D1 binding.
const ENV = { INTERNAL_KEY: 'test-key' }

describe('GET /api/kindred/push/targets — auth + guards', () => {
  test('401 without the internal key', async () => {
    const res = await kindredPushRoutes.request('/targets?timezoneId=Asia/Shanghai&date=2026-06-18')
    expect(res.status).toBe(401)
  })

  test('401 with a wrong internal key', async () => {
    const res = await kindredPushRoutes.request(
      '/targets?timezoneId=Asia/Shanghai&date=2026-06-18',
      { headers: { 'X-Internal-Key': 'nope' } },
      ENV
    )
    expect(res.status).toBe(401)
  })

  test('400 when timezoneId / date are missing or malformed', async () => {
    const bad = await kindredPushRoutes.request(
      '/targets',
      { headers: { 'X-Internal-Key': 'test-key' } },
      ENV
    )
    expect(bad.status).toBe(400)
    const badDate = await kindredPushRoutes.request(
      '/targets?timezoneId=Asia/Shanghai&date=2026-6-1',
      { headers: { 'X-Internal-Key': 'test-key' } },
      ENV
    )
    expect(badDate.status).toBe(400)
  })

  test('200 with empty messages when no db is bound', async () => {
    const res = await kindredPushRoutes.request(
      '/targets?timezoneId=Asia/Shanghai&date=2026-06-18',
      { headers: { 'X-Internal-Key': 'test-key' } },
      ENV
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.data.messages).toEqual([])
    expect(body.data.nextCursor).toBeNull()
  })
})

describe('pickStrongestBond', () => {
  const self = getFourPillars({ year: 1990, month: 8, day: 15, hour: 12 })
  const gz = dayGanZhi(2026, 6, 18)

  test('returns null with no bonds', () => {
    expect(pickStrongestBond(self, [], gz, '2026-06-18')).toBeNull()
  })

  test('picks one bond and returns a valid status', () => {
    const bonds = [
      { bondId: 'a', pillars: getFourPillars({ year: 1992, month: 3, day: 3, hour: 12 }) },
      { bondId: 'b', pillars: getFourPillars({ year: 1988, month: 11, day: 20, hour: 12 }) },
    ]
    const out = pickStrongestBond(self, bonds, gz, '2026-06-18')
    expect(out).not.toBeNull()
    expect(['a', 'b']).toContain(out?.bondId)
    expect(['resonance', 'tension', 'neutral']).toContain(out?.status)
  })

  test('is deterministic for the same inputs', () => {
    const bonds = [
      { bondId: 'x', pillars: getFourPillars({ year: 1992, month: 3, day: 3, hour: 12 }) },
    ]
    expect(pickStrongestBond(self, bonds, gz, '2026-06-18')).toEqual(
      pickStrongestBond(self, bonds, gz, '2026-06-18')
    )
  })
})
