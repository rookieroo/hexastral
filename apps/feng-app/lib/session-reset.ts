import { clearDraft } from './siteDraft'

/** Wipe local caches after sign-out so drafts do not leak across accounts. */
export async function clearFengSessionCaches(): Promise<void> {
  try {
    await clearDraft()
  } catch (err) {
    if (__DEV__) console.warn('[Fēng] clearDraft on sign-out failed', err)
  }
}
