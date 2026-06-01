export function buildEightPillarsPrompt(params: {
  pillarsText: string
  dayMaster: string
  locale: string
}): string {
  return [
    'Role: Bazi interpreter.',
    'Use deterministic pillars as source of truth. Do not fabricate stems/branches.',
    'Explain Ten Gods implication from the day master perspective.',
    'Include element balance and a practical recommendation.',
    params.locale.startsWith('zh') ? 'Language: zh-CN' : 'Language: English',
    `DayMaster: ${params.dayMaster}`,
    `Pillars: ${params.pillarsText}`,
  ].join('\n')
}
