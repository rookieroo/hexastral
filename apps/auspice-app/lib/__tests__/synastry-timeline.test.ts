import { describe, expect, it } from 'bun:test'
import { buildSynastryTimeline, type SynastryBirth } from '../synastry-timeline'

const SELF: SynastryBirth = { solarDate: '1990-06-15', timeIndex: 6, gender: '男' }
const OTHER: SynastryBirth = { solarDate: '1992-03-20', timeIndex: 4, gender: '女' }

describe('buildSynastryTimeline', () => {
  it('returns nodes + notifications for two complete charts', () => {
    const r = buildSynastryTimeline(SELF, OTHER, { now: new Date('2026-06-05') })
    expect(r.nodes.length).toBeGreaterThan(0)
    // Every node is a 大运 or 流年 with a year + significance.
    for (const n of r.nodes) {
      expect(['大运', '流年']).toContain(n.type)
      expect(typeof n.year).toBe('number')
      expect(['major', 'notable', 'routine']).toContain(n.significance)
    }
    expect(Array.isArray(r.notifications)).toBe(true)
  })

  it('is empty when a chart is incomplete (no gender)', () => {
    expect(buildSynastryTimeline({ solarDate: '1990-06-15' }, OTHER).nodes).toHaveLength(0)
    expect(buildSynastryTimeline(SELF, null).nodes).toHaveLength(0)
  })

  it('handles a 农历 (lunar) 亲友 without throwing — the calendar-switch bug', () => {
    const lunar: SynastryBirth = {
      solarDate: '1992-03-20',
      timeIndex: 4,
      gender: '女',
      calendar: 'lunar',
    }
    const r = buildSynastryTimeline(SELF, lunar, { now: new Date('2026-06-05') })
    expect(r.nodes.length).toBeGreaterThan(0)
  })

  it('is deterministic — same inputs, same node count', () => {
    const opts = { now: new Date('2026-06-05') }
    const a = buildSynastryTimeline(SELF, OTHER, opts)
    const b = buildSynastryTimeline(SELF, OTHER, opts)
    expect(a.nodes.length).toBe(b.nodes.length)
  })
})
