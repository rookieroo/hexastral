/**
 * Offline eval for the synastry six-chapter parser (Phase 2 · T4).
 *
 * `parseSynastryChaptersResponse` is the deterministic half of chapter
 * generation — it turns the model's raw text into a validated, canonically
 * ordered SynastryChaptersResult. These fixtures pin its robustness contract
 * without a live LLM: ordering, dropping bad/partial chapters, title fallback,
 * ahaHook defaulting, JSON extraction from prose/fences, and hard failure on
 * unrecoverable output (so the route falls back to a chapter-less report).
 */

import { describe, expect, test } from 'bun:test'
import { parseSynastryChaptersResponse } from './hehun'

const KINDS = [
  'first_impression',
  'communication',
  'conflict',
  'complement',
  'monthly_outlook',
  'long_term_advice',
] as const

function chapter(kind: string, over: Record<string, unknown> = {}) {
  return { kind, title: `T-${kind}`, goldenLine: `G-${kind}`, body: `B-${kind}`, ...over }
}

function fullResponse(over: Record<string, unknown> = {}): string {
  return JSON.stringify({ ahaHook: 'AHA', chapters: KINDS.map((k) => chapter(k)), ...over })
}

describe('parseSynastryChaptersResponse', () => {
  test('parses a full six-chapter response in canonical order', () => {
    const r = parseSynastryChaptersResponse(fullResponse())
    expect(r.ahaHook).toBe('AHA')
    expect(r.chapters.map((c) => c.kind)).toEqual([...KINDS])
    expect(r.chapters).toHaveLength(6)
  })

  test('reassembles out-of-order chapters into canonical order', () => {
    const shuffled = [...KINDS].reverse().map((k) => chapter(k))
    const r = parseSynastryChaptersResponse(JSON.stringify({ ahaHook: 'x', chapters: shuffled }))
    expect(r.chapters.map((c) => c.kind)).toEqual([...KINDS])
  })

  test('drops unknown chapter kinds', () => {
    const r = parseSynastryChaptersResponse(
      JSON.stringify({ chapters: [chapter('first_impression'), chapter('bogus_kind')] })
    )
    expect(r.chapters.map((c) => c.kind)).toEqual(['first_impression'])
  })

  test('drops chapters missing a body', () => {
    const r = parseSynastryChaptersResponse(
      JSON.stringify({
        chapters: [chapter('first_impression', { body: '' }), chapter('communication')],
      })
    )
    expect(r.chapters.map((c) => c.kind)).toEqual(['communication'])
  })

  test('falls back to the canonical label when title is blank', () => {
    const r = parseSynastryChaptersResponse(
      JSON.stringify({ chapters: [chapter('conflict', { title: '' })] })
    )
    expect(r.chapters[0]?.title).toBe('冲突源头')
  })

  test('defaults ahaHook to empty string when absent', () => {
    const r = parseSynastryChaptersResponse(
      JSON.stringify({ chapters: [chapter('first_impression')] })
    )
    expect(r.ahaHook).toBe('')
  })

  test('extracts JSON wrapped in prose + markdown fences', () => {
    const wrapped = `Sure — here's the report:\n\`\`\`json\n${fullResponse()}\n\`\`\`\nHope it helps!`
    const r = parseSynastryChaptersResponse(wrapped)
    expect(r.chapters).toHaveLength(6)
  })

  test('throws on malformed / non-JSON output', () => {
    expect(() => parseSynastryChaptersResponse('not json at all')).toThrow()
  })

  test('throws when zero valid chapters are produced', () => {
    expect(() =>
      parseSynastryChaptersResponse(JSON.stringify({ ahaHook: 'x', chapters: [] }))
    ).toThrow()
    expect(() =>
      parseSynastryChaptersResponse(JSON.stringify({ chapters: [chapter('nope')] }))
    ).toThrow()
  })
})
