/**
 * Apple / Google → portfolio identity (same contract as Yuun `lib/account.ts`).
 * IAP alias is best-effort and must never fail sign-in after the exchange.
 */

import {
  exchangeAppleCredentialForPortfolio,
  exchangeGoogleCredentialForPortfolio,
  getDeviceSecret,
  getPortfolioUserId,
  invalidatePortfolioSession,
  repairPortfolioCredentialMismatch,
  storeAppleUserId,
} from '@zhop/satellite-runtime'
import * as AppleAuthentication from 'expo-apple-authentication'
import { Platform } from 'react-native'

import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from './growth-config'
import { loginFaceIap } from './iap'

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

async function getGoogleSigninModule(): Promise<GoogleSigninModule | null> {
  try {
    const mod = (await import('@react-native-google-signin/google-signin')) as GoogleSigninModule
    if (!isGoogleSigninConfigured) {
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

/** Valid HMAC session: portfolio user id + device secret. */
export async function hasSignedInSession(): Promise<boolean> {
  await repairPortfolioCredentialMismatch()
  const userId = await getPortfolioUserId()
  const secret = await getDeviceSecret()
  return Boolean(userId && secret)
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  try {
    return await AppleAuthentication.isAvailableAsync()
  } catch {
    return false
  }
}

export async function isGoogleSignInAvailable(): Promise<boolean> {
  const { webClientId } = googleClientIds()
  if (!webClientId) return false
  return (await getGoogleSigninModule()) != null
}

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

  const { userId, deviceSecret } = await exchangeAppleCredentialForPortfolio({
    identityToken: credential.identityToken,
    authorizationCode: credential.authorizationCode,
    fullName: fullName || undefined,
    targetApp: PORTFOLIO_TARGET_APP,
    storagePrefix: PORTFOLIO_STORAGE_PREFIX,
  })
  if (!deviceSecret || deviceSecret.length < 8) {
    throw new Error('portfolio auth missing device secret')
  }

  if (credential.user) {
    try {
      await storeAppleUserId(credential.user)
    } catch (err) {
      console.warn('[xingqi.account] store Apple user id failed', err)
    }
  }

  await loginFaceIap(userId)
  return userId
}

export async function signInWithGoogle(): Promise<string | null> {
  const { webClientId } = googleClientIds()
  if (!webClientId) {
    throw new Error('Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (required for idToken).')
  }
  const mod = await getGoogleSigninModule()
  if (!mod) throw new Error('Google Sign-In requires a development build, not Expo Go.')
  try {
    if (Platform.OS === 'android') {
      await mod.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    }
    const result = await mod.GoogleSignin.signIn()
    if (result?.type === 'cancelled') return null
    const idToken =
      result?.data?.idToken ?? (result as { idToken?: string | null } | null)?.idToken ?? null
    if (!idToken) {
      throw new Error('Google did not return an idToken (webClientId required)')
    }

    const { userId, deviceSecret } = await exchangeGoogleCredentialForPortfolio({
      idToken,
      targetApp: PORTFOLIO_TARGET_APP,
      storagePrefix: PORTFOLIO_STORAGE_PREFIX,
    })
    if (!deviceSecret || deviceSecret.length < 8) {
      throw new Error('portfolio auth missing device secret')
    }
    await loginFaceIap(userId)
    return userId
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code && mod.statusCodes && code === mod.statusCodes.SIGN_IN_CANCELLED) return null
    if (code === 'SIGN_IN_CANCELLED' || code === '-5' || code === '12501') return null
    throw err
  }
}

export async function signOut(): Promise<void> {
  await invalidatePortfolioSession()
}