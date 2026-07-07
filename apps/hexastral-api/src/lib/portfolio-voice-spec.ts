/**
 * Re-export from @zhop/portfolio-voice for backward compatibility within hexastral-api.
 */
export {
  auditHardForbiddenHits,
  auditInterpretationAgainstForbiddenList,
  auditSoftForbiddenHits,
  buildComplianceInstructionBlock,
  buildForbiddenRewriteSuffix,
  buildPortfolioVoiceInstructionBlock,
  PORTFOLIO_VOICE_FORBIDDEN_SUBSTRINGS,
  PORTFOLIO_VOICE_SOFT_FORBIDDEN_SUBSTRINGS,
  type PortfolioVoiceForbiddenHit,
} from '@zhop/portfolio-voice'
