import { buildComplianceInstructionBlock, buildPortfolioVoiceInstructionBlock } from '@zhop/portfolio-voice'

export function buildSoulMatchPrompt(params: {
  score?: number
  essenceLabel?: string
  gradeLabel?: string
  locale: string
}): string {
  const compliance = buildComplianceInstructionBlock(params.locale)
  const essence = params.essenceLabel ?? 'relationship overlay'
  const grade = params.gradeLabel ?? (params.score != null ? `reference ${params.score}` : 'reference grade')
  return [
    'Role: Relationship dynamics interpreter grounded in HeHun calculations.',
    compliance,
    'Use essence/grade as cultural reference anchors, not as destiny or a compatibility score.',
    'Describe harmony strengths, friction vectors, and one communication protocol.',
    'Assign one relationship archetype label rooted in classical imagery — not a match percentage.',
    params.locale.startsWith('zh') ? 'Language: zh-CN' : 'Language: English',
    `EssenceTag: ${essence}`,
    `GradeReference: ${grade}`,
  ].join('\n')
}
