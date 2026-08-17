/**
 * Login-at-subscribe identity. Yuun is anonymous-first for the free 黄历, but
 * subscribing requires sign-in so the subscription is a portable cross-app identity:
 *   - restores on every device (not tied to one install / Apple ID anon RC id),
 *   - universe_pro continuity across the suite (Phase 2).
 *
 * Silent Yuun→Yuel 亲友 transfer on sign-in is DISABLED until Yuun has scale and a
 * deliberate opt-in conversion path (trust > funnel). See lib/bonds-transfer.ts.
 *
 * Apple / Google → POST /portfolio/auth/{apple,google} → alias RevenueCat to that
 * userId so purchases and webhooks map to the portfolio identity.
 */

import {
  exchangeAppleCredentialForPortfolio,
  exchangeGoogleCredentialForPortfolio,
  getPortfolioUserId,
  invalidatePortfolioSession,
  resolvePortfolioApiUrl,
  signRequest,
  storeAppleUserId,
} from '@zhop/satellite-runtime'
import * as AppleAuthentication from 'expo-apple-authentication'
import { Platform } from 'react-native'
import Purchases from 'react-native-purchases'
import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from './growth-config'
import { isIapEnabled } from './iap-enabled'
import { clearYuunWatchCredential } from './watch-provision'

/**
 * Alias RevenueCat to the portfolio userId so purchases restore across devices.
 *
 * No-IAP builds (`EXPO_PUBLIC_IAP_ENABLED !== 'true'`) skip this entirely — the
 * SDK is not configured there and `Purchases.logIn` would throw
 * ("configure has not been called yet"), which used to fail sign-in AFTER the
 * portfolio exchange already succeeded (server logged in, UI showed "failed").
 *
 * Even when IAP is enabled, a logIn failure must NOT fail sign-in: the portfolio
 * identity is already established and the boot-time entitlement reconcile
 * (ADR-0013 §5b) self-heals the RevenueCat alias once purchases are live.
 */
async function aliasRevenueCatIfEnabled(userId: string): Promise<void> {
  if (!isIapEnabled()) return
  try {
    await Purchases.logIn(userId)
  } catch (err) {
    console.warn('[yuun.account] RevenueCat logIn failed; sign-in continues', err)
  }
}

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin')
let isGoogleSigninConfigured = false

function googleClientIds(): { iosClientId?: string; webClientId?: string } {
  const ios = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim()
  const web = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim()
  return {
    iosClientId: ios && ios.length > 0 ? ios : undefined,
    webClientId: web && web.length > 0 ? web : undefined,
  }
}

/** Dynamic import — the native module is only present in dev/prod builds, not Expo Go. */
async function getGoogleSigninModule(): Promise<GoogleSigninModule | null> {
  try {
    const mod = (await import('@react-native-google-signin/google-signin')) as GoogleSigninModule
    if (!isGoogleSigninConfigured) {
      // webClientId (OAuth "Web application" client) is required for idToken on
      // both iOS and Android — same contract as Yuel / SatelliteGoogleAuth.
      // Do not pass the Android client id as webClientId.
      const { iosClientId, webClientId } = googleClientIds()
      mod.GoogleSignin.configure({
        iosClientId,
        webClientId,
        offlineAccess: false,
      })
      isGoogleSigninConfigured = true
    }
    return mod
  } catch {
    return null
  }
}

export async function isSignedIn(): Promise<boolean> {
  try {
    return (await getPortfolioUserId()) != null
  } catch {
    return false
  }
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  try {
    return await AppleAuthentication.isAvailableAsync()
  } catch {
    return false
  }
}

/**
 * Apple Sign In → portfolio identity → RevenueCat alias. Returns the userId, or
 * null if the user cancelled. Throws on a real failure (caller surfaces an error).
 */
export async function signInWithApple(): Promise<string | null> {
  let credential: AppleAuthentication.AppleAuthenticationCredential
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    })
  } catch (err) {
    if ((err as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null
    throw err
  }
  if (!credential.identityToken) throw new Error('Apple returned no identity token')

  const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(' ')
    .trim()

  const { userId } = await exchangeAppleCredentialForPortfolio({
    identityToken: credential.identityToken,
    authorizationCode: credential.authorizationCode,
    fullName: fullName || undefined,
    targetApp: PORTFOLIO_TARGET_APP,
    storagePrefix: PORTFOLIO_STORAGE_PREFIX,
  })

  // Persist Apple sub for Guideline 5.1.1(v) revocation on account delete.
  if (credential.user) {
    try {
      await storeAppleUserId(credential.user)
    } catch (err) {
      console.warn('[yuun.account] store Apple user id failed', err)
    }
  }

  // Tie RevenueCat to the portfolio identity — required for cross-device restore.
  // Skipped entirely in no-IAP builds; a failure here never fails the sign-in.
  await aliasRevenueCatIfEnabled(userId)
  void transferBondsInBackground()
  return userId
}

export async function isGoogleSignInAvailable(): Promise<boolean> {
  const { webClientId, iosClientId } = googleClientIds()
  if (!webClientId && !iosClientId) return false
  if (!webClientId) return false
  return (await getGoogleSigninModule()) != null
}

/**
 * Google Sign In → portfolio identity → RevenueCat alias. Mirrors `signInWithApple`.
 * Returns the userId, or null if the user cancelled. Throws on a real failure.
 */
export async function signInWithGoogle(): Promise<string | null> {
  const { webClientId } = googleClientIds()
  if (!webClientId) {
    throw new Error(
      'Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID — create a Web OAuth client in Google Cloud and put it in .env.local / eas.json (required for idToken).'
    )
  }
  const mod = await getGoogleSigninModule()
  if (!mod) throw new Error('Google Sign-In requires a development build, not Expo Go.')
  try {
    if (Platform.OS === 'android') {
      await mod.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    }
    const result = await mod.GoogleSignin.signIn()
    if (result?.type === 'cancelled') return null
    // v13+ nests idToken under `.data`; older shapes keep it top-level.
    const idToken =
      result?.data?.idToken ?? (result as { idToken?: string | null } | null)?.idToken ?? null
    if (!idToken) {
      throw new Error('Google did not return an idToken (webClientId required)')
    }

    const { userId } = await exchangeGoogleCredentialForPortfolio({
      idToken,
      targetApp: PORTFOLIO_TARGET_APP,
      storagePrefix: PORTFOLIO_STORAGE_PREFIX,
    })
    await aliasRevenueCatIfEnabled(userId)
    void transferBondsInBackground()
    return userId
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code && mod.statusCodes && code === mod.statusCodes.SIGN_IN_CANCELLED) return null
    if (code === 'SIGN_IN_CANCELLED' || code === '-5' || code === '12501') return null
    throw err
  }
}

/**
 * Formerly pushed every eligible 亲友 into portfolio Bonds on sign-in.
 * No-op until a deliberate Yuun→Yuel conversion ships (see bonds-transfer.ts).
 */
async function transferBondsInBackground(): Promise<void> {
  // Intentionally disabled — silent cross-app data write.
}

/** Kept for callers; no-op while auto-transfer is disabled. */
export async function retryBondsTransfer(): Promise<void> {
  if (!(await isSignedIn())) return
  await transferBondsInBackground()
}

export interface YuunAccountProfile {
  email: string | null
  /** Apple first-auth display name — fallback when Apple never reshipped email. */
  name: string | null
  /** Which linked providers exist server-side. Both false = anonymous session. */
  apple: boolean
  google: boolean
}

/**
 * Signed GET /api/user/:userId — profile fields for the Settings account section
 * (email + linked providers). Mirrors Yuel's lib/user-api.ts; returns null when
 * not signed in or the device secret is missing.
 */
export async function fetchAccountProfile(): Promise<YuunAccountProfile | null> {
  const userId = await getPortfolioUserId()
  if (!userId) return null
  const path = `/api/user/${userId}`
  const sig = await signRequest({ method: 'GET', path, body: '', userId })
  if (!sig) return null
  const res = await fetch(`${resolvePortfolioApiUrl()}${path}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${userId}`, ...sig },
  })
  if (!res.ok) return null
  const json = (await res.json().catch(() => ({}))) as {
    data?: {
      email?: string | null
      name?: string | null
      appleUserId?: string | null
      googleUserId?: string | null
    }
  }
  const email = typeof json.data?.email === 'string' ? json.data.email : null
  const name =
    typeof json.data?.name === 'string' && json.data.name.length > 0 ? json.data.name : null
  const apple = typeof json.data?.appleUserId === 'string' && json.data.appleUserId.length > 0
  const google = typeof json.data?.googleUserId === 'string' && json.data.googleUserId.length > 0
  return { email, name, apple, google }
}

/**
 * Sign out — LOCAL session invalidation only (no server deletion; that's
 * `deleteYuunAccount`). Clears the portfolio identity + device HMAC secret,
 * the Watch credential, and the RevenueCat alias when IAP is on. Birth data
 * and 亲友 stay on-device; the user can sign back in anytime to re-sync.
 */
export async function signOut(): Promise<void> {
  try {
    await clearYuunWatchCredential()
  } catch (err) {
    console.warn('[yuun.account] clear watch credential failed on sign-out', err)
  }
  if (isIapEnabled()) {
    try {
      await Purchases.logOut()
    } catch (err) {
      console.warn('[yuun.account] RevenueCat logOut failed on sign-out', err)
    }
  }
  await invalidatePortfolioSession()
}
