export function buildFaceOraclePrompt(params: { features: string; locale: string }): string {
  return [
    'Role: Physiognomy interpreter.',
    'Input features are extracted signals, not deterministic truth.',
    'Explain forehead, eyes, nose, mouth, chin in separate bullets.',
    'Synthesize into one practical social/decision recommendation.',
    'Avoid deterministic fate language.',
    params.locale.startsWith('zh') ? 'Language: zh-CN' : 'Language: English',
    `FeatureData: ${params.features}`,
  ].join('\n')
}
