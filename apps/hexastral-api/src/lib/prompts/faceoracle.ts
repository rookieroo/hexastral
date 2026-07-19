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
  'Write as warning + foreshadowing, not verdicts — and not soft filler.',
  'Pattern: “形上可见 X…，命盘上 Y…，气机上宜留意 Z（window）.”',
  'Resonance = specific classical loci + dated chart windows — NOT “you will / 必将”.',
  'Hard seasons: frame as rhythm / 内修参考, but STILL name the locus and the window.',
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

const THREE_AXES = [
  '## Three life axes (required every reading)',
  'Audience priority: career (事业), love (爱情), health (生命健康).',
  'Cover ALL THREE at least once across period.events + advice (and overview/reef when natural).',
  'Each axis needs 现状 (what form AND natal show now) + 宜留意建议 (what to watch / do).',
  'Classical hooks (examples, not checklist dump):',
  '- career: 官禄宫, 事业线, 印堂/山根, 流年官杀财',
  '- love: 夫妻宫, 感情线, 婚姻线, 男女宫',
  '- health: 疾厄宫, 生命线, 气色骨肉, 健康线 (non-medical framing only)',
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
  'Chapter focus (形命互证 — do not isolate one path):',
  '- overview: 形气总象 + loudest axis; one sentence of form↔chart agreement or tension.',
  '- face: 三停五岳十二宫五官 — face-primary; ≥3 citations; optional one 与日主/流年互证 line, not a BaZi dump.',
  '- palms: lines + mounts; left/right compare; ≥3 citations; optional one chart-corroboration line.',
  '- natal: 日主用神通关五行 × form — ≥2 explicit form↔pillar links; use NatalSummary 大运/流年; NOT a standalone 命书 chapter.',
  '- period: current 大运/本流年 (or next) MUST be named; windows + events (≥3); each event ties axis to form cue OR chart cue (prefer both).',
  '- advice: ≥1 concrete 宜留意 action per axis; each action should reference form locus and/or dated chart window — not generic pep talk.',
  '- evidence ≠ dynamic: evidence = what form/chart shows; dynamic = how qi/timing moves — never copy-paste the same paragraph.',
].join('\n')

const DEPTH_CONTRACT = [
  '## Depth contract (folk master brief — not a slogan list)',
  '- Write as a careful 算命 master would: form observation ↔ chart cue → qi motion → what to watch → reflective key.',
  '- Cite specific keys from FaceFeatures / Palm*Features / NatalSummary (e.g. 天庭, 印堂, 生命线, 金星丘, 日主, 当前大运).',
  '- Ban empty filler as entire fields: “keep balanced”, “stay healthy”, “气色较好” alone, “气机流动平稳” alone.',
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
    evidence: string
    dynamic: string
    remedy?: string | null
    citations?: Array<{ locus: string; note: string }>
  }>
): string[] {
  const gaps: string[] = []
  const byKind = new Map(chapters.map((c) => [c.kind, c]))

  const face = byKind.get('face')
  const palms = byKind.get('palms')
  const natal = byKind.get('natal')
  const advice = byKind.get('advice')

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

  const adviceText = `${advice?.evidence ?? ''} ${advice?.dynamic ?? ''} ${advice?.remedy ?? ''}`
  const adviceBlob = adviceText.toLowerCase()
  const hasCareer =
    /career|事业|官禄|工作|职场|work|job/.test(adviceBlob) ||
    /事業|職場/.test(adviceText)
  const hasLove =
    /love|爱情|感情|夫妻|婚姻|relationship|partner/.test(adviceBlob) ||
    /愛情|關係/.test(adviceText)
  const hasHealth =
    /health|健康|疾厄|气色|養生|wellness|body/.test(adviceBlob) ||
    /氣色|養生/.test(adviceText)
  if (!hasCareer) gaps.push('advice.missing_axis:career')
  if (!hasLove) gaps.push('advice.missing_axis:love')
  if (!hasHealth) gaps.push('advice.missing_axis:health')

  return gaps
}
