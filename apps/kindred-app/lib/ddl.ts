/**
 * Deferred Deep Link (DDL) — Kindred B-user invite recovery after a COLD install.
 *
 * The fatal break in the viral loop: when B taps A's `/resonate/{token}` link
 * but does NOT have the app yet, B installs from the App Store and opens the app
 * cold — with no URL, so the resonate token is lost and B drops into generic
 * onboarding (never reaching `/accept/[token]`). This closes that gap by
 * mirroring the proven flagship pattern (apps/hexastral-app/lib/domain/ddl.ts):
 *
 *   web /resonate → createDDLSession({ payload: { kind:'kindred-accept', token } })
 *                 → redirectToAppStore(sessionToken)            (KV stores by fingerprint+IP)
 *   app cold start → [has token]  resolveDDLSession(token)      (deep-link path)
 *                  : [no token]   matchDDLSession(fingerprint)  (App-Store cold-install path)
 *                  → payload.token → router.push(/accept/{token})
 *
 * Runs once per install (AsyncStorage `claimed` guard); a non-invited organic
 * user costs exactly one `match` call that returns nothing, then never again.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { matchDDLSession, resolveDDLSession } from '@zhop/ddl-client/client'
import * as Linking from 'expo-linking'
import { Dimensions, Platform } from 'react-native'
import { config } from '@/lib/config'
import { extractAcceptClaim, type KindredAcceptClaim } from '@/lib/ddl-claim'

export { extractAcceptClaim, type KindredAcceptClaim } from '@/lib/ddl-claim'

const CLAIMED_KEY = 'kindred_ddl_claimed'
const TOKEN_KEY = 'kindred_ddl_token'

/** Stash a `?ddl=` token carried by a deep link (the installed/scheme path). */
export async function setKindredDdlToken(url: string | null): Promise<void> {
  if (!url) return
  try {
    const token = Linking.parse(url).queryParams?.ddl
    if (typeof token === 'string' && token.length > 0) {
      await AsyncStorage.setItem(TOKEN_KEY, token)
    }
  } catch {
    /* ignore malformed urls */
  }
}

async function consumeToken(): Promise<string | null> {
  const token = await AsyncStorage.getItem(TOKEN_KEY)
  if (token) await AsyncStorage.removeItem(TOKEN_KEY)
  return token
}

/** Light device fingerprint for the cold-start fuzzy match (screen + tz + platform). */
function deviceFingerprint() {
  const { width, height } = Dimensions.get('screen')
  return {
    screenWidth: Math.round(width),
    screenHeight: Math.round(height),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    platform: Platform.OS,
  }
}

/**
 * Attempt to recover a pending kindred-accept claim after install. Runs once
 * (claimed guard). Token-first, then fingerprint match. Never throws — a DDL
 * failure must not block app launch.
 */
export async function attemptKindredDdlRestore(): Promise<KindredAcceptClaim | null> {
  try {
    if ((await AsyncStorage.getItem(CLAIMED_KEY)) === 'true') return null

    // Path 1 — exact token (a deep link delivered `?ddl=`).
    const token = await consumeToken()
    if (token) {
      const { session, found } = await resolveDDLSession(config.apiUrl, token)
      if (found) {
        const claim = extractAcceptClaim(session)
        if (claim) {
          await AsyncStorage.setItem(CLAIMED_KEY, 'true')
          return claim
        }
      }
    }

    // Path 2 — fuzzy fingerprint match (App-Store cold install, no token).
    const { session, found } = await matchDDLSession(config.apiUrl, deviceFingerprint())
    if (found) {
      const claim = extractAcceptClaim(session)
      if (claim) {
        await AsyncStorage.setItem(CLAIMED_KEY, 'true')
        return claim
      }
    }

    // Neither matched → mark attempted so we never re-run for this install.
    await AsyncStorage.setItem(CLAIMED_KEY, 'true')
    return null
  } catch {
    return null
  }
}

/** Dev-only — force the next launch to retry the restore. */
export async function resetKindredDdlState(): Promise<void> {
  await AsyncStorage.multiRemove([CLAIMED_KEY, TOKEN_KEY])
}
