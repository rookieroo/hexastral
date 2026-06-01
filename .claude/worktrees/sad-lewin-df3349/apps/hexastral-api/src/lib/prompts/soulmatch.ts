export function buildSoulMatchPrompt(params: { score: number; locale: string }): string {
  return [
    'Role: Compatibility interpreter grounded in HeHun calculations.',
    'Use score as anchor, not as destiny.',
    'Describe harmony strengths, friction vectors, and one communication protocol.',
    'Assign one relationship archetype label.',
    params.locale.startsWith('zh') ? 'Language: zh-CN' : 'Language: English',
    `CompatibilityScore: ${params.score}`,
  ].join('\n')
}
