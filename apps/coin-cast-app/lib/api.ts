import { type PortfolioRunResult, runAuto } from '@zhop/portfolio-client'

import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from './growth-config'

export async function runPortfolioPreview(
  input: Record<string, unknown>,
  locale = 'en'
): Promise<PortfolioRunResult> {
  return runAuto({
    target: PORTFOLIO_TARGET_APP,
    input: { ...input },
    locale,
    anonymousStoragePrefix: PORTFOLIO_STORAGE_PREFIX,
  })
}
