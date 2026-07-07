import {
  PortfolioAlreadyUpgradedError,
  PortfolioUpgradeRequiredError,
  upgradeCoincastReadingToAi,
} from '@zhop/portfolio-client'

export type CoincastUpgradeOutcome =
  | { ok: true; output: Record<string, unknown> }
  | { ok: false; reason: 'paywall' | 'already_upgraded' | 'error'; message?: string }

export async function tryUpgradeCoincastReading(
  readingId: string
): Promise<CoincastUpgradeOutcome> {
  if (!readingId.trim()) {
    return { ok: false, reason: 'error', message: 'missing_reading_id' }
  }
  try {
    const res = await upgradeCoincastReadingToAi(readingId)
    return { ok: true, output: res.output }
  } catch (err) {
    if (err instanceof PortfolioUpgradeRequiredError) {
      return { ok: false, reason: 'paywall' }
    }
    if (err instanceof PortfolioAlreadyUpgradedError) {
      return { ok: false, reason: 'already_upgraded' }
    }
    console.warn('[coincast] upgrade failed', err)
    return {
      ok: false,
      reason: 'error',
      message: err instanceof Error ? err.message : 'upgrade_failed',
    }
  }
}
