import { describe, expect, it } from 'bun:test'
import {
  buildSynastryForwardMonths,
  buildSynastryTimeline,
  type SynastryBirth,
} from '../synastry-timeline'

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

describe('buildSynastryForwardMonths — light forward window (no Kindred overlap)', () => {
  const NOW = new Date('2026-06-05')

  it('returns exactly N forward 流月 nodes, none in the past', () => {
    const nodes = buildSynastryForwardMonths(SELF, OTHER, { months: 6, now: NOW })
    expect(nodes).toHaveLength(6)
    for (const n of nodes) {
      expect(n.type).toBe('流月')
      expect(typeof n.month).toBe('number')
    }
    // First node is the current month; the window is forward-only.
    expect(nodes[0]!.year).toBe(2026)
    expect(nodes[0]!.month).toBe(6)
    const seq = nodes.map((n) => `${n.year}-${n.month}`)
    expect(seq).toEqual(['2026-6', '2026-7', '2026-8', '2026-9', '2026-10', '2026-11'])
  })

  it('defaults to 6 months and handles a 农历 亲友', () => {
    const lunar: SynastryBirth = {
      solarDate: '1992-03-20',
      timeIndex: 4,
      gender: '女',
      calendar: 'lunar',
    }
    expect(buildSynastryForwardMonths(SELF, lunar, { now: NOW })).toHaveLength(6)
  })

  it('is empty when a chart is incomplete', () => {
    expect(buildSynastryForwardMonths({ solarDate: '1990-06-15' }, OTHER)).toHaveLength(0)
    expect(buildSynastryForwardMonths(SELF, null)).toHaveLength(0)
  })
})
