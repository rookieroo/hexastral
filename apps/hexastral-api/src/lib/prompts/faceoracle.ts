/**
 * FaceOracle LLM prompt builder (ADR-0028).
 * Cultural-study framing — no deterministic fate language.
 */

export type FaceOracleOutputKind = 'oneshot' | 'period_brief' | 'deep'

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

export function buildFaceOraclePrompt(params: FaceOraclePromptParams): string {
  const lang = params.locale.startsWith('zh')
    ? 'Language: zh-CN'
    : params.locale.startsWith('ja')
      ? 'Language: ja'
      : 'Language: English'

  const lines = [
    'Role: East-Asian physiognomy + BaZi cultural interpreter (study / reflection).',
    'Hard rules: no guaranteed outcomes; no deterministic fate; use “宜留意 / worth noting” framing.',
    `OutputKind: ${params.outputKind}`,
    `HorizonMonths: ${params.horizonMonths}`,
    lang,
    '',
    'Return STRICT JSON with keys:',
    '{',
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
