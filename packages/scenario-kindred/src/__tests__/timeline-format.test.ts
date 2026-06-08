import { describe, expect, it } from 'bun:test'
import { formatNodeKind, formatNodeSummary } from '../lib/timeline-format'
import type { BondsTimelineNode } from '../types'

function liuyue(over: Partial<BondsTimelineNode> = {}): BondsTimelineNode {
  return {
    key: 'LY:2026:3',
    date: '2026-03-01',
    year: 2026,
    month: 3,
    kind: '流月',
    ganZhi: '辛卯',
    significance: 'notable',
    summary: '2026年3月 辛卯，与 小美 的关系本月流月互动显著。',
    bonds: [{ bondId: 'b1', name: '小美' }],
    ...over,
  }
}

describe('formatNodeKind — 流月', () => {
  it('localizes the monthly kind label', () => {
    expect(formatNodeKind('流月', 'zh')).toBe('流月')
    expect(formatNodeKind('流月', 'zh-Hant')).toBe('流月')
    expect(formatNodeKind('流月', 'ja')).toBe('流月')
    expect(formatNodeKind('流月', 'en')).toBe('Monthly')
  })
})

describe('formatNodeSummary — 流月', () => {
  it('zh returns the server summary verbatim', () => {
    const n = liuyue()
    expect(formatNodeSummary(n, 'zh')).toBe(n.summary)
  })

  it('notable month names the affected bond (en)', () => {
    const s = formatNodeSummary(liuyue(), 'en')
    expect(s).toContain('March 2026')
    expect(s).toContain('辛卯')
    expect(s).toContain('小美')
  })

  it('calm month (no bonds) reads as steady, never the "them" fallback', () => {
    const calm = liuyue({ bonds: [], significance: 'routine' })
    const en = formatNodeSummary(calm, 'en')
    expect(en).toContain('calm month')
    expect(en).not.toContain('them')
    const tw = formatNodeSummary(calm, 'zh-Hant')
    expect(tw).toContain('平穩')
    const ja = formatNodeSummary(calm, 'ja')
    expect(ja).toContain('穏やか')
  })
})
