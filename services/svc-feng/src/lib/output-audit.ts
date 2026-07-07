/**
 * Post-generation audit for Kanyu synthesis — portfolio hard + feng talisman/outcome list.
 */
import {
  auditFengSynthesisHits,
  buildForbiddenRewriteSuffix,
  type PortfolioVoiceForbiddenHit,
} from '@zhop/portfolio-voice'

export type OutputAuditResult = {
  hits: PortfolioVoiceForbiddenHit[]
  rewriteSuffix: string | null
}

export function auditGeneratedOutput(text: string): OutputAuditResult {
  const hits = auditFengSynthesisHits(text)
  return {
    hits,
    rewriteSuffix: hits.length > 0 ? buildForbiddenRewriteSuffix(hits) : null,
  }
}

export { auditFengSynthesisHits, buildForbiddenRewriteSuffix }
