/**
 * Fēng authentication — Apple / Google / guest, aligned with hexastral-app.
 *
 * Persists userId + deviceSecret (HMAC) in SecureStore. Sign-out clears session
 * and returns to the sign-in surface (no silent re-provision).
 */

import * as AppleAuthentication from 'expo-apple-authentication'
import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Platform } from 'react-native'
import { config } from './config'
import { clearDeviceSecret, storeDeviceSecret } from './hmac'
import { clearFengSessionCaches } from './session-reset'
import {
  clearFengUserSession,
  getStoredFengUserId,
  setAuthToken,
  setStoredFengUserId,
} from './user-session'

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin')

let isGoogleSigninConfigured = false

export interface FengUser {
  id: string
  email: string | null
  name: string | null
  birthSolarDate: string | null
  birthTimeIndex: number | null
  birthGender: '男' | '女' | null
  birthCity: string | null
}

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/** Apple may return `""` on repeat sign-in; API rejects non-email strings. */
function normalizeOptionalEmail(email?: string | null): string | undefined {
  const trimmed = email?.trim()
  return trimmed && trimmed.includes('@') ? trimmed : undefined
}

function makeLocalUser(userId: string, name?: string): FengUser {
  return {
    id: userId,
    email: null,
    name: name ?? null,
    birthSolarDate: null,
    birthTimeIndex: null,
    birthGender: null,
    birthCity: null,
  }
}

async function getGoogleSigninModule(): Promise<GoogleSigninModule | null> {
  try {
    const module = await import('@react-native-google-signin/google-signin')
    if (!isGoogleSigninConfigured) {
      module.GoogleSignin.configure({
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        webClientId:
          Platform.OS === 'android'
            ? process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
            : process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      })
      isGoogleSigninConfigured = true
    }
    return module
  } catch {
    return null
  }
}

async function registerUser(
  userId: string,
  email?: string,
  name?: string,
  appleUserId?: string
): Promise<FengUser> {
  const res = await fetch(`${config.apiUrl}/api/user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-client-platform': Platform.OS },
    body: JSON.stringify({
      id: userId,
      email: normalizeOptionalEmail(email),
      name: name?.trim() || undefined,
      appleUserId,
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(
      `user_registration_failed:${res.status}${detail ? `:${detail.slice(0, 200)}` : ''}`
    )
  }
  const json = (await res.json()) as { data: Record<string, unknown> }
  const apiUser = json.data
  if (typeof apiUser.deviceSecret === 'string') {
    await storeDeviceSecret(apiUser.deviceSecret)
  }
  return {
    id: userId,
    email: typeof apiUser.email === 'string' ? apiUser.email : null,
    name: typeof apiUser.name === 'string' ? apiUser.name : null,
    birthSolarDate: typeof apiUser.birthSolarDate === 'string' ? apiUser.birthSolarDate : null,
    birthTimeIndex: typeof apiUser.birthTimeIndex === 'number' ? apiUser.birthTimeIndex : null,
    birthGender:
      apiUser.birthGender === '男' || apiUser.birthGender === '女' ? apiUser.birthGender : null,
    birthCity: typeof apiUser.birthCity === 'string' ? apiUser.birthCity : null,
  }
}

async function fetchUser(userId: string): Promise<FengUser> {
  const res = await fetch(`${config.apiUrl}/api/user/${userId}`)
  if (!res.ok) throw new Error('user_fetch_failed')
  const json = (await res.json()) as { data: Record<string, unknown> }
  const row = json.data
  return {
    id: userId,
    email: typeof row.email === 'string' ? row.email : null,
    name: typeof row.name === 'string' ? row.name : null,
    birthSolarDate: typeof row.birthSolarDate === 'string' ? row.birthSolarDate : null,
    birthTimeIndex: typeof row.birthTimeIndex === 'number' ? row.birthTimeIndex : null,
    birthGender: row.birthGender === '男' || row.birthGender === '女' ? row.birthGender : null,
    birthCity: typeof row.birthCity === 'string' ? row.birthCity : null,
  }
}

export interface AuthState {
  user: FengUser | null
  userId: string | null
  isLoading: boolean
  isAuthenticated: boolean
  signInWithApple: () => Promise<boolean>
  signInWithGoogle: () => Promise<boolean>
  signInAsGuest: () => Promise<boolean>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  /** Re-sync deviceSecret from POST /api/user (e.g. after 403 Authentication failed). */
  resyncCredentials: () => Promise<void>
  /** Bumps after deviceSecret is refreshed so API clients re-bind and hooks refetch. */
  credentialVersion: number
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FengUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [credentialVersion, setCredentialVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const storedUserId = await getStoredFengUserId()
        if (!storedUserId) return

        // Always re-register on boot. POST /api/user is idempotent and returns
        // the server's canonical deviceSecret, so a device whose secret is
        // missing OR stale (e.g. the D1 row was reset/re-migrated in dev, or the
        // app was reinstalled) self-heals — otherwise every signed request 403s
        // ("Authentication failed") because the device secret no longer matches.
        try {
          const apiUser = await registerUser(storedUserId)
          if (!cancelled) setUser(apiUser)
        } catch {
          // Offline / registration unavailable — drop stale secret so we do not
          // sign with a userId/secret pair the server no longer recognizes.
          await clearDeviceSecret()
          if (!cancelled) setUser(makeLocalUser(storedUserId))
        }
      } catch (err) {
        if (__DEV__) console.error('[Fēng auth] restore failed', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const resyncCredentials = useCallback(async () => {
    const id = user?.id ?? (await getStoredFengUserId())
    if (!id) return
    const apiUser = await registerUser(id)
    setUser(apiUser)
    setCredentialVersion((v) => v + 1)
  }, [user?.id])

  const signInWithApple = useCallback(async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })
      const userId = `apple_${credential.user}`
      const name =
        credential.fullName?.givenName && credential.fullName?.familyName
          ? `${credential.fullName.givenName} ${credential.fullName.familyName}`
          : undefined
      const newUser = await registerUser(
        userId,
        normalizeOptionalEmail(credential.email),
        name,
        credential.user
      )
      await setStoredFengUserId(userId)
      if (credential.identityToken) await setAuthToken(credential.identityToken)
      setUser(newUser)
      return true
    } catch (error: unknown) {
      const code = (error as { code?: string }).code
      if (code === 'ERR_REQUEST_CANCELED') return false
      throw error
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    try {
      const googleSigninModule = await getGoogleSigninModule()
      if (!googleSigninModule) {
        throw new Error('google_signin_requires_dev_client')
      }
      await googleSigninModule.GoogleSignin.hasPlayServices()
      const { data } = await googleSigninModule.GoogleSignin.signIn()
      if (!data) return false
      const userId = `google_${data.user.id}`
      const newUser = await registerUser(
        userId,
        data.user.email ?? undefined,
        data.user.name ?? undefined
      )
      await setStoredFengUserId(userId)
      setUser(newUser)
      return true
    } catch (error: unknown) {
      const googleSigninModule = await getGoogleSigninModule()
      const code = (error as { code?: string }).code
      if (googleSigninModule && code === googleSigninModule.statusCodes.SIGN_IN_CANCELLED) {
        return false
      }
      throw error
    }
  }, [])

  const signInAsGuest = useCallback(async () => {
    const guestId = `guest_${uuidv4()}`
    await clearDeviceSecret()
    const newUser = await registerUser(guestId, undefined, 'Guest')
    await setStoredFengUserId(guestId)
    setUser(newUser)
    return true
  }, [])

  const signOut = useCallback(async () => {
    try {
      const googleSigninModule = await getGoogleSigninModule()
      if (googleSigninModule) {
        await googleSigninModule.GoogleSignin.signOut()
      }
    } catch (err) {
      if (__DEV__) console.warn('[Fēng auth] Google sign-out failed', err)
    }
    await clearFengUserSession()
    await clearFengSessionCaches()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const id = user?.id ?? (await getStoredFengUserId())
    if (!id) return
    try {
      setUser(await fetchUser(id))
    } catch (err) {
      if (__DEV__) console.warn('[Fēng auth] refreshUser failed', err)
    }
  }, [user?.id])

  const value = useMemo<AuthState>(
    () => ({
      user,
      userId: user?.id ?? null,
      isLoading,
      isAuthenticated: !!user,
      signInWithApple,
      signInWithGoogle,
      signInAsGuest,
      signOut,
      refreshUser,
      resyncCredentials,
      credentialVersion,
    }),
    [user, isLoading, credentialVersion, signInWithApple, signInWithGoogle, signInAsGuest, signOut, refreshUser, resyncCredentials]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
