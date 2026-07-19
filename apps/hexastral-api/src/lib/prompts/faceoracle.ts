/**
 * FaceOracle LLM prompt — Xingqi canonical stack (ADR-0028).
 *
 * Product identity: folk 算命 toolkit — face + palms + BaZi 互证.
 * Six-chapter craft: per-chapter focus + volume; life-horizon = 后半场大运带.
 * Hard-forbidden phrases are audited post-generation (portfolio-voice), not in prompt.
 *
 * Locale: Route B via faceoracle-locale (Yuun/Yuel parity).
 */

import { buildFaceoracleLanguageBlock } from './faceoracle-locale'

export type FaceOracleOutputKind = 'oneshot' | 'period_brief' | 'deep'

export type FaceOracleChapterKind =
  | 'overview'
  | 'face'
  | 'palms'
  | 'natal'
  | 'period'
  | 'advice'

export type FaceOracleLifeAxis = 'career' | 'love' | 'health'

export interface FaceOraclePromptParams {
  faceFeatures: string
  palmLeftFeatures: string
  palmRightFeatures: string
  natalSummary: string
  locale: string
  horizonMonths: 3 | 6
  outputKind: FaceOracleOutputKind
  previousFeaturesJson?: string
  partialUpdate?: Array<'face' | 'palm_l' | 'palm_r'>
}

const CORE = [
  '## Craft',
  'Folk 算命: always 面相 + 掌相 + 八字互证. Quote concrete keys from the inputs.',
  'Sharp master voice: pick a side, tell the truth, develop mechanism in full paragraphs.',
  'AHA first: one claim that only fits THIS person (locus + 大运/流年 + sided judgment), then expand — not a slogan card.',
  'Time: near window (本流年 / 1–3y) + 后半场大运带 from NatalSummary dayunTrail (current step onward, ~20–40y).',
  'Deepen 2–4 life scenes the chart/form actually hits; skip the rest. Do not spray every decade step as labels.',
  'evidence ≠ dynamic. Reef = concrete risk; remedy = doable step when relevant.',
].join('\n')

const SCHOOL = [
  'Stack: Face 三停五岳十二宫五官气色; Palm 主纹+丘位; Natal 日主用神通关五行大运流年.',
  'Not a natal-only 命书. Not a calendar-only 黄历.',
].join(' ')

/** Per-chapter focus + Chinese body floors (evidence+dynamic+reef+remedy). */
const CHAPTER_SPEC = [
  '## Six chapters (follow focus + volume; no reused goldenLine across chapters)',
  'overview — 形气总象 + 1 full-report AHA (locus×大运); 1 shortcoming; one line setting 后半场 tone. Body 280–400 字.',
  'face — 三停五岳十二宫; form evidence primary; ≥3 citations; touch love OR health once. Body 300–450 字.',
  'palms — 主纹+丘; MUST cite 生命线 AND 感情线/婚姻线; ≥3 citations; one form↔chart corroboration. Body 300–450 字.',
  'natal — 日主用神 × 形互证; open 后半场大运带; ≥2 form↔pillar; 2–3 dayun-segment theme contrasts. Body 320–480 字.',
  'period — TIME MAIN: near window + 后半场大运带; events 3–6 mixing near+far; deepen 2–3 scenes. Body 360–520 字.',
  'advice — ACTIONS only: near doables + 后半场 prepare/close; ≥1 action per career/love/health; no period re-narration. Body 300–450 字.',
].join('\n')

function outputKindHint(kind: FaceOracleOutputKind): string {
  switch (kind) {
    case 'period_brief':
      return 'OutputKind: period_brief — all 6 chapters; extra density in period + events + form↔chart.'
    case 'deep':
      return 'OutputKind: deep — maximum concrete citation density across face/palms/natal 互证.'
    default:
      return 'OutputKind: oneshot — full 6-chapter folk 算命 brief; no shortcuts.'
  }
}

export function buildFaceOraclePrompt(params: FaceOraclePromptParams): string {
  const lines = [
    'Role: Folk East-Asian 算命 interpreter — face + palms + BaZi 互证 (Xingqi).',
    CORE,
    SCHOOL,
    CHAPTER_SPEC,
    `OutputKind: ${params.outputKind}`,
    outputKindHint(params.outputKind),
    `HorizonMonths: ${params.horizonMonths} (near window; still write 后半场大运带 in natal/period/advice).`,
    buildFaceoracleLanguageBlock(params.locale),
    '',
    'Return STRICT JSON with this shape (prefer chapters; flat keys optional fallback):',
    '{',
    '  "chapters": [',
    '    {',
    '      "kind": "overview" | "face" | "palms" | "natal" | "period" | "advice",',
    '      "goldenLine": string,',
    '      "evidence": string,',
    '      "dynamic": string,',
    '      "reef": string | null,',
    '      "remedy": string | null,',
    '      "counterpoint": string | null,',
    '      "citations": Array<{ "locus": string, "note": string }>',
    '    }',
    '  ],',
    '  "overview": string,',
    '  "faceSection": string,',
    '  "palmLeftSection": string,',
    '  "palmRightSection": string,',
    '  "natalContrast": string,',
    '  "periodDiff": string | null,',
    '  "advice": string,',
    '  "events": Array<{',
    '    "startMonth": "YYYY-MM",',
    '    "endMonth": "YYYY-MM" | null,',
    '    "theme": string,',
    '    "note": string,',
    '    "axis": "career" | "love" | "health",',
    '    "sources": Array<"face"|"palm_l"|"palm_r"|"bazi">',
    '  }>',
    '}',
    '',
    'Require exactly 6 chapters with kinds overview, face, palms, natal, period, advice.',
    'Also fill flat keys mirroring chapter bodies for older clients.',
    '',
    `FaceFeatures: ${params.faceFeatures}`,
    `PalmLeftFeatures: ${params.palmLeftFeatures}`,
    `PalmRightFeatures: ${params.palmRightFeatures}`,
    `NatalSummary: ${params.natalSummary}`,
  ]

  if (params.previousFeaturesJson) {
    lines.push(`PreviousFeatures: ${params.previousFeaturesJson}`)
    lines.push('Write periodDiff as what changed vs previous (or null if oneshot).')
  }
  if (params.partialUpdate?.length) {
    lines.push(`PartialUpdateParts: ${params.partialUpdate.join(',')}`)
  }

  return lines.join('\n')
}

/** Soft floors — thin body only. */
export function faceoracleDensityGaps(
  parsed: Record<string, unknown>,
  chapters: Array<{
    kind: FaceOracleChapterKind
    goldenLine?: string
    evidence: string
    dynamic: string
    reef?: string | null
    remedy?: string | null
    citations?: Array<{ locus: string; note: string }>
  }>
): string[] {
  const gaps: string[] = []
  const byKind = new Map(chapters.map((c) => [c.kind, c]))
  const charLen = (s: string) => s.replace(/\s+/g, '').length
  const bodyLen = (c: (typeof chapters)[number] | undefined) =>
    charLen(`${c?.evidence ?? ''}${c?.dynamic ?? ''}${c?.reef ?? ''}${c?.remedy ?? ''}`)

  const mins: Record<FaceOracleChapterKind, number> = {
    overview: 260,
    face: 280,
    palms: 280,
    natal: 300,
    period: 320,
    advice: 280,
  }
  for (const kind of Object.keys(mins) as FaceOracleChapterKind[]) {
    const ch = byKind.get(kind)
    if (!ch) continue
    const n = bodyLen(ch)
    const min = mins[kind]
    if (n > 0 && n < min) gaps.push(`corpus.thin_chapter:${kind}<${min}`)
  }

  const events = Array.isArray(parsed.events) ? parsed.events : []
  if (events.length < 3) gaps.push('events<3')

  const citeCount = (c: { citations?: Array<{ locus: string; note: string }> } | undefined) =>
    c?.citations?.filter((x) => x.locus.trim().length > 0).length ?? 0
  if (citeCount(byKind.get('face')) < 2) gaps.push('face.citations<2')
  if (citeCount(byKind.get('palms')) < 2) gaps.push('palms.citations<2')

  return gaps
}
