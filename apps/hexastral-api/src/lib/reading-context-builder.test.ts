import { describe, expect, it } from 'bun:test'
import { type ReadingContextBundle, trimContextBundle } from './reading-context-builder'

function makeBundle(over: Partial<ReadingContextBundle> = {}): ReadingContextBundle {
  return {
    user: { name: 'Tester', locale: 'zh', birthInfo: null, plan: 'monthly' },
    primary: { type: 'feng', text: 'short primary' },
    related: [],
    memory: { context: '', hitCount: 0 },
    ...over,
  }
}

describe('trimContextBundle', () => {
  it('keeps a small bundle intact', () => {
    const { bundle, droppedLayers } = trimContextBundle(makeBundle())
    expect(droppedLayers).toEqual([])
    expect(bundle.primary.text).toBe('short primary')
    expect(bundle.user.name).toBe('Tester')
  })

  it('drops L4 memory first, then truncates L1 — and always keeps the L2 user brief', () => {
    const { bundle, droppedLayers } = trimContextBundle(
      makeBundle({
        primary: { type: 'feng', text: 'x'.repeat(5000) },
        memory: { context: 'mem '.repeat(200), hitCount: 3 },
      })
    )
    expect(droppedLayers[0]).toBe('l4-memory')
    expect(droppedLayers).toContain('l1-truncated')
    expect(bundle.memory.context).toBe('')
    expect(bundle.primary.text.length).toBeLessThanOrEqual(1500)
    // L2 is never dropped.
    expect(bundle.user.name).toBe('Tester')
    expect(bundle.user.plan).toBe('monthly')
  })

  it('drops the oldest related reading first, keeping the recent one (no over-trim)', () => {
    const { bundle, droppedLayers } = trimContextBundle(
      makeBundle({
        primary: { type: 'report', text: 'y'.repeat(3800) },
        related: [
          { type: 'natal', summary: 'natal-current', ageDays: 0 },
          { type: 'stellar', summary: 'z'.repeat(300), ageDays: 40 },
        ],
      })
    )
    expect(droppedLayers).toEqual(['l3-stellar'])
    expect(bundle.related.map((r) => r.type)).toEqual(['natal'])
    expect(bundle.primary.text.length).toBe(3800)
  })

  it("'free' tier drops layers that 'pro' keeps (smaller budget)", () => {
    const b = makeBundle({
      primary: { type: 'feng', text: 'x'.repeat(1000) },
      related: [{ type: 'stellar', summary: 'z'.repeat(100), ageDays: 10 }],
      memory: { context: 'mem '.repeat(50), hitCount: 2 },
    })
    expect(trimContextBundle(b, 'pro').droppedLayers).toEqual([])
    expect(trimContextBundle(b, 'free').droppedLayers).toContain('l4-memory')
  })

  it("'universe' tier keeps memory that 'pro' trims (bigger budget)", () => {
    const b = makeBundle({
      primary: { type: 'feng', text: 'x'.repeat(4500) },
      memory: { context: 'mem '.repeat(100), hitCount: 5 },
    })
    expect(trimContextBundle(b, 'pro').droppedLayers).toContain('l4-memory')
    const universe = trimContextBundle(b, 'universe')
    expect(universe.droppedLayers).toEqual([])
    expect(universe.bundle.memory.context.length).toBeGreaterThan(0)
  })
})
