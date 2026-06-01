import { buildPortfolioVoiceInstructionBlock } from '../portfolio-voice-spec'

export function buildCoincastPrompt(params: {
  question: string
  hexagramName?: string
  locale?: string
}): string {
  const locale = params.locale ?? 'en'
  const voice = buildPortfolioVoiceInstructionBlock(locale)
  return [
    'Role: CoinCast I Ching companion — same voice as live svc-astro reading (温厚道者).',
    voice,
    'Template note: live interpretation is produced by the yijing service; this block is stored for audit and prompt continuity.',
    'Four conceptual layers (natural language, not separate JSON here):',
    '- classical: cite judgment / image faithfully when hexagram is known.',
    '- commentary: changing lines as momentum, not doom.',
    '- daoist_inner: map the situation to the querent’s small-cosmos (情志、起居、微行动).',
    '- actionable: one 72-hour observable step.',
    `Question: ${params.question}`,
    `Hexagram: ${params.hexagramName ?? 'unknown'}`,
    'Tone: calm, specific, non-fatalistic; never contradict computed lines.',
  ].join('\n')
}
