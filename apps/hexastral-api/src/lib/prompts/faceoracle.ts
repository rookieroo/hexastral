/**
 * FaceOracle LLM prompt — Xingqi canonical stack (ADR-0028).
 *
 * Product identity: folk 算命 toolkit — face + palms + BaZi 互证.
 * Six-chapter craft: per-chapter focus; natal carries the whole-life + future
 * 大运带, period stays near-window. Quality is enforced by structural gaps (no
 * char floors). Hard-forbidden phrases are audited post-generation
 * (portfolio-voice), not in prompt.
 *
 * Locale: Route B via faceoracle-locale (Yuun/Yuel parity).
 */

import { buildFaceoracleLanguageBlock } from './faceoracle-locale'

export type FaceOracleOutputKind = 'oneshot' | 'period_brief' | 'deep'

export type FaceOracleChapterKind = 'overview' | 'face' | 'palms' | 'natal' | 'period' | 'advice'

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
  'Palm sides (see NatalSummary palmConvention): 男 left(palm_l)=先天/本命底色, right(palm_r)=后天/作为; 女 right(palm_r)=先天, left(palm_l)=后天. Read BOTH hands and state whether 先天 and 后天 pull the same way (同向) or against each other (对拉).',
  'Time split: natal = whole-life timeline + FUTURE main chapter (walk past印证 → 当令 → future 大运带 to 后半场, using dayunFull/dayunFuture; name 干支/年龄/年份). period = near window only (本流年 + 当前大运余年). Never collapse the two.',
  'Deepen 2–4 life scenes the chart/form actually hits; skip the rest. Do not spray every decade step as bare labels.',
  'Inference chain (每章至少走一遍，缺环即空话): 形/纹/柱(所见) → 机理(为什么，扣住日主/用神/旺衰/大运，讲清这个形如何映射命理动力) → 一个具体判断/场景并点名窗口(年龄/年份/干支). 补环，不要靠拉长凑数.',
  'Field roles (NO ECHO): goldenLine = 一句总断 only (≤36字, never paste into evidence). evidence = 形(所见) + 机理(为什么，扣日主/用神/旺衰/大运). dynamic = 由机理推到 ONE 个具体人生场景(择偶/合伙/择业/子女/健康节奏)，写成 if-then 且点名窗口(年龄/年份/干支) — 不是重述 evidence, 不是口号. reef = 该章独有的风险/时机. remedy = 一个可做的动作.',
  'Ban: copying the same sentence across goldenLine/evidence/dynamic/reef/remedy. Ban: repeating 命主…需注意… with only 2 words changed.',
  'Crutch phrases BANNED (正确的废话): 「需注意情绪与健康」「保持平常心」「顺其自然」「多与人沟通」「凡事三思」「量力而行」之类泛化套话——除非绑定具体 locus/轴/窗口并给出可执行动作，否则删掉。宁可 reef/remedy 留 null，也不要填放之四海皆准的空话.',
  'Data ownership (STOP cross-chapter copy): the 本流年 sentence lives in period.reef ONLY — other chapters may name the year in passing but must NOT paste period.reef. Whole-life 大运带 risk → natal.reef. 形/气色 risk → face.reef. 先天/后天掌张力 → palms.reef. Action steps → advice.remedy.',
  'Prefer null over repeat: if a chapter has no risk/action UNIQUE to itself, set reef/remedy to null — never reuse another chapter sentence. No shared 流年 block across reefs; no single 冥想/呼吸/多喝水 remedy reused across chapters (name a different locus / axis / year if the action is similar).',
  'Citations advance the chapter: each citations[].note is a ≤40字 micro-judgment pushing THIS chapter angle (判断/时机/同向对拉) — never paste an evidence sentence or a dictionary teaching line.',
  'Honesty over flattery: cite BOTH supportive AND cautionary loci that the inputs actually show (印堂杂气/山根弱/法令深/感情线断浅/事业线断续/气色偏黄…). Do NOT cherry-pick only auspicious loci to spare worry; name tension plainly (警示, not 恐吓/铁口).',
  'Plainspoken: after each classical term, say what it means for work / intimacy / body rhythm in plain language.',
  'Depth = more inference, not more words: every chapter must land the 形→机理→点名场景 chain. If you have nothing new, add a NEW angle or a NEW dated scene — never restate or pad.',
].join('\n')

/**
 * Depth calibration (few-shot). Fictional loci/pillars — style only, so the
 * model matches reasoning density (形→机理→点名场景), never the content.
 */
const GOLD_EXAMPLE = [
  '## Depth calibration (STYLE ONLY — do NOT copy these loci/years/wording; match the reasoning density)',
  'A fully-developed natal chapter looks like:',
  '{"kind":"natal",',
  ' "goldenLine":"庚金坐酉，早年靠硬本事立身，戊寅运后才真正当家",',
  ' "evidence":"日主庚金生于酉月得令，地支两酉一申、金气过旺而火弱；鼻梁高直(noseShape)、颧起(cheekBones)正应这股\'认死理、靠自己\'的刚劲。机理：金旺无火炼，早年利技术执行、不利过早坐决策位。",',
  ' "dynamic":"由此推一个具体窗口：33岁起戊寅大运(2028–2037)寅中丙火暖局、引动财官——若在35–37岁(乙巳、丙午流年火透)之间接管一摊事或自立门户，比32岁前勉强上位更稳；若此窗口仍只做执行，40岁后再转会更费力。",',
  ' "reef":"未来大运带：48岁入庚辰运金再旺，易因过刚与人对拉、肺/大肠偏燥——那十年宜守成不宜再扩摊子。",',
  ' "remedy":null,',
  ' "citations":[{"locus":"鼻梁","featureKey":"noseShape","part":"face","note":"高直=自我要求高，配金旺宜择业专精而非广撒"}]}',
  "Notice: each field carries 形/柱 → 机理(为什么) → 一个点名窗口的判断. Write THIS person's chain with THEIR loci and THEIR dayunFull/流年 — not this example.",
].join('\n')

const SCHOOL = [
  'Stack: Face 三停五岳十二宫五官气色; Palm 主纹+丘位 (先天掌看禀赋, 后天掌看作为/近运改写); Natal 日主用神通关五行大运全带流年. 气色可借中医意象对照 (隐喻, 非诊断).',
  'Three axes career/love/health carry equal weight; no 铁口 registry-style fate verdicts.',
  'Not a natal-only 命书. Not a calendar-only 黄历.',
].join(' ')

/** Per-chapter focus (no char floors — quality enforced by structural gaps). */
const CHAPTER_SPEC = [
  '## Six chapters (follow focus; no reused goldenLine across chapters; every field a new angle; reef/remedy unique per chapter or null)',
  'overview — 总领全篇: 1 AHA (locus×大运) + 先天/后天掌张力 + 人生阶段调性. reef/remedy usually null here (defer to the owning chapter). Do NOT dump face feature lists (overview ≠ face).',
  'face — 三停五岳十二宫; form evidence primary; explain meaning in dynamic; ≥5 citations across DISTINCT featureKeys with classical locus names (天庭/印堂… never locus:"face"), mixing SUPPORT and CAUTION loci; reef = 形/气色 risk only; touch love OR health once.',
  'palms — 先天掌 vs 后天掌 contrast is the spine (per palmConvention); cover BOTH hands (cite palm_l AND palm_r); MUST cite 生命线(lifeLine) AND 感情线(heartLine)/婚姻线; ≥4 citations with correct part; reef = 先天/后天掌张力 only; one form↔chart corroboration.',
  'natal — FUTURE MAIN + whole life: use dayunFull/dayunFuture to walk 已行印证 → 当令 → 未来各步主题 (each step one line, named 干支/年龄/年份) + deepen ≥3 future life scenes; ≥2 form↔pillar 互证; reef = 未来大运带 risk only. Must NOT duplicate period near-window.',
  'period — NEAR WINDOW preview ("会发生什么"): 本流年 + 当前大运余年，逐条给 "某年(某月)×某轴" 的可对照预告，每条带一句日主×流年互动的机理; OWNS the 本流年 reef sentence (no other chapter may paste it); events mostly actionable near windows (keeps push contract); do NOT re-narrate the natal whole-life ladder, do NOT paste advice action steps.',
  'advice — ACTIONS only ("你该做什么"): per-axis 可执行清单，career/love/health 各 ≥1 条，每条 = 触发条件(何时/何情境) + 具体动作 + 为何(扣机理); remedy is the main stage. MUST differ from period (period 预告事件，advice 给动作); other chapters must not copy these; no period/natal re-narration.',
].join('\n')

function outputKindHint(kind: FaceOracleOutputKind): string {
  switch (kind) {
    case 'period_brief':
      return 'OutputKind: period_brief — all 6 chapters; extra concreteness in period + events + form↔chart 互证.'
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
    GOLD_EXAMPLE,
    `OutputKind: ${params.outputKind}`,
    outputKindHint(params.outputKind),
    `HorizonMonths: ${params.horizonMonths} (period near window; natal carries the whole-life + future 大运带 from dayunFull/dayunFuture).`,
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
    '      "citations": Array<{ "locus": string, "featureKey": string, "part": "face" | "palm_l" | "palm_r", "note": string }>',
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
    'Require featureKey to match VLM keys (face: tianTing,yinTang,shanGen,foreheadWidth,eyebrowType,eyeType,noseShape,cheekBones,nasolabialFolds,mouthType,chin,earLobes; palm: handShape,lifeLine,headLine,heartLine,fateLine,mounts,specialMarks).',
    'locus must be a classical name (天庭/印堂/生命线…), never the bare part enum ("face"/"palm_l"/"palm_r").',
    'face chapter citations: part "face". palms chapter MUST include BOTH part "palm_l" and part "palm_r" (先天掌 + 后天掌).',
    'citations[].note ≤40 chars, a micro-judgment advancing THIS chapter — not an evidence paste or a dictionary teaching line.',
    'face citations: ≥5 DISTINCT featureKeys mixing supportive and cautionary loci; palms citations must include lifeLine AND heartLine. Do not omit a visible tension just because it is unflattering.',
    'reef/remedy: unique per chapter or null. Never paste the 本流年 sentence outside period; never share one 冥想/呼吸 remedy across chapters.',
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

/**
 * Structural quality gaps (NO char floors). Enforces field distinctness,
 * cross-chapter non-repetition, citation coverage, both-hands palm reading,
 * a genuinely future-facing natal chapter, and near-window event fuel.
 */
export function faceoracleDensityGaps(
  parsed: Record<string, unknown>,
  chapters: Array<{
    kind: FaceOracleChapterKind
    goldenLine?: string
    evidence: string
    dynamic: string
    reef?: string | null
    remedy?: string | null
    citations?: Array<{ locus: string; featureKey?: string; part?: string; note: string }>
  }>
): string[] {
  const gaps: string[] = []
  const byKind = new Map(chapters.map((c) => [c.kind, c]))
  const norm = (s: string) => s.replace(/\s+/g, '').trim()
  const nowYear = new Date().getUTCFullYear()

  // ── Events: count + near-window fuel + three-axis coverage ──────────────
  const events = Array.isArray(parsed.events) ? parsed.events : []
  if (events.length < 5) gaps.push('events<5')
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
  if (nearCount < 2) gaps.push('events.near<2')
  if (axes.size < 3) gaps.push('events.axis<3')

  // ── Citation coverage ──────────────────────────────────────────────────
  const citeCount = (
    c:
      | {
          citations?: Array<{ locus: string; featureKey?: string; part?: string; note: string }>
        }
      | undefined
  ) => c?.citations?.filter((x) => x.locus.trim().length > 0 && x.featureKey?.trim()).length ?? 0
  const faceCh = byKind.get('face')
  const palmsCh = byKind.get('palms')
  if (faceCh && citeCount(faceCh) < 4) gaps.push('face.citations<4')
  if (palmsCh && citeCount(palmsCh) < 4) gaps.push('palms.citations<4')

  // Breadth: face must span ≥5 DISTINCT loci (anti cherry-picking a few positives).
  if (faceCh) {
    const keys = new Set(
      (faceCh.citations ?? []).map((x) => x.featureKey?.trim()).filter((k): k is string => !!k)
    )
    if (keys.size < 5) gaps.push('cite.face_breadth')
  }

  // Palms must cover BOTH innate and acquired hands (palm_l + palm_r).
  if (palmsCh) {
    const parts = new Set((palmsCh.citations ?? []).map((x) => x.part))
    if (!(parts.has('palm_l') && parts.has('palm_r'))) {
      gaps.push('palms.missing_innate_or_acquired')
    }
    const palmKeys = new Set((palmsCh.citations ?? []).map((x) => x.featureKey?.trim()))
    if (!palmKeys.has('lifeLine') || !palmKeys.has('heartLine')) {
      gaps.push('palms.missing_life_or_heart_line')
    }
  }

  // locus must never be the bare part enum.
  const PART_ENUM = new Set(['face', 'palm_l', 'palm_r'])
  let locusIsPart = false
  for (const ch of chapters) {
    for (const cite of ch.citations ?? []) {
      if (PART_ENUM.has(cite.locus.trim())) {
        locusIsPart = true
        break
      }
    }
    if (locusIsPart) break
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

  // natal must talk about the future; period must not echo natal.
  const natal = byKind.get('natal')
  const period = byKind.get('period')
  if (natal) {
    const body = `${natal.evidence} ${natal.dynamic} ${natal.reef ?? ''}`
    const years = body.match(/\d{4}/g) ?? []
    const hasFuture = years.some((y) => Number(y) > nowYear)
    if (norm(body).length > 0 && !hasFuture) gaps.push('natal.future_thin')
  }
  if (natal && period) {
    if (
      nearEcho(norm(natal.evidence), norm(period.evidence)) ||
      nearEcho(norm(natal.dynamic), norm(period.dynamic)) ||
      nearEcho(norm(natal.reef ?? ''), norm(period.reef ?? '')) ||
      nearEcho(norm(natal.remedy ?? ''), norm(period.remedy ?? ''))
    ) {
      gaps.push('natal.dup_period')
    }
  }

  // period (会发生什么) must not collapse into advice (你该做什么) — the exact ch5≈ch6 bug.
  const advice = byKind.get('advice')
  if (period && advice) {
    if (
      nearEcho(norm(period.evidence), norm(advice.evidence)) ||
      nearEcho(norm(period.dynamic), norm(advice.dynamic)) ||
      nearEcho(norm(period.reef ?? ''), norm(advice.reef ?? '')) ||
      nearEcho(norm(period.remedy ?? ''), norm(advice.remedy ?? ''))
    ) {
      gaps.push('period.dup_advice')
    }
  }
  // advice must carry real per-axis actions (remedy is its main stage), not a thin restatement.
  if (advice) {
    const actionBody = norm(`${advice.remedy ?? ''} ${advice.dynamic}`)
    if (actionBody.length < 40) gaps.push('advice.not_actionable')
  }

  // Cross-chapter reef/remedy must not repeat across chapters (screenshot bug:
  // same 流年 reef + same 冥想 remedy pasted into every chapter). Exact-normalized
  // match always trips; nearEcho only when both are long enough (avoid false hits).
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
  // 流年 belongs to period.reef; flag when a dated 流年 line sprays into ≥2 non-period reefs.
  let liunianNonPeriod = 0
  for (const ch of chapters) {
    if (ch.kind === 'period') continue
    if (ch.reef && /\d{4}[^。！？.!?]{0,6}流年/.test(ch.reef)) liunianNonPeriod += 1
  }
  if (liunianNonPeriod >= 2) gaps.push('chapters.reef_liunian_spray')

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
    // dynamic must not restate the one-line verdict (goldenLine is short → use containment).
    if (gl.length >= 12 && dyn.length > 0 && (dyn === gl || dyn.includes(gl))) {
      gaps.push(`field.dynamic_eq_golden:${ch.kind}`)
    }
    // citation notes must advance the chapter, not paste a body sentence.
    for (const cite of ch.citations ?? []) {
      const n = norm(cite.note)
      if (n.length >= 10 && (ev.includes(n) || dyn.includes(n) || reef.includes(n))) {
        gaps.push(`cite.note_echo_body:${ch.kind}`)
        break
      }
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
    // Anti-thin (deepen trigger): a developed field carries the 形→机理→场景 chain;
    // the model demonstrably defaults to ~20-char one-liners. Insurance, retry-only.
    if (ev.length > 0 && ev.length < 40) gaps.push(`field.thin_evidence:${ch.kind}`)
    if (dyn.length >= 12 && dyn.length < 40) gaps.push(`field.thin_dynamic:${ch.kind}`)
    if (gl.length > 40) {
      const prev = goldenSeen.get(gl)
      if (prev && prev !== ch.kind) gaps.push('chapters.golden_dup')
      else goldenSeen.set(gl, ch.kind)
    }
  }

  return [...new Set(gaps)]
}

/**
 * Log-only observation (NOT a retry gate): whether face/palms citation notes
 * name any tension at all. Absence hints the model cherry-picked auspicious loci.
 * Kept out of faceoracleDensityGaps on purpose — forcing caution words would push
 * the model to fabricate negatives, which is worse than silence.
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
  }>
): string[] {
  const out: string[] = []
  for (const kind of ['face', 'palms'] as const) {
    const ch = chapters.find((c) => c.kind === kind)
    if (!ch) continue
    const notes = (ch.citations ?? []).map((c) => c.note).join('')
    if (notes.trim().length > 0 && !CAUTION_WORDS.some((w) => notes.includes(w))) {
      out.push(`caution_word_absent:${kind}`)
    }
  }
  return out
}
