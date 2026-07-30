/**
 * Login-at-subscribe identity. Yuun is anonymous-first for the free 黄历, but
 * subscribing requires sign-in so the subscription is a portable cross-app identity:
 *   - restores on every device (not tied to one install / Apple ID anon RC id),
 *   - universe_pro continuity across the suite (Phase 2), and
 *   - frictionless Bonds carry-over when the user later opens Yuel.
 *
 * Apple / Google → POST /portfolio/auth/{apple,google} → alias RevenueCat to that
 * userId so purchases and webhooks map to the portfolio identity.
 */

import {
  exchangeAppleCredentialForPortfolio,
  exchangeGoogleCredentialForPortfolio,
  getPortfolioUserId,
} from '@zhop/satellite-runtime'
import * as AppleAuthentication from 'expo-apple-authentication'
import { Platform } from 'react-native'
import Purchases from 'react-native-purchases'
import { transferAuspicePeopleToBonds } from './bonds-transfer'
import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from './growth-config'
import { resolveLocale } from './i18n'
import { getPeople } from './people'

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
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME],
    })
  } catch (err) {
    if ((err as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null
    throw err
  }
  if (!credential.identityToken) throw new Error('Apple returned no identity token')

  const { userId } = await exchangeAppleCredentialForPortfolio({
    identityToken: credential.identityToken,
    authorizationCode: credential.authorizationCode,
    targetApp: PORTFOLIO_TARGET_APP,
    storagePrefix: PORTFOLIO_STORAGE_PREFIX,
  })

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
 * The PAYOFF of sign-in — push every eligible 亲友 (lib/people.ts) into the
 * portfolio Bonds graph so Kindred picks them up with zero friction. Runs after
 * each successful sign-in; idempotent, failures retried on the next call.
 */
async function transferBondsInBackground(): Promise<void> {
  try {
    const people = await getPeople()
    if (people.length === 0) return
    const locale = resolveLocale()
    const language =
      locale === 'zh-Hans' || locale === 'zh-Hant' || locale === 'ja' || locale === 'en'
        ? locale === 'zh-Hans'
          ? 'zh-CN'
          : locale === 'zh-Hant'
            ? 'zh-TW'
            : locale
        : 'en'
    await transferAuspicePeopleToBonds(people, language)
  } catch (err) {
    console.warn('[auspice.account] bonds transfer failed', err)
  }
}

/** Re-runs the transfer (e.g. after the user edits 亲友 to fill in missing data). */
export async function retryBondsTransfer(): Promise<void> {
  if (!(await isSignedIn())) return
  await transferBondsInBackground()
}
