import { buildPortfolioVoiceInstructionBlock } from '../portfolio-voice-spec'

const zhFewShot = `Example JSON (zh):
{
  "folk_lead": "俗谚里，梦见水常与情绪流动相关。",
  "daoist_inner": "在你自身的小天地里，这更像肾气与深层安稳在夜间起伏——不是外界财运的判决书。",
  "yi_balance": "以《易经》变易观之，这是阴阳一时浮沉；温柔地回到呼吸与足下的稳。",
  "action_72h": "今晚睡前写下一句「我此刻真正需要的是什么」，并做一件让身体微微发热的小事。",
  "interpretation": ""
}`

export function buildDreamPrompt(params: {
  dreamText: string
  locale: string
  memoryContext?: string
}): string {
  const localeLine = params.locale.startsWith('zh') ? 'Language: zh-CN' : 'Language: English'
  const voice = buildPortfolioVoiceInstructionBlock(params.locale)
  const memoryBlock =
    typeof params.memoryContext === 'string' && params.memoryContext.trim().length > 0
      ? ['## 个性化语境（可选）', params.memoryContext.trim(), ''].join('\n')
      : ''

  return [
    'Role: A warm Daoist-informed dream companion (山居友伴). You are not a fortune-teller.',
    voice,
    memoryBlock,
    'Task:',
    '1) folk_lead: one short paragraph — familiar Zhou-Gong style motifs as a gentle hook only.',
    '2) daoist_inner: main paragraph — map the dream to the user’s 「人身小天地」(qi, emotion, organ-metaphor as lived imagery, not diagnosis).',
    '3) yi_balance: short paragraph — I Ching as wisdom of change (yin-yang rebalancing), not divination verdict.',
    '4) action_72h: one concrete, kind step within 72 hours (breath, journaling, sleep ritual, or reaching out).',
    '5) interpretation: optional single merged prose; if empty, the client may concatenate the three layers.',
    'Output: STRICT JSON with keys folk_lead, daoist_inner, yi_balance, action_72h, interpretation (strings only).',
    localeLine,
    `DreamText: ${params.dreamText}`,
    params.locale.startsWith('zh') ? zhFewShot : 'Keep concise, non-fatalistic, and non-medical.',
  ].join('\n')
}
