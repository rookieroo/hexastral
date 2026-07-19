/**
 * FaceOracle LLM prompt — Xingqi canonical stack (ADR-0028).
 *
 * Product identity: folk 算命 toolkit — face + palms + BaZi 互证.
 *   Not Yuel personal 命书 (BaZi-forward). Not Yuun personal 黄历 (calendar-forward).
 *
 * Locked school (no multi-school UI):
 *   Face  三停·五岳·十二宫·五官·气色骨肉
 *   Palm  主纹 + 丘位 (mounts)
 *   Natal 日主·用神·通关·五行·大运流年流月
 * Tone: 警示 / 预告 — “形上可见…，命盘上…，气机上宜留意…” — study framing, not fate.
 * Compliance: ADR-0003 via @zhop/portfolio-voice (modality only — keep specificity).
 *
 * Locale: Route B via faceoracle-locale (Yuun/Yuel parity).
 */

import { buildComplianceInstructionBlock } from '@zhop/portfolio-voice'

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

const METHOD = [
  '## Method (locked — Xingqi = folk 算命 stack)',
  'You are writing as a traditional reader who ALWAYS combines 面相 + 掌相 + 八字.',
  'Form (face/palms) and chart (日主/大运/流年) CORROBORATE each other — neither is garnish.',
  'Anti-patterns:',
  '- Do NOT write a Yuel-style personal natal essay that barely cites face/palm loci.',
  '- Do NOT write a Yuun-style almanac / day-luck brief that ignores physiognomy.',
  '- Do NOT let evidence and dynamic be paraphrases of each other (form basis ≠ qi/timing motion).',
  'When a claim is strong, show agreement or productive tension between a form locus and a chart cue.',
  'Timing windows come from NatalSummary 大运/流年/流月 — not invented biography (“you divorced in 2021”).',
].join('\n')

const SCHOOL_LOCK = [
  'Canonical stack (do not mix other schools such as Ziwei stars or unrelated systems):',
  'Face = 三停 / 五岳 / 十二宫 / 五官 / 气色骨肉.',
  'Palm = major lines (生命线/智慧线/感情线/事业线…) + mounts/丘位 (金星丘…).',
  'Natal = 日主 / 用神 / 通关 / 五行相生相克比和 / 大运流年流月.',
  'Framing = 警示 / 预告 / 宜留意 / 气机 — cultural study, never deterministic fate.',
].join(' ')

const VOICE = [
  '## Voice (locked)',
  'Write as warning + foreshadowing + practical counsel — not soft filler, not iron fate.',
  'Pattern: “形上可见 X…，命盘上 Y（年/月）…，气机上宜留意 Z；可做的一步：….”',
  'Paid brief standard: every advice/reef/remedy should answer WHAT to watch, WHEN (dated), and WHAT to do/avoid/seize.',
  'Examples of GOOD specificity: “丙午年中段宜维护合伙人信任，少推新摊子”; “感情线见张力时，宜在流月…先谈边界再谈承诺”; “气色偏紧的月份把节奏放慢一周”.',
  'Examples of BAD vagueness: “保持平衡”; “多沟通”; “注意情绪”; “稳健前行” with no locus and no date.',
  'Resonance = classical loci + dated chart windows + one actionable step — NOT “you will / 必将”.',
  'Hard seasons: frame as rhythm / 内修参考, but STILL name the locus, the window, and a practical move.',
  'Never replace concrete observation with empty positivity (“stay balanced”, “keep healthy”, “grounded presence”, “cautious momentum”, “steady path”).',
  'Each evidence/dynamic paragraph must cite at least one named locus or dated window; reject vague mood essays.',
  'Ban (modality): you will / 必将 / 一定 / 必然 / 注定 / 铁口 / guaranteed / destiny is fixed / predict as fact.',
  'Ban (superstition remedies): 符咒 / 开光 / 改运仪式 / talismans / ritual objects.',
].join('\n')

const HEALTH_BOUNDARY = [
  '## Health axis boundary (required — App Store / Terms §3)',
  'Health = complexion rhythm, sleep/pace, 气色骨肉 — cultural study only.',
  'Ban: disease names, diagnosis, prescriptions, lifespan, death timing, “you have X illness”.',
  'If form suggests strain, say 宜留意 pace / rest; optionally one line: 宜咨询专业医师 / consult a clinician.',
  'Never promise cure or guaranteed wellness outcomes.',
].join('\n')

const LOVE_FAMILY_BOUNDARY = [
  '## Love / marriage / family — ban census, ALLOW concrete foreshadowing',
  'Ban (铁口户籍断语 only): “你已结婚/未婚”, “你有N个孩子”, “你母亲/配偶性格是…”, naming living relatives’ concrete biography,',
  '  “will marry / divorce / have a son this year” as guaranteed fate.',
  'ALLOW and REQUIRE (this is the paid value — not vague mood essays):',
  '- 预警 + 务实建议: if 夫妻宫/感情线/父母宫/兄弟宫 show friction, say what to watch and what to DO',
  '  (沟通节奏、边界、少争一时、何时宜谈事 / when to repair vs when to pause).',
  '- 爱人/亲密关系矛盾: practical repair moves tied to a dated window (流年/流月/大运段).',
  '- 家人关系气机: if parental/sibling palaces or lines suggest strain, give one concrete pacing tip — still 宜留意, not a personality dossier.',
  '- 同事/合伙人: name windows to maintain rapport vs windows to avoid over-pushing vs windows to take initiative',
  '  (官禄/事业线 × 流年官杀财) — specific month/year from NatalSummary when possible.',
  'Shape: “形上可见 X；命盘上 Y 年/月；宜留意 Z；可做的一步：…” — concrete, dated, actionable.',
].join('\n')

const THREE_AXES = [
  '## Three life axes (EQUAL weight — career must NOT dominate)',
  'Axes: career (事业/同事合伙人) · love (爱情/婚姻/亲密关系) · health (生命/气色节奏).',
  'HARD: across the full JSON, love and health must get as much concrete attention as career.',
  'HARD: ban a reading that only loops 事业线/官禄 while ignoring 感情线/婚姻线/夫妻宫 and 生命线/气色/疾厄宫.',
  'HARD: ban empty overview advice (“保持平衡/多沟通”) without a locus AND a dated window AND one actionable step.',
  'Cover ALL THREE in: period.events (one event per axis minimum) AND advice (one 宜留意 action per axis).',
  'Also weave love + health into overview/palms/face where loci exist.',
  'Each axis needs: 现状 (form+chart) + 时间窗 (大运/流年/月) + 务实一步 (what to do / avoid / seize).',
  'Classical hooks:',
  '- career: 官禄宫, 事业线, 印堂/山根, 流年官杀财 — include 同事/合伙人关系维护 vs 冒进 vs 抓机遇 windows',
  '- love: 夫妻宫, 男女宫, 感情线, 婚姻线, 金星丘; 父母宫/兄弟宫 as family-relation qi + repair tips (not family census)',
  '- health: 疾厄宫, 生命线, 气色骨肉, 健康线 (non-medical: pace/rest only)',
].join('\n')

const VOCAB = [
  'Allowed glossary tokens (prefer these; plain language OK around them):',
  '形气, 气机, 宜留意, 气色, 骨相, 肉相,',
  '面相, 三停, 五岳, 五官, 十二宫,',
  '命宫, 财帛宫, 兄弟宫, 田宅宫, 男女宫, 奴仆宫, 夫妻宫, 疾厄宫, 迁移宫, 官禄宫, 福德宫, 父母宫,',
  '天庭, 印堂, 山根, 年寿, 准头, 人中, 地阁, 承浆, 颧骨, 中岳,',
  '法令纹, 川字纹, 鱼尾纹, 卧蚕, 眉型, 眼型, 鼻型, 嘴型, 耳垂,',
  '掌相, 掌形, 丘位, 生命线, 智慧线, 感情线, 事业线, 婚姻线, 健康线, 太阳线,',
  '金星丘, 木星丘, 土星丘, 太阳丘, 水星丘, 月丘, 火星丘, 指节,',
  '日主, 用神, 通关, 相生, 相克, 比和, 金, 木, 水, 火, 土,',
  '大运, 流年, 流月, 正印, 偏印, 正官, 七杀, 食神, 伤官, 正财, 偏财, 比肩, 劫财.',
].join(' ')

const CHAPTER_RULES = [
  'Chapter focus (形命互证 — do not isolate one path; do not career-only):',
  '- overview: 形气总象; name which axes are loud (must not be career-only); one form↔chart agreement/tension line.',
  '- face: 三停五岳十二宫 — include at least one love-relevant (夫妻宫/男女宫) OR health-relevant (疾厄宫/气色) citation when features support it; ≥3 citations.',
  '- palms: MUST cite 生命线 AND (感情线 or 婚姻线) AND may cite 事业线 — do not make 事业线 the only story; ≥3 citations; optional chart-corroboration line.',
  '- natal: 日主用神通关 × form — ≥2 form↔pillar links; touch love OR health axis once (not only官杀财).',
  '- period: name current 大运/本流年; events ≥3 with axes career+love+health each once; period prose must mention love and health windows, not only career.',
  '- advice: ≥1 concrete 宜留意 action per axis (career/colleagues-partners, love/intimacy, health/pace);',
  '  each action MUST include (1) form or chart cue (2) dated window when possible (3) do/avoid/seize step — not “多沟通/保持平衡”.',
  '- period events: each theme+note should be usable as a calendar tip (maintain / avoid冒进 / 抓机遇 / repair bond), not a mood label.',
  '- evidence ≠ dynamic: never copy-paste the same paragraph.',
].join('\n')

const DEPTH_CONTRACT = [
  '## Depth contract (folk master brief — not a slogan list)',
  '- Write as a careful 算命 master would: form observation ↔ chart cue → qi motion → what to watch → reflective key.',
  '- Cite specific keys from FaceFeatures / Palm*Features / NatalSummary (e.g. 天庭, 印堂, 生命线, 感情线, 婚姻线, 夫妻宫, 金星丘, 日主, 当前大运).',
  '- Ban empty filler as entire fields: “keep balanced”, “stay healthy”, “气色较好” alone, “气机流动平稳” alone.',
  '- Ban career-monoculture: if 事业/career/工作 appears heavily, love (感情/婚姻/夫妻) and health (生命/气色/疾厄) must appear with equal concreteness in the same reading.',
  '- Per chapter field lengths:',
  '  - goldenLine: exactly 1 sentence, quotable, specific to THIS face/palms/natal pairing.',
  '  - evidence: 2–4 sentences (form and/or chart basis).',
  '  - dynamic: 2–4 sentences (qi motion / timing) — must NOT paraphrase evidence.',
  '  - reef: 1–2 sentences (worth noting), or null only if truly nothing.',
  '  - remedy: 1–2 sentences (reflective practice), or null only if reef is null.',
  '  - counterpoint: 1 short cultural disclaimer sentence.',
  '  - citations: array of { locus, note } — required for face (≥3) and palms (≥3); natal ≥2; others optional.',
  '- events: at least 3 and at most 6 dated windows; each must set axis = career|love|health;',
  '  cover all three axes at least once; theme+note distinct; name a year/month or 流年 label from NatalSummary when possible.',
  '- period chapter must discuss the horizonMonths window with more than one concrete cue,',
  '  and must mention the current decade luck (大运) or current/year luck (流年) from NatalSummary at least once.',
].join('\n')

function outputKindHint(kind: FaceOracleOutputKind): string {
  switch (kind) {
    case 'period_brief':
      return 'OutputKind emphasis: period_brief — still fill all 6 chapters; put extra density into period + events + form↔chart corroboration.'
    case 'deep':
      return 'OutputKind emphasis: deep — maximum concrete citation density across face/palms/natal 互证.'
    default:
      return 'OutputKind emphasis: oneshot — full 6-chapter folk 算命 brief (形掌×八字); no shortcuts.'
  }
}

export function buildFaceOraclePrompt(params: FaceOraclePromptParams): string {
  const lines = [
    'Role: Folk East-Asian 算命 interpreter — face + palms + BaZi 互证 (Xingqi / Form reading).',
    'Hard rules: no guaranteed outcomes; no deterministic fate; use “宜留意 / worth noting”.',
    'Not a natal-only 命书. Not a calendar-only 黄历. Always combine 形 and 命.',
    buildComplianceInstructionBlock(params.locale),
    METHOD,
    SCHOOL_LOCK,
    VOICE,
    HEALTH_BOUNDARY,
    LOVE_FAMILY_BOUNDARY,
    THREE_AXES,
    `OutputKind: ${params.outputKind}`,
    outputKindHint(params.outputKind),
    `HorizonMonths: ${params.horizonMonths}`,
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
    DEPTH_CONTRACT,
    CHAPTER_RULES,
    VOCAB,
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

/** Soft density floors — used for one retry, not hard fail. */
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

  const period = byKind.get('period')
  const palms = byKind.get('palms')
  const natal = byKind.get('natal')
  const advice = byKind.get('advice')
  const overview = byKind.get('overview')
  const face = byKind.get('face')

  const citeCount = (c: { citations?: Array<{ locus: string; note: string }> } | undefined) =>
    c?.citations?.filter((x) => x.locus.trim().length > 0).length ?? 0

  if (citeCount(face) < 3) gaps.push('face.citations<3')
  if (citeCount(palms) < 3) gaps.push('palms.citations<3')
  if (citeCount(natal) < 2) gaps.push('natal.citations<2')

  const events = Array.isArray(parsed.events) ? parsed.events : []
  if (events.length < 3) gaps.push('events<3')

  const axes = new Set<string>()
  for (const ev of events) {
    if (!ev || typeof ev !== 'object') continue
    const axis = (ev as Record<string, unknown>).axis
    if (axis === 'career' || axis === 'love' || axis === 'health') axes.add(axis)
  }
  for (const a of ['career', 'love', 'health'] as const) {
    if (!axes.has(a)) gaps.push(`events.missing_axis:${a}`)
  }

  const blobOf = (c: { evidence?: string; dynamic?: string; remedy?: string | null; reef?: string | null; goldenLine?: string } | undefined) =>
    `${c?.goldenLine ?? ''} ${c?.evidence ?? ''} ${c?.dynamic ?? ''} ${c?.reef ?? ''} ${c?.remedy ?? ''}`

  const adviceText = blobOf(advice)
  const periodText = blobOf(period)
  const palmsText = blobOf(palms)
  const overviewText = blobOf(overview)
  const corpus = `${overviewText}\n${periodText}\n${adviceText}\n${palmsText}`

  const hasCareer =
    /career|事业|官禄|工作|职场|work|job|事業|職場/.test(corpus)
  const hasLove =
    /love|爱情|感情|夫妻|婚姻|relationship|partner|愛情|婚姻線|感情線|男女宫|夫妻宫/.test(
      corpus
    )
  const hasHealth =
    /health|健康|疾厄|气色|養生|wellness|生命线|生命線|气色|氣色/.test(corpus)

  if (!hasCareer) gaps.push('corpus.missing_axis:career')
  if (!hasLove) gaps.push('corpus.missing_axis:love')
  if (!hasHealth) gaps.push('corpus.missing_axis:health')

  // Career monoculture: 事业 hits dwarf love+health across period+advice+palms.
  const careerHits = (corpus.match(/事业|官禄|工作|职场|career|work|job|事業|職場|事业线|事業線/gi) ?? [])
    .length
  const loveHits = (corpus.match(/爱情|感情|夫妻|婚姻|love|partner|愛情|男女宫|夫妻宫|感情线|婚姻线/gi) ?? [])
    .length
  const healthHits = (corpus.match(/健康|疾厄|气色|生命线|health|wellness|氣色|生命線|健康线/gi) ?? [])
    .length
  if (careerHits >= 6 && loveHits + healthHits < 3) {
    gaps.push('corpus.career_monoculture')
  }

  const palmsCiteBlob = (palms?.citations ?? []).map((x) => `${x.locus}${x.note}`).join(' ')
  if (
    palmsCiteBlob.length > 0 &&
    !/生命线|生命線|life\s*line/i.test(palmsCiteBlob)
  ) {
    gaps.push('palms.missing_life_line_cite')
  }
  if (
    palmsCiteBlob.length > 0 &&
    !/感情线|感情線|婚姻线|婚姻線|金星丘|heart\s*line|marriage/i.test(palmsCiteBlob)
  ) {
    gaps.push('palms.missing_love_cite')
  }

  if (!/爱情|感情|夫妻|婚姻|love|partner|愛情/.test(adviceText)) {
    gaps.push('advice.missing_axis:love')
  }
  if (!/健康|疾厄|气色|養生|health|wellness|生命|氣色/.test(adviceText)) {
    gaps.push('advice.missing_axis:health')
  }
  if (!/事业|官禄|工作|职场|career|work|job|事業/.test(adviceText)) {
    gaps.push('advice.missing_axis:career')
  }

  return gaps
}
