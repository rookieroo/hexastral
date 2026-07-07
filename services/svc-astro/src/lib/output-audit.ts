/**
 * Post-generation hard-forbidden audit with optional retry hint.
 */
import {
  auditHardForbiddenHits,
  buildForbiddenRewriteSuffix,
  type PortfolioVoiceForbiddenHit,
} from '@zhop/portfolio-voice'

export type OutputAuditResult = {
  hits: PortfolioVoiceForbiddenHit[]
  rewriteSuffix: string | null
}

export function auditGeneratedOutput(text: string): OutputAuditResult {
  const hits = auditHardForbiddenHits(text)
  return {
    hits,
    rewriteSuffix: hits.length > 0 ? buildForbiddenRewriteSuffix(hits) : null,
  }
}

export { auditHardForbiddenHits, buildForbiddenRewriteSuffix }
