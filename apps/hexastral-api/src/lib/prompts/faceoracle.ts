/**
 * FaceOracle LLM prompt — Xingqi canonical stack (ADR-0028).
 *
 * Locked school (no multi-school UI):
 *   Face  三停·五岳·十二宫·五官·气色骨肉
 *   Palm  主纹 + 丘位 (mounts)
 *   Natal 日主·用神·通关·五行·大运流年流月
 * Tone: 宜留意 / 气机 — study framing, not fate.
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

const SCHOOL_LOCK = [
  'Canonical stack (do not mix other schools such as Ziwei stars or unrelated systems):',
  'Face = 三停 / 五岳 / 十二宫 / 五官 / 气色骨肉.',
  'Palm = major lines (生命线/智慧线/感情线/事业线…) + mounts/丘位 (金星丘…).',
  'Natal = 日主 / 用神 / 通关 / 五行相生相克比和 / 大运流年流月.',
  'Framing = 宜留意 / 气机 — cultural study, never deterministic fate.',
].join(' ')

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
  'Chapter focus (keep vocab on-chapter; do not dump BaZi into face/palms chapters):',
  '- overview: 形气总象 — complexion / bone-flesh / overall qi; set the tone for later chapters.',
  '- face: 三停五岳十二宫五官 — facial structure only; no deep BaZi.',
  '- palms: lines + mounts; compare left/right; no deep BaZi.',
  '- natal: 日主用神通关五行 — contrast form features with pillars.',
  '- period: 流年流月大运 windows worth noting + events array.',
  '- advice: 宜留意 actions / observation; no new fate claims.',
].join('\n')

const DEPTH_CONTRACT = [
  '## Depth contract (professional 形气 study — not a slogan list)',
  '- Write as a careful master would: concrete observation → qi motion → what to watch → reflective key.',
  '- Cite specific keys from FaceFeatures / Palm*Features / NatalSummary (e.g. 天庭, 印堂, 生命线, 金星丘, 日主).',
  '- Ban empty filler as entire fields: “keep balanced”, “stay healthy”, “气色较好” alone, “气机流动平稳” alone.',
  '- Per chapter field lengths:',
  '  - goldenLine: exactly 1 sentence, quotable, specific to THIS face/palms/natal.',
  '  - evidence: 2–4 sentences (form basis).',
  '  - dynamic: 2–4 sentences (qi motion / timing feel).',
  '  - reef: 1–2 sentences (worth noting), or null only if truly nothing.',
  '  - remedy: 1–2 sentences (reflective practice), or null only if reef is null.',
  '  - counterpoint: 1 short cultural disclaimer sentence.',
  '- events: at least 2 and at most 6 dated windows; each theme+note must be distinct and grounded.',
  '- period chapter must discuss the horizonMonths window with more than one concrete cue.',
].join('\n')

function outputKindHint(kind: FaceOracleOutputKind): string {
  switch (kind) {
    case 'period_brief':
      return 'OutputKind emphasis: period_brief — still fill all 6 chapters; put extra density into period + events.'
    case 'deep':
      return 'OutputKind emphasis: deep — maximum concrete citation density across face/palms/natal.'
    default:
      return 'OutputKind emphasis: oneshot — full 6-chapter professional brief; no shortcuts.'
  }
}

export function buildFaceOraclePrompt(params: FaceOraclePromptParams): string {
  const lines = [
    'Role: East-Asian physiognomy + BaZi cultural interpreter (Xingqi / Form reading).',
    'Hard rules: no guaranteed outcomes; no deterministic fate; use “宜留意 / worth noting”.',
    SCHOOL_LOCK,
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
    '      "counterpoint": string | null',
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
