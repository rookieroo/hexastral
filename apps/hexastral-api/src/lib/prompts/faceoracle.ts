/**
 * FaceOracle LLM prompts — Xingqi (ADR-0028).
 *
 * Two-pass generation (quality over checklist):
 *   Pass 1 — curated loci[] only (depth budget for stars)
 *   Pass 2 — five chapters + events weaving those loci
 *
 * Hard density floors that forced shallow full-coverage are retired.
 */

import { buildFaceoracleLanguageBlock } from './faceoracle-locale'

export type FaceOracleOutputKind = 'oneshot' | 'period_brief' | 'deep'

export type FaceOracleChapterKind = 'overview' | 'face' | 'palms' | 'natal' | 'horizon'

export type FaceOracleLifeAxis = 'career' | 'love' | 'health'

export type FaceOracleLocusPart = 'face' | 'palm_l' | 'palm_r'

export type FaceOracleLocusEntry = {
  featureKey: string
  part: FaceOracleLocusPart
  locus: string
  reading: string
}

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
  /** Pass 0 shortlist block (already formatted). */
  suggestedLociBlock?: string
}

const LOCI_CRAFT = [
  '## Pass 1 — loci only (NO chapters, NO events)',
  'Folk 算命: 面相 + 掌相 + 八字互证. Quote concrete keys from the inputs.',
  'Palm sides (NatalSummary palmConvention): 男 left=先天 / right=后天; 女 reverse. Prefer tension points on BOTH hands.',
  'Curate 16–20 loci (face 5–7 + each palm 5–6 high-tension keys). Prefer omit over fabricate. Mix SUPPORT and CAUTION.',
  'Each reading = 形→机理(日主/用神/旺衰/大运)→点名窗口(年龄/流年/干支), about 60–120 字. NEVER paste raw VLM text alone.',
  'featureKey must match VLM keys. locus = classical name (天庭/生命线/金星丘…), never bare part enum.',
  'Mount keys: mountJupiter, mountSaturn, mountApollo, mountMercury, mountVenus, mountMoon, mountMars (from mounts prose or per-mount fields).',
  'Inference chain: 形/纹/柱 → 机理 → 具体判断. Honesty over flattery.',
].join('\n')

const CHAPTERS_CRAFT = [
  '## Pass 2 — chapters + events (loci already fixed — DO NOT rewrite star readings)',
  'Weave the provided loci[] themes into five chapters. Do not invent conflicting judgments.',
  'Palm sides + age window from NatalSummary still apply for narrative.',
  'Time split: natal = FUTURE MAIN + whole-life dayun; horizon = 近运与行动 (会发生什么 + 你该做什么).',
  'ONE what-if 分叉 (若在…/若此…/若…则…) ONLY in natal.dynamic — never spray into other chapters.',
  'Field roles: goldenLine ≤36字; evidence=形+机理; dynamic=one scene; reef/remedy unique or null.',
  'overview = SHORT HOOK (≠ face dump). Prefer null reef/remedy over reused sentences.',
  'One sentence, one owner across chapters. Crutch phrases banned.',
].join('\n')

const CHAPTER_SPEC = [
  '## Five chapters',
  'overview — SHORT HOOK: 1 AHA + 先天/后天张力 + stage tone. reef/remedy null. NO what-if fork. overview ≠ face.',
  'face — 三停五岳; weave face loci. reef = 形/气色 only.',
  'palms — 先天 vs 后天 spine; both hands; 后天 as currentAge window. reef = palm tension only.',
  'natal — FUTURE MAIN + ONE what-if in dynamic. reef = future 大运带 only.',
  'horizon — 近运与行动: near-window ("会发生什么") + actions ("你该做什么"). Owns 本流年 reef + remedy.',
].join('\n')

function sharedInputBlocks(params: FaceOraclePromptParams): string[] {
  return [
    buildFaceoracleLanguageBlock(params.locale),
    '',
    `FaceFeatures: ${params.faceFeatures}`,
    `PalmLeftFeatures: ${params.palmLeftFeatures}`,
    `PalmRightFeatures: ${params.palmRightFeatures}`,
    `NatalSummary: ${params.natalSummary}`,
  ]
}

/** Pass 1: curated deep loci only. */
export function buildFaceOracleLociPrompt(params: FaceOraclePromptParams): string {
  return [
    'Role: Folk East-Asian 算命 interpreter — loci micro-judgments only (Syel Pass 1).',
    LOCI_CRAFT,
    `OutputKind: ${params.outputKind}`,
    `HorizonMonths: ${params.horizonMonths} (context for windows; do not emit chapters).`,
    ...sharedInputBlocks(params),
    '',
    params.suggestedLociBlock?.trim() ? params.suggestedLociBlock.trim() : '',
    params.suggestedLociBlock?.trim() ? '' : '',
    'Return STRICT JSON:',
    '{ "loci": Array<{ "featureKey": string, "part": "face"|"palm_l"|"palm_r", "locus": string, "reading": string }> }',
    'Output ONLY loci — no chapters, no events, no flat keys.',
    'FULL coverage is NOT required — curate 16–20 deep readings (face≥5, each palm≥5). Prefer omit over fabricate.',
    'Include ≥2 CAUTION-toned readings (tension / risk / 留意). Cite SuggestedLoci reason tags when present.',
    'NEVER paste raw VLM feature text as reading.',
  ]
    .filter((line) => line !== undefined)
    .join('\n')
}

/** Pass 2: chapters + events from fixed loci. */
export function buildFaceOracleChaptersPrompt(
  params: FaceOraclePromptParams,
  lociJson: string
): string {
  const lines = [
    'Role: Folk East-Asian 算命 interpreter — report chapters from fixed loci (Syel Pass 2).',
    CHAPTERS_CRAFT,
    CHAPTER_SPEC,
    `OutputKind: ${params.outputKind}`,
    `HorizonMonths: ${params.horizonMonths} (horizon near window; natal uses dayunFull/dayunFuture).`,
    ...sharedInputBlocks(params),
    '',
    `FixedLoci (SSOT — cite and weave; do not re-author readings): ${lociJson}`,
    '',
    'Return STRICT JSON:',
    '{',
    '  "chapters": [',
    '    {',
    '      "kind": "overview"|"face"|"palms"|"natal"|"horizon",',
    '      "goldenLine": string,',
    '      "evidence": string,',
    '      "dynamic": string,',
    '      "reef": string | null,',
    '      "remedy": string | null,',
    '      "counterpoint": string | null,',
    '      "citations": []',
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
    '    "axis": "career"|"love"|"health",',
    '    "sources": Array<"face"|"palm_l"|"palm_r"|"bazi">',
    '  }>',
    '}',
    'Emit all 5 chapter kinds. citations prefer []. events: 3–5 soft (career/love/health if possible).',
    'Also fill flat keys mirroring chapter bodies (periodDiff + advice mirror horizon).',
    'Loci-first: sheet consumes FixedLoci; chapters do NOT re-author per-locus notes.',
    'Age anchor / palmLiunianHint / currentAge / 已走段 / 下一窗口 still apply in palms+natal prose.',
    'Inference chain and Field roles (NO ECHO) / One sentence, one owner / Prefer null over repeat still apply.',
    'Honesty over flattery; no cherry-pick. Crutch phrases BANNED.',
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

/**
 * Combined prompt (tests / legacy). Production job uses Pass1+Pass2 separately.
 */
export function buildFaceOraclePrompt(params: FaceOraclePromptParams): string {
  return [
    buildFaceOracleLociPrompt(params),
    '',
    '--- then Pass 2 would receive loci and continue with ---',
    '',
    buildFaceOracleChaptersPrompt(
      params,
      '[{"featureKey":"shanGen","part":"face","locus":"山根","reading":"…"}]'
    ),
  ].join('\n')
}

type ChapterLike = {
  kind: FaceOracleChapterKind
  goldenLine?: string
  evidence: string
  dynamic: string
  reef?: string | null
  remedy?: string | null
  citations?: Array<{ locus: string; featureKey?: string; part?: string; note: string }>
}

type LocusLike = {
  featureKey?: string
  part?: string
  locus?: string
  reading?: string
  /** legacy alias */
  note?: string
}

function parseLociFromParsed(parsed: Record<string, unknown>): LocusLike[] {
  if (!Array.isArray(parsed.loci)) return []
  return parsed.loci.filter((x): x is LocusLike => Boolean(x) && typeof x === 'object')
}

function locusReading(l: LocusLike): string {
  return (
    typeof l.reading === 'string' ? l.reading : typeof l.note === 'string' ? l.note : ''
  ).trim()
}

function locusFeatureKey(l: LocusLike): string {
  return (typeof l.featureKey === 'string' ? l.featureKey : '').trim()
}

function locusPart(l: LocusLike): string {
  return (typeof l.part === 'string' ? l.part : '').trim()
}

function locusName(l: LocusLike): string {
  return (typeof l.locus === 'string' ? l.locus : '').trim()
}

/**
 * Structural quality gaps (NO char floors). Enforces field distinctness,
 * cross-chapter non-repetition, loci[] coverage, both-hands palm reading,
 * a genuinely future-facing natal chapter, and near-window event fuel.
 */
export function faceoracleDensityGaps(
  parsed: Record<string, unknown>,
  chapters: ChapterLike[]
): string[] {
  const gaps: string[] = []
  const byKind = new Map(chapters.map((c) => [c.kind, c]))
  const norm = (s: string) => s.replace(/\s+/g, '').trim()
  const nowYear = new Date().getUTCFullYear()
  const loci = parseLociFromParsed(parsed)

  // ── Events: soft-ish — keep as gaps for logging but job no longer retries ─
  const events = Array.isArray(parsed.events) ? parsed.events : []
  if (events.length < 3) gaps.push('events<3')
  let nearCount = 0
  const axes = new Set<string>()
  for (const ev of events) {
    if (!ev || typeof ev !== 'object') continue
    const e = ev as Record<string, unknown>
    if (typeof e.axis === 'string' && e.axis.trim()) axes.add(e.axis.trim())
    const sm = typeof e.startMonth === 'string' ? e.startMonth : ''
    const m = /^(\d{4})-(\d{2})$/.exec(sm)
    if (m && Number(m[1]) <= nowYear + 1) nearCount += 1
  }
  if (events.length > 0 && nearCount < 1) gaps.push('events.near<1')
  if (events.length > 0 && axes.size < 2) gaps.push('events.axis<2')

  // ── Loci: curated depth path — only flag empty/part-enum, not coverage floors ─
  const faceLoci = loci.filter(
    (l) => locusPart(l) === 'face' && locusFeatureKey(l) && locusReading(l)
  )
  const palmLoci = loci.filter(
    (l) =>
      (locusPart(l) === 'palm_l' || locusPart(l) === 'palm_r') &&
      locusFeatureKey(l) &&
      locusReading(l)
  )

  if (loci.length > 0) {
    if (faceLoci.length < 1) gaps.push('face.citations<1')
    if (palmLoci.length < 1) gaps.push('palms.citations<1')
    const palmParts = new Set(palmLoci.map((l) => locusPart(l)))
    if (palmLoci.length > 0 && !(palmParts.has('palm_l') && palmParts.has('palm_r'))) {
      gaps.push('palms.missing_innate_or_acquired')
    }
  } else {
    const citeCount = (
      c:
        | { citations?: Array<{ locus: string; featureKey?: string; part?: string; note: string }> }
        | undefined
    ) => c?.citations?.filter((x) => x.locus.trim().length > 0 && x.featureKey?.trim()).length ?? 0
    const faceCh = byKind.get('face')
    const palmsCh = byKind.get('palms')
    if (faceCh && citeCount(faceCh) < 1) gaps.push('face.citations<1')
    if (palmsCh && citeCount(palmsCh) < 1) gaps.push('palms.citations<1')
    if (palmsCh) {
      const parts = new Set((palmsCh.citations ?? []).map((x) => x.part))
      if (!(parts.has('palm_l') && parts.has('palm_r'))) {
        gaps.push('palms.missing_innate_or_acquired')
      }
    }
  }

  // locus must never be the bare part enum (check loci[] first, then citations).
  const PART_ENUM = new Set(['face', 'palm_l', 'palm_r'])
  let locusIsPart = false
  for (const l of loci) {
    if (PART_ENUM.has(locusName(l))) {
      locusIsPart = true
      break
    }
  }
  if (!locusIsPart) {
    for (const ch of chapters) {
      for (const cite of ch.citations ?? []) {
        if (PART_ENUM.has(cite.locus.trim())) {
          locusIsPart = true
          break
        }
      }
      if (locusIsPart) break
    }
  }
  if (locusIsPart) gaps.push('citations.locus_is_part_enum')

  // ── Cross-chapter distinctness ──────────────────────────────────────────
  const nearEcho = (a: string, b: string): boolean => {
    if (!a || !b) return false
    if (a === b) return true
    const shorter = a.length <= b.length ? a : b
    const longer = a.length <= b.length ? b : a
    if (shorter.length < 18) return false
    return longer.startsWith(shorter) && shorter.length / longer.length >= 0.72
  }

  const overview = byKind.get('overview')
  const face = byKind.get('face')
  if (overview && face) {
    const oEv = norm(overview.evidence)
    const fEv = norm(face.evidence)
    const oGl = norm(overview.goldenLine ?? '')
    const fGl = norm(face.goldenLine ?? '')
    if (oEv.length > 40 && oEv === fEv) gaps.push('chapters.overview_dup_face')
    else if (oGl.length > 40 && oGl === fGl) gaps.push('chapters.overview_dup_face')
  }

  // natal must talk about the future; horizon must not echo natal.
  const natal = byKind.get('natal')
  const horizon = byKind.get('horizon')
  if (natal) {
    const body = `${natal.evidence} ${natal.dynamic} ${natal.reef ?? ''}`
    const years = body.match(/\d{4}/g) ?? []
    const hasFuture = years.some((y) => Number(y) > nowYear)
    if (norm(body).length > 0 && !hasFuture) gaps.push('natal.future_thin')
  }
  if (natal && horizon) {
    if (
      nearEcho(norm(natal.evidence), norm(horizon.evidence)) ||
      nearEcho(norm(natal.dynamic), norm(horizon.dynamic)) ||
      nearEcho(norm(natal.reef ?? ''), norm(horizon.reef ?? '')) ||
      nearEcho(norm(natal.remedy ?? ''), norm(horizon.remedy ?? ''))
    ) {
      gaps.push('natal.dup_horizon')
    }
  }

  // Cross-chapter reef/remedy must not repeat.
  const crossDup = (a: string, b: string): boolean =>
    a.length > 0 &&
    b.length > 0 &&
    (a === b || (Math.min(a.length, b.length) > 24 && nearEcho(a, b)))
  const reefVals = chapters.map((c) => norm(c.reef ?? '')).filter((v) => v.length > 0)
  const remedyVals = chapters.map((c) => norm(c.remedy ?? '')).filter((v) => v.length > 0)
  outerReef: for (let i = 0; i < reefVals.length; i++) {
    for (let j = i + 1; j < reefVals.length; j++) {
      if (crossDup(reefVals[i] ?? '', reefVals[j] ?? '')) {
        gaps.push('chapters.reef_dup')
        break outerReef
      }
    }
  }
  outerRemedy: for (let i = 0; i < remedyVals.length; i++) {
    for (let j = i + 1; j < remedyVals.length; j++) {
      if (crossDup(remedyVals[i] ?? '', remedyVals[j] ?? '')) {
        gaps.push('chapters.remedy_dup')
        break outerRemedy
      }
    }
  }
  // 流年 belongs to horizon.reef; flag when a dated 流年 line sprays into ≥2 non-horizon reefs.
  let liunianNonHorizon = 0
  for (const ch of chapters) {
    if (ch.kind === 'horizon') continue
    if (ch.reef && /\d{4}[^。！？.!?]{0,6}流年/.test(ch.reef)) liunianNonHorizon += 1
  }
  if (liunianNonHorizon >= 2) gaps.push('chapters.reef_liunian_spray')

  // ONE what-if 分叉 belongs to natal.dynamic only — spray into ≥2 chapters is a fail.
  // Models often write 若在…/若此… without 则; treat those as forks too.
  const WHATIF_RE = /若(在|此|不)|若[^。！？.!?\n]{1,72}(则|則|更[稳穩]|会更|會更|易因)/
  let whatifChapters = 0
  for (const ch of chapters) {
    const body = `${ch.goldenLine ?? ''} ${ch.evidence} ${ch.dynamic} ${ch.reef ?? ''} ${ch.remedy ?? ''}`
    if (WHATIF_RE.test(body)) whatifChapters += 1
  }
  if (whatifChapters >= 2) gaps.push('chapters.whatif_spray')

  const DYNAMIC_LABEL_STUBS = new Set([
    '形气总象',
    '形氣總象',
    '三停五岳十二宫',
    '三停五岳十二宮',
    '主纹+丘位',
    '主紋+丘位',
    '日主用神通关五行大运流年',
    '日主用神通關五行大運流年',
    '近窗口与后半场大运带',
    '近窗口與後半場大運帶',
    '近可为与后半场准备',
    '近可為與後半場準備',
    '近运与行动',
    '近運與行動',
  ])

  // ── Field-role echoes ───────────────────────────────────────────────────
  const goldenSeen = new Map<string, FaceOracleChapterKind>()
  for (const ch of chapters) {
    const gl = norm(ch.goldenLine ?? '')
    const ev = norm(ch.evidence)
    const dyn = norm(ch.dynamic)
    const reef = norm(ch.reef ?? '')
    const remedy = norm(ch.remedy ?? '')
    if (ev.length > 40 && gl.length > 0 && (ev === gl || nearEcho(gl, ev))) {
      gaps.push(`field.evidence_eq_golden:${ch.kind}`)
    }
    if (dyn.length > 40 && nearEcho(dyn, ev)) {
      gaps.push(`field.dynamic_eq_evidence:${ch.kind}`)
    }
    if (gl.length >= 12 && dyn.length > 0 && (dyn === gl || dyn.includes(gl))) {
      gaps.push(`field.dynamic_eq_golden:${ch.kind}`)
    }
    if (reef.length > 40 && (nearEcho(reef, ev) || nearEcho(reef, dyn))) {
      gaps.push(`field.reef_echo:${ch.kind}`)
    }
    if (
      remedy.length > 40 &&
      (nearEcho(remedy, ev) || nearEcho(remedy, dyn) || nearEcho(remedy, reef))
    ) {
      gaps.push(`field.remedy_echo:${ch.kind}`)
    }
    if (dyn.length > 0 && (dyn.length < 12 || DYNAMIC_LABEL_STUBS.has(dyn))) {
      gaps.push(`field.dynamic_label_only:${ch.kind}`)
    }
    if (gl.length > 0) {
      const prev = goldenSeen.get(gl)
      if (prev && prev !== ch.kind) gaps.push('chapters.golden_dup')
      else goldenSeen.set(gl, ch.kind)
    }
  }

  return [...new Set(gaps)]
}

/**
 * Log-only quality observations (NOT retry gates). Coverage floors that risk
 * fabrication stay soft; char floors stay soft.
 */
export function faceoracleSoftObservations(
  parsed: Record<string, unknown>,
  chapters: ChapterLike[]
): string[] {
  const obs: string[] = []
  const norm = (s: string) => s.replace(/\s+/g, '').trim()
  const byKind = new Map(chapters.map((c) => [c.kind, c]))
  const loci = parseLociFromParsed(parsed)

  const events = Array.isArray(parsed.events) ? parsed.events : []
  const firstNoteByAxis = new Map<string, string>()
  for (const ev of events) {
    if (!ev || typeof ev !== 'object') continue
    const e = ev as Record<string, unknown>
    const axis = typeof e.axis === 'string' ? e.axis.trim() : ''
    if (axis !== 'career' && axis !== 'love' && axis !== 'health') continue
    if (firstNoteByAxis.has(axis)) continue
    const note =
      (typeof e.note === 'string' ? e.note.trim() : '') ||
      (typeof e.theme === 'string' ? e.theme.trim() : '')
    if (note) firstNoteByAxis.set(axis, norm(note))
  }
  const axisNotes = [...firstNoteByAxis.values()].filter((n) => n.length > 0)
  outerAxis: for (let i = 0; i < axisNotes.length; i++) {
    for (let j = i + 1; j < axisNotes.length; j++) {
      const a = axisNotes[i] ?? ''
      const b = axisNotes[j] ?? ''
      if (a === b || (Math.min(a.length, b.length) >= 10 && (a.includes(b) || b.includes(a)))) {
        obs.push('events.axis_note_dup')
        break outerAxis
      }
    }
  }

  const faceKeysFromLoci = new Set(
    loci.filter((l) => locusPart(l) === 'face' && locusFeatureKey(l)).map((l) => locusFeatureKey(l))
  )
  const palmKeysFromLoci = new Set(
    loci
      .filter((l) => locusPart(l) === 'palm_l' || locusPart(l) === 'palm_r')
      .map((l) => locusFeatureKey(l))
      .filter(Boolean)
  )

  const faceCh = byKind.get('face')
  const palmsCh = byKind.get('palms')

  if (loci.length > 0) {
    if (faceKeysFromLoci.size < 5) obs.push('cite.face_breadth')
    if (faceKeysFromLoci.size < 8) obs.push('face.cite_coverage')
    if (!palmKeysFromLoci.has('lifeLine') || !palmKeysFromLoci.has('heartLine')) {
      obs.push('palms.missing_life_or_heart_line')
    }
    const mountKeys = [
      'mountJupiter',
      'mountSaturn',
      'mountApollo',
      'mountMercury',
      'mountVenus',
      'mountMoon',
      'mountMars',
    ]
    const mountCited = mountKeys.filter((k) => palmKeysFromLoci.has(k)).length
    if (mountCited < 3) obs.push('palms.cite_coverage_mounts')
    if (!palmKeysFromLoci.has('specialMarks')) obs.push('palms.missing_marks_cite')
    if (palmKeysFromLoci.size < 8) obs.push('palms.cite_coverage')
  } else {
    if (faceCh) {
      const keys = new Set(
        (faceCh.citations ?? []).map((x) => x.featureKey?.trim()).filter((k): k is string => !!k)
      )
      if (keys.size < 5) obs.push('cite.face_breadth')
      if (keys.size < 8) obs.push('face.cite_coverage')
    }
    if (palmsCh) {
      const palmKeys = new Set((palmsCh.citations ?? []).map((x) => x.featureKey?.trim()))
      if (!palmKeys.has('lifeLine') || !palmKeys.has('heartLine')) {
        obs.push('palms.missing_life_or_heart_line')
      }
      const mountKeys = [
        'mountJupiter',
        'mountSaturn',
        'mountApollo',
        'mountMercury',
        'mountVenus',
        'mountMoon',
        'mountMars',
      ]
      const mountCited = mountKeys.filter((k) => palmKeys.has(k)).length
      if (mountCited < 3) obs.push('palms.cite_coverage_mounts')
      if (!palmKeys.has('specialMarks')) obs.push('palms.missing_marks_cite')
      if (palmKeys.size < 8) obs.push('palms.cite_coverage')
    }
  }

  const horizon = byKind.get('horizon')
  if (horizon) {
    const actionBody = norm(`${horizon.remedy ?? ''} ${horizon.dynamic}`)
    if (actionBody.length < 40) obs.push('advice.not_actionable')
  }

  for (const ch of chapters) {
    const ev = norm(ch.evidence)
    const dyn = norm(ch.dynamic)
    const reef = norm(ch.reef ?? '')
    for (const cite of ch.citations ?? []) {
      const n = norm(cite.note)
      if (n.length >= 10 && (ev.includes(n) || dyn.includes(n) || reef.includes(n))) {
        obs.push(`cite.note_echo_body:${ch.kind}`)
        break
      }
    }
    if (ev.length > 0 && ev.length < 40) obs.push(`field.thin_evidence:${ch.kind}`)
    if (dyn.length >= 12 && dyn.length < 40) obs.push(`field.thin_dynamic:${ch.kind}`)
  }

  // Soft: loci reading echoing chapter body (when loci present).
  for (const l of loci) {
    const n = norm(locusReading(l))
    if (n.length < 10) continue
    for (const ch of chapters) {
      const body = norm(`${ch.evidence} ${ch.dynamic} ${ch.reef ?? ''}`)
      if (body.includes(n)) {
        obs.push(`cite.note_echo_body:${ch.kind}`)
        break
      }
    }
  }

  return [...new Set(obs)]
}

/**
 * Log-only observation (NOT a retry gate): whether face/palms locus readings
 * name any tension at all. Absence hints the model cherry-picked auspicious loci.
 */
const CAUTION_WORDS = [
  '杂',
  '弱',
  '断',
  '浅',
  '偏',
  '燥',
  '虚',
  '滞',
  '薄',
  '散',
  '乱',
  '冲',
  '克',
  '对冲',
  '波动',
  '留意',
  '风险',
]

export function faceoracleCautionObservations(
  chapters: Array<{
    kind: FaceOracleChapterKind
    citations?: Array<{ note: string }>
  }>,
  loci?: Array<{ part?: string; reading?: string; note?: string }>
): string[] {
  const out: string[] = []
  for (const kind of ['face', 'palms'] as const) {
    let notes = ''
    if (loci && loci.length > 0) {
      const partFilter =
        kind === 'face'
          ? (p: string) => p === 'face'
          : (p: string) => p === 'palm_l' || p === 'palm_r'
      notes = loci
        .filter((l) => partFilter(typeof l.part === 'string' ? l.part : ''))
        .map((l) =>
          typeof l.reading === 'string' ? l.reading : typeof l.note === 'string' ? l.note : ''
        )
        .join('')
    } else {
      const ch = chapters.find((c) => c.kind === kind)
      if (!ch) continue
      notes = (ch.citations ?? []).map((c) => c.note).join('')
    }
    if (notes.trim().length > 0 && !CAUTION_WORDS.some((w) => notes.includes(w))) {
      out.push(`caution_word_absent:${kind}`)
    }
  }
  return out
}
