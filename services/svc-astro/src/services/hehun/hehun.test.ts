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
import {
  computeRelationshipYongshen,
  fixRoleSwap,
  type HeHunChartSummary,
  parsePushSnippets,
  parseSynastryChaptersResponse,
  type SynastryChapterOutput,
} from './hehun'

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

describe('parsePushSnippets (ADR-0025 harvest)', () => {
  test('parses valid snippets and keeps the three triggers', () => {
    const raw = JSON.stringify({
      snippets: [
        { trigger: 'resonance', title: '高契合', body: '今天适合靠近' },
        { trigger: 'tension', title: '易摩擦', body: '今天话要慢说' },
        { trigger: 'neutral', title: '平稳', body: '维持就好' },
      ],
    })
    const out = parsePushSnippets(raw)
    expect(out).toHaveLength(3)
    expect(out.map((s) => s.trigger)).toEqual(['resonance', 'tension', 'neutral'])
  })

  test('coerces an unknown trigger to neutral', () => {
    const out = parsePushSnippets(
      JSON.stringify({ snippets: [{ trigger: 'whatever', title: 'a', body: 'b' }] })
    )
    expect(out[0]?.trigger).toBe('neutral')
  })

  test('drops snippets missing title or body', () => {
    const out = parsePushSnippets(
      JSON.stringify({
        snippets: [
          { trigger: 'resonance', title: '', body: 'b' },
          { trigger: 'resonance', title: 'a', body: '' },
          { trigger: 'resonance', title: 'a', body: 'b' },
        ],
      })
    )
    expect(out).toHaveLength(1)
  })

  test('extracts JSON from fenced prose, returns [] on garbage', () => {
    const fenced =
      '```json\n{ "snippets": [ { "trigger": "neutral", "title": "x", "body": "y" } ] }\n```'
    expect(parsePushSnippets(fenced)).toHaveLength(1)
    expect(parsePushSnippets('not json at all')).toEqual([])
    expect(parsePushSnippets(JSON.stringify({ snippets: 'nope' }))).toEqual([])
  })
})

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

describe('computeRelationshipYongshen', () => {
  test('克 → bridging 通关 element, order-independent (火克金 → 土)', () => {
    expect(computeRelationshipYongshen('火', '金').element).toBe('土')
    expect(computeRelationshipYongshen('金', '火').element).toBe('土')
  })

  test('克 → bridge for other pairs (木克土 → 火, 水克火 → 木)', () => {
    expect(computeRelationshipYongshen('木', '土').element).toBe('火')
    expect(computeRelationshipYongshen('水', '火').element).toBe('木')
  })

  test('比和 → 泄秀 (火·火 → 土)', () => {
    expect(computeRelationshipYongshen('火', '火').element).toBe('土')
  })

  test('相生 → flow outlet (木生火 → 土)', () => {
    expect(computeRelationshipYongshen('木', '火').element).toBe('土')
  })
})

describe('fixRoleSwap (甲方/乙方 cross-label guard)', () => {
  const A: HeHunChartSummary = {
    pillarsLabel: '',
    dayMaster: '乙',
    dayMasterWuXing: '木',
    gejuPrimary: '',
    dayMasterStrength: '',
  }
  const B: HeHunChartSummary = {
    pillarsLabel: '',
    dayMaster: '己',
    dayMasterWuXing: '土',
    gejuPrimary: '',
    dayMasterStrength: '',
  }
  const mkCh = (over: Partial<SynastryChapterOutput>): SynastryChapterOutput => ({
    kind: 'complement',
    title: 'T',
    goldenLine: 'G',
    body: 'B',
    ...over,
  })

  test('swapped chapter (甲方 bound to B day-master) is relabelled back', () => {
    const out = fixRoleSwap(
      mkCh({ evidence: '甲方己土日主受乙方乙木日主克制', body: '甲方己土宜静，乙方乙木宜柔' }),
      A,
      B
    )
    expect(out.evidence).toBe('乙方己土日主受甲方乙木日主克制')
    expect(out.body).toBe('乙方己土宜静，甲方乙木宜柔')
  })

  test('correct chapter (甲方 bound to A day-master) is left untouched', () => {
    const ch = mkCh({ evidence: '甲方乙木日主克乙方己土日主', body: '甲方乙木宜柔，乙方己土宜静' })
    const out = fixRoleSwap(ch, A, B)
    expect(out.evidence).toBe(ch.evidence)
    expect(out.body).toBe(ch.body)
  })

  test('same day-master pair → no-op (can not disambiguate)', () => {
    const ch = mkCh({ evidence: '甲方乙木受乙方乙木牵引', body: '甲方乙木宜柔' })
    const out = fixRoleSwap(ch, A, A)
    expect(out.evidence).toBe(ch.evidence)
    expect(out.body).toBe(ch.body)
  })
})
