/**
 * Login-at-subscribe identity. Cycle is anonymous-first (ADR-0010 Tier 3) — the
 * FREE 黄历 needs no account — but the SUBSCRIBE step requires sign-in so the
 * subscription becomes a portable, cross-app identity:
 *   - it restores on every device (not tied to one install / Apple ID anon RC id),
 *   - universe_pro continuity across the suite, and
 *   - frictionless Bonds carry-over when the user later converts to Yuan (緣).
 *
 * Apple Sign In → POST /portfolio/auth/apple (creates/loads the unified user +
 * deviceSecret, persisted by satellite-runtime) → alias RevenueCat to that userId
 * so the purchase follows the person and the RC webhook maps to this identity.
 * Google is a follow-up (needs the Google sign-in dep + native config).
 */

import {
  exchangeAppleCredentialForPortfolio,
  exchangeGoogleCredentialForPortfolio,
  getPortfolioUserId,
} from '@zhop/satellite-runtime'
import * as AppleAuthentication from 'expo-apple-authentication'
import { Platform } from 'react-native'
import Purchases from 'react-native-purchases'
import { transferCyclePeopleToBonds } from './bonds-transfer'
import { PORTFOLIO_TARGET_APP } from './growth-config'
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
  })

  // Tie RevenueCat to the portfolio identity — the subscription now follows the
  // user (cross-device + into other apps), and RC webhooks map to this userId.
  try {
    await Purchases.logIn(userId)
  } catch {}
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
    })
    try {
      await Purchases.logIn(userId)
    } catch {}
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
 * portfolio Bonds graph so Yuan picks them up with zero friction. Runs after
 * each successful sign-in; idempotent, failures retried on the next call.
 */
async function transferBondsInBackground(): Promise<void> {
  try {
    const people = await getPeople()
    if (people.length === 0) return
    await transferCyclePeopleToBonds(people, 'zh-CN')
  } catch {}
}

/** Re-runs the transfer (e.g. after the user edits 亲友 to fill in missing data). */
export async function retryBondsTransfer(): Promise<void> {
  if (!(await isSignedIn())) return
  await transferBondsInBackground()
}
