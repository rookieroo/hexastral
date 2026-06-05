import { describe, expect, it } from 'bun:test'
import { buildTimelineNotificationPlan, TIMELINE_NOTIFY_ID_PREFIX } from '../lib/timeline-notify'
import type { BondsTimelineNotification } from '../types'

function notif(over: Partial<BondsTimelineNotification> = {}): BondsTimelineNotification {
  return {
    key: 'n1',
    fireDate: '2026-09-01T00:00:00.000Z',
    leadDays: 60,
    leadLabel: '两个月后',
    date: '2026-11-01',
    year: 2026,
    kind: '流年',
    significance: 'notable',
    summary: '2026年 关系迎来显著节点。',
    ...over,
  }
}

const NOW = new Date('2026-06-05T00:00:00.000Z')

describe('buildTimelineNotificationPlan', () => {
  it('builds one item per future notification with a stable, prefixed id', () => {
    const plan = buildTimelineNotificationPlan([notif()], { locale: 'zh', now: NOW })
    expect(plan).toHaveLength(1)
    expect(plan[0]!.identifier).toBe(`${TIMELINE_NOTIFY_ID_PREFIX}n1`)
    expect(plan[0]!.fireDate.toISOString()).toBe('2026-09-01T00:00:00.000Z')
    expect(plan[0]!.data).toEqual({ route: '/(timeline)', key: 'n1', year: '2026' })
  })

  it('drops notifications whose fireDate is in the past or now', () => {
    const past = notif({ key: 'past', fireDate: '2026-01-01T00:00:00.000Z' })
    const exactlyNow = notif({ key: 'now', fireDate: NOW.toISOString() })
    const future = notif({ key: 'future', fireDate: '2026-12-01T00:00:00.000Z' })
    const plan = buildTimelineNotificationPlan([past, exactlyNow, future], {
      locale: 'en',
      now: NOW,
    })
    expect(plan.map((p) => p.data.key)).toEqual(['future'])
  })

  it('drops unparseable fireDates without throwing', () => {
    const bad = notif({ key: 'bad', fireDate: 'not-a-date' })
    const ok = notif({ key: 'ok', fireDate: '2026-12-01T00:00:00.000Z' })
    const plan = buildTimelineNotificationPlan([bad, ok], { locale: 'ja', now: NOW })
    expect(plan.map((p) => p.data.key)).toEqual(['ok'])
  })

  it('de-dupes by node key (server may co-locate) — first future wins', () => {
    const a = notif({ key: 'dup', fireDate: '2026-09-01T00:00:00.000Z' })
    const b = notif({ key: 'dup', fireDate: '2026-10-01T00:00:00.000Z' })
    const plan = buildTimelineNotificationPlan([a, b], { locale: 'zh', now: NOW })
    expect(plan).toHaveLength(1)
    expect(plan[0]!.fireDate.toISOString()).toBe('2026-09-01T00:00:00.000Z')
  })

  it('returns an empty plan for an empty (free-tier) timetable', () => {
    expect(buildTimelineNotificationPlan([], { locale: 'en', now: NOW })).toEqual([])
  })

  it('localizes the body without leaking the zh-Hans server summary', () => {
    const en = buildTimelineNotificationPlan([notif()], { locale: 'en', now: NOW })
    expect(en[0]!.body).not.toContain('节点')
    expect(en[0]!.body).toContain('2026')
    const ja = buildTimelineNotificationPlan([notif({ kind: '大运' })], { locale: 'ja', now: NOW })
    expect(ja[0]!.body).toContain('大運')
  })

  it('honors a custom deep-link route', () => {
    const plan = buildTimelineNotificationPlan([notif()], {
      locale: 'zh',
      now: NOW,
      route: '/custom',
    })
    expect(plan[0]!.data.route).toBe('/custom')
  })
})
