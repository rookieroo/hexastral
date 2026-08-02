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
  storeAppleUserId,
} from '@zhop/satellite-runtime'
import * as AppleAuthentication from 'expo-apple-authentication'
import { Platform } from 'react-native'
import Purchases from 'react-native-purchases'
import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from './growth-config'

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin')
let isGoogleSigninConfigured = false

/** Dynamic import — the native module is only present in dev/prod builds, not Expo Go. */
async function getGoogleSigninModule(): Promise<GoogleSigninModule | null> {
  try {
    const mod = (await import('@react-native-google-signin/google-signin')) as GoogleSigninModule
    if (!isGoogleSigninConfigured) {
      mod.GoogleSignin.configure({
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        webClientId:
          Platform.OS === 'android' ? process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID : undefined,
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
  try {
    await Purchases.logIn(userId)
  } catch (err) {
    console.warn('[yuun.account] RevenueCat logIn failed after Apple sign-in', err)
    throw new Error('RevenueCat alias failed after Apple sign-in')
  }
  void transferBondsInBackground()
  return userId
}

export async function isGoogleSignInAvailable(): Promise<boolean> {
  return (await getGoogleSigninModule()) != null
}

/**
 * Google Sign In → portfolio identity → RevenueCat alias. Mirrors `signInWithApple`.
 * Returns the userId, or null if the user cancelled. Throws on a real failure.
 */
export async function signInWithGoogle(): Promise<string | null> {
  const mod = await getGoogleSigninModule()
  if (!mod) throw new Error('Google Sign-In requires a development build, not Expo Go.')
  try {
    await mod.GoogleSignin.hasPlayServices()
    const result = await mod.GoogleSignin.signIn()
    const idToken = result?.data?.idToken
    if (!idToken) return null

    const { userId } = await exchangeGoogleCredentialForPortfolio({
      idToken,
      targetApp: PORTFOLIO_TARGET_APP,
      storagePrefix: PORTFOLIO_STORAGE_PREFIX,
    })
    try {
      await Purchases.logIn(userId)
    } catch (err) {
      console.warn('[yuun.account] RevenueCat logIn failed after Google sign-in', err)
      throw new Error('RevenueCat alias failed after Google sign-in')
    }
    void transferBondsInBackground()
    return userId
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code && mod.statusCodes && code === mod.statusCodes.SIGN_IN_CANCELLED) return null
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
