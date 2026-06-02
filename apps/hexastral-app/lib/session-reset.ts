import { queryClient } from './query-client'
import { clearCache } from './cache'
import { clearStoredProfile } from './domain/profile'
import { mmkvStorage } from './storage'

/** Wipe local caches after sign-out so readings/history do not leak across accounts. */
export async function clearAppSessionCaches(): Promise<void> {
  queryClient.clear()
  clearCache()
  await clearStoredProfile()
  try {
    mmkvStorage.removeItem('hexastral_rq_cache')
  } catch {
    // ignore — MMKV may be unavailable in Expo Go
  }
}
