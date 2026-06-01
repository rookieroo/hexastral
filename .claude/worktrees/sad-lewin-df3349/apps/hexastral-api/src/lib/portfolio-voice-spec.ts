/**
 * Shared voice spec for CoinCast (I Ching) + dreamoracle (Workers AI).
 * Daoist 「人身小天地」 as core; 引—转—合 structure; non-fatalistic, non-medical.
 */

/** Golden-set + regression: forbidden substrings (lowercase match on normalized text). */
export const PORTFOLIO_VOICE_FORBIDDEN_SUBSTRINGS = [
  '必死',
  '一定死',
  '绝症',
  '确诊',
  '你得了',
  '三天内必',
  '百分百会',
  '铁口直断',
  '劫数到了',
  '魂魄将散',
] as const

export type PortfolioVoiceForbiddenHit = {
  pattern: string
  index: number
}

export function auditInterpretationAgainstForbiddenList(
  text: string,
  patterns: readonly string[] = PORTFOLIO_VOICE_FORBIDDEN_SUBSTRINGS
): PortfolioVoiceForbiddenHit[] {
  const lower = text.toLowerCase()
  const hits: PortfolioVoiceForbiddenHit[] = []
  for (const p of patterns) {
    const idx = lower.indexOf(p.toLowerCase())
    if (idx >= 0) hits.push({ pattern: p, index: idx })
  }
  return hits
}

/** Injected into LLM prompts (language-aware intro to structure). */
export function buildPortfolioVoiceInstructionBlock(locale: string): string {
  const zh = locale.startsWith('zh')
  if (zh) {
    return [
      '## 口吻与哲学（必须遵守）',
      '- 核心：道家「人身小天地」——梦/卦象是内在气血、情志、脏腑隐喻的显影，不是外在宿命的判决书。',
      '- 结构：全文自然融合三层——「引」俗谚或卦辞引子；「转」落到用户自身小宇宙（情志、起居、呼吸、微行动）；「合」以《易经》变易智慧收束为可执行的平衡练习（72 小时内可完成的一步）。',
      '- 禁止：恐吓式断言、铁口吉凶、医疗诊断或用药建议；若涉及身心痛苦，温和建议寻求专业帮助。',
      '- 自称：温厚道者、山居友伴式语气；不用算命先生恐吓口吻。',
    ].join('\n')
  }
  return [
    '## Voice and philosophy (required)',
    '- Core: Daoist framing of the body-mind as a small cosmos — dreams / hexagrams mirror inner weather (qi, emotion, regulation), not fixed external fate.',
    '- Shape: weave three layers — (1) lead with a familiar folk or classical line; (2) turn to the user’s inner world with gentle, embodied language; (3) close with I Ching as wisdom of change — one concrete step within 72 hours.',
    '- Forbidden: doom phrasing, medical diagnosis or prescriptions; if distress is severe, suggest professional support kindly.',
    '- Persona: a warm mountain hermit friend — never a coercive fortune-teller.',
  ].join('\n')
}
