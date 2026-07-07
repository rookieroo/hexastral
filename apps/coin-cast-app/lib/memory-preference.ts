/**
 * Memory-preference API for Yaul — wraps portfolio-client HMAC-signed calls.
 * Only same-app `enabled` is exposed (no cross-app toggle).
 */

import {
  fetchPortfolioMemoryPreference,
  setPortfolioMemoryPreference,
} from '@zhop/portfolio-client'

export async function fetchMemoryPreference(): Promise<{ enabled: boolean }> {
  return fetchPortfolioMemoryPreference()
}

export async function setPortfolioMemory(enabled: boolean): Promise<void> {
  await setPortfolioMemoryPreference(enabled)
}
