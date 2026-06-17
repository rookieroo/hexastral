/**
 * Yuun (auspice) personal-reading chapter cache — binds the shared @zhop/scenario-yuan
 * engine to auspice's portfolio identity: the satellite-runtime HMAC signer + the
 * secure-store `getPortfolioUserId()` (NOT an AsyncStorage key — auspice's userId lives
 * outside AsyncStorage, hence the `getUserId` injection). Mirrors Yuel's binding but
 * with auspice's own keys, so the two apps never share a cache namespace.
 *
 * The personal deep read is the signed-in lower layer of Yuun's two-tier model; an
 * anonymous user gets `null` from the signer and the screen falls back to its template.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getPortfolioUserId, resolvePortfolioApiUrl, signRequest } from '@zhop/satellite-runtime'
import {
  type CachedChapter,
  computeChartHash,
  createReadingCache,
  type ReadingBirthInputs,
} from '@zhop/scenario-yuan/reading-cache'

const reportCache = createReadingCache({
  apiUrl: resolvePortfolioApiUrl(),
  signRequest: ({ body, userId, method, path }) => signRequest({ body, userId, method, path }),
  storage: AsyncStorage,
  getUserId: getPortfolioUserId,
  cachePrefix: 'auspice_report_',
  chartReadyPrefix: 'auspice_chart_ready_',
  requestIdTag: 'auspice',
})

export const { getCachedChapter, setCachedChapter, fetchChapter } = reportCache
export type { CachedChapter, ReadingBirthInputs }
export { computeChartHash }
