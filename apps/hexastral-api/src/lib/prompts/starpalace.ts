export function buildStarPalacePrompt(params: { palaces: string; locale: string }): string {
  return [
    'Role: Zi Wei Dou Shu interpreter.',
    'Use palace distribution as fixed evidence.',
    'Explain strongest palace first, then one caution palace.',
    'Mention four-transformation style dynamic when applicable.',
    params.locale.startsWith('zh') ? 'Language: zh-CN' : 'Language: English',
    `PalaceData: ${params.palaces}`,
  ].join('\n')
}
