/**
 * Structural quality gaps for the Yuel personal 6-chapter report — the
 * per-chapter analogue of faceoracle's `faceoracleDensityGaps`.
 *
 * Yuel generates one LLM call per chapter, so gaps live at the call site and
 * are per-chapter (no cross-chapter detector like faceoracle's single call).
 * These checks enforce field distinctness + depth WITHOUT hard char floors that
 * would push the model to spray filler — they catch thin one-liner summaries,
 * echoing section bodies, under-count sections, missing watchOuts, a
 * non-actionable ch6, and 正确的废话 crutch phrases.
 */

export type ReportChapterSlug =
  | 'ch1_personality'
  | 'ch2_dimensions_static'
  | 'ch2_dimensions_dynamic'
  | 'ch3_stellar'
  | 'ch4_timeline'
  | 'ch5_hidden'
  | 'ch6_action'

/** Minimum developed sections per chapter (mirrors chapters.ts VOLUME specs). */
const MIN_SECTIONS: Record<ReportChapterSlug, number> = {
  ch1_personality: 3,
  ch2_dimensions_static: 4,
  ch2_dimensions_dynamic: 3,
  ch3_stellar: 3,
  ch4_timeline: 4,
  ch5_hidden: 3,
  ch6_action: 3,
}

/**
 * 正确的废话 crutch phrases — generic filler that reads as advice but says
 * nothing about THIS chart. Only meaningful for Chinese output; harmless for
 * other locales (the substrings simply won't appear).
 */
const CRUTCH_PHRASES = [
  '保持平常心',
  '平常心对待',
  '顺其自然',
  '量力而行',
  '凡事三思',
  '三思而后行',
  '需注意情绪与健康',
  '注意情绪与健康',
  '多与人沟通',
  '注意劳逸结合',
  '保持积极心态',
  '保持良好心态',
  '保持乐观',
  '放平心态',
]

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function norm(s: string): string {
  return s.replace(/\s+/g, '').trim()
}

/** near-echo: b starts with a and a is a large fraction of b (same as faceoracle). */
function nearEcho(a: string, b: string): boolean {
  if (!a || !b) return false
  if (a === b) return true
  const shorter = a.length <= b.length ? a : b
  const longer = a.length <= b.length ? b : a
  if (shorter.length < 16) return false
  return longer.startsWith(shorter) && shorter.length / longer.length >= 0.72
}

type SectionLike = { heading?: unknown; body?: unknown }

function sectionsOf(parsed: Record<string, unknown>): SectionLike[] {
  return Array.isArray(parsed.sections) ? (parsed.sections as SectionLike[]) : []
}

/** Collect every string leaf that is user-facing prose, for crutch/length scans. */
function collectProse(parsed: Record<string, unknown>): string[] {
  const out: string[] = []
  const push = (v: unknown) => {
    const s = str(v)
    if (s.trim()) out.push(s)
  }
  push(parsed.summary)
  for (const sec of sectionsOf(parsed)) push(sec.body)
  for (const h of Array.isArray(parsed.highlights) ? parsed.highlights : []) push(h)
  for (const w of Array.isArray(parsed.watchOuts) ? parsed.watchOuts : []) push(w)
  // ch4 extras
  push(parsed.currentDayunOverview)
  push(parsed.oneThingToFocus)
  for (const y of Array.isArray(parsed.yearlyRhythm) ? parsed.yearlyRhythm : []) {
    if (y && typeof y === 'object') push((y as Record<string, unknown>).theme)
  }
  for (const d of Array.isArray(parsed.decisionWindows) ? parsed.decisionWindows : []) {
    if (d && typeof d === 'object') push((d as Record<string, unknown>).description)
  }
  // ch5 extras
  push(parsed.dormantPattern)
  for (const t of Array.isArray(parsed.tensionPoints) ? parsed.tensionPoints : []) {
    if (t && typeof t === 'object') push((t as Record<string, unknown>).mechanism)
  }
  // ch6 extras
  const imm = parsed.immediateAction
  if (imm && typeof imm === 'object') push((imm as Record<string, unknown>).description)
  for (const f of Array.isArray(parsed.thirtyDayFocus) ? parsed.thirtyDayFocus : []) {
    if (f && typeof f === 'object') {
      push((f as Record<string, unknown>).action)
      push((f as Record<string, unknown>).rationale)
    }
  }
  const ninety = parsed.ninetyDayDirection
  if (ninety && typeof ninety === 'object') push((ninety as Record<string, unknown>).description)
  const delay = parsed.delayItem
  if (delay && typeof delay === 'object') {
    push((delay as Record<string, unknown>).description)
    push((delay as Record<string, unknown>).reason)
  }
  return out
}

/** Total normalized prose length — used by the retry non-regression guard. */
export function reportChapterProseLength(parsed: Record<string, unknown>): number {
  return collectProse(parsed).reduce((n, s) => n + norm(s).length, 0)
}

/** Gaps that a "deepen" (not "restructure") retry should target. */
export function isThinReportGap(gap: string): boolean {
  return gap === 'summary.thin' || gap.startsWith('section.thin') || gap === 'ch6.not_actionable'
}

export function reportChapterGaps(
  slug: ReportChapterSlug,
  parsed: Record<string, unknown>
): string[] {
  const gaps: string[] = []
  const summary = str(parsed.summary)
  const sections = sectionsOf(parsed)
  const watchOuts = Array.isArray(parsed.watchOuts) ? parsed.watchOuts : []

  // Thin summary — a one-liner is not the 70–120 字 aha the spec asks for.
  if (norm(summary).length < 30) gaps.push('summary.thin')

  // Section count below the chapter's VOLUME spec.
  const minSections = MIN_SECTIONS[slug]
  if (sections.length < minSections) gaps.push('section.count')

  // Thin / echoing section bodies.
  let thinBodies = 0
  let echoBodies = 0
  const normSummary = norm(summary)
  for (const sec of sections) {
    const body = norm(str(sec.body))
    const heading = norm(str(sec.heading))
    if (body.length < 45) thinBodies += 1
    else if (
      (heading.length >= 6 && (body === heading || nearEcho(heading, body))) ||
      (normSummary.length >= 20 && nearEcho(normSummary, body))
    ) {
      echoBodies += 1
    }
  }
  if (thinBodies > 0) gaps.push('section.thin')
  if (echoBodies > 0) gaps.push('section.echo')

  // watchOuts must carry ≥2 real cautions.
  const realWatch = watchOuts.filter((w) => norm(str(w)).length >= 8).length
  if (realWatch < 2) gaps.push('watchOuts<2')

  // ch6 must be concretely actionable, not a restatement of the timeline.
  if (slug === 'ch6_action') {
    const focus = Array.isArray(parsed.thirtyDayFocus) ? parsed.thirtyDayFocus : []
    let concrete = 0
    for (const f of focus) {
      if (!f || typeof f !== 'object') continue
      const action = norm(str((f as Record<string, unknown>).action))
      const rationale = norm(str((f as Record<string, unknown>).rationale))
      // An action is "concrete" when it is developed AND not merely echoing its rationale.
      if (action.length >= 12 && !nearEcho(action, rationale)) concrete += 1
    }
    const imm = parsed.immediateAction
    const immDesc =
      imm && typeof imm === 'object' ? norm(str((imm as Record<string, unknown>).description)) : ''
    if (concrete < 1 || immDesc.length < 12) gaps.push('ch6.not_actionable')
  }

  // 正确的废话 crutch phrases (not bound to a locus/window/action).
  const prose = collectProse(parsed).join('\n')
  if (CRUTCH_PHRASES.some((p) => prose.includes(p))) gaps.push('crutch')

  return gaps
}
