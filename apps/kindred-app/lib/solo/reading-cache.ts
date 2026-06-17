/**
 * Personal-reading chapter cache for Yuel — a thin binding of the shared
 * @zhop/scenario-yuan engine to kindred's own HMAC v2 signer (lib/hmac), config
 * (lib/config), and AsyncStorage (the `yuan_user_id` key lib/auth.tsx provisions).
 * Phase 0c of the Yuel/Yuun split: the logic is shared; only the deps are injected
 * here, so every `@/lib/solo/reading-cache` consumer is untouched and behaviour
 * (cache keys, signing) is identical to before.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  type CachedChapter,
  computeChartHash,
  createReadingCache,
  type ReadingBirthInputs,
} from '@zhop/scenario-yuan/reading-cache'
import { config } from '../config'
import { signRequest } from '../hmac'

const cache = createReadingCache({
  apiUrl: config.apiUrl,
  signRequest,
  storage: AsyncStorage,
  userIdKey: 'yuan_user_id',
  cachePrefix: 'kindred_reading_ch_',
  chartReadyPrefix: 'kindred_chart_ready_v1_',
  requestIdTag: 'kindred',
})

export const { getCachedChapter, setCachedChapter, fetchChapter } = cache
export type { CachedChapter, ReadingBirthInputs }
export { computeChartHash }
