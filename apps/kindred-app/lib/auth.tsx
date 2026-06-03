/**
 * Kindred auth state — minimal AsyncStorage-backed userId provisioning.
 *
 * On first launch, the app POSTs to /api/user (public registration — no HMAC)
 * to create a users row and receive deviceSecret. Both are persisted (userId in
 * AsyncStorage, deviceSecret in SecureStore via lib/hmac).
 *
 * Chart/signal bootstrap happens later via POST /api/onboarding/bootstrap once
 * birth info is on file (HMAC-gated, same as hexastral-app).
 *
 * Apple Sign In links this anonymous identity to an Apple account via
 * POST /api/onboarding/apple-link. Two paths:
 *   - linked      : append appleUserId to the existing user row, no swap
 *   - recovered   : the appleUserId was already mapped to another user (from
 *                   a previous install). Replace local userId + deviceSecret
 *                   so the app picks up the original bond list.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { config } from './config'
import { clearDeviceSecret, getDeviceSecret, signRequest, storeDeviceSecret } from './hmac'
import { fetchUserProfile } from './user-api'

const USER_ID_KEY = 'yuan_user_id'

interface RegisterUserResponse {
  data: {
    id: string
    deviceSecret?: string
  }
}

/** Hermes lacks crypto.randomUUID — use Math.random instead */
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/** POST /api/user — exempt from HMAC; syncs or creates the users row + deviceSecret. */
async function registerUser(
  userId: string
): Promise<{ userId: string; deviceSecret: string | null }> {
  const res = await fetch(`${config.apiUrl}/api/user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-platform': 'ios',
    },
    body: JSON.stringify({ id: userId }),
  })
  if (!res.ok) throw new Error(`user registration failed: ${res.status}`)
  const json = (await res.json()) as RegisterUserResponse
  return { userId: json.data.id, deviceSecret: json.data.deviceSecret ?? null }
}

/**
 * Ensure userId + deviceSecret match the server (handles D1 reset / stale SecureStore).
 * Always POSTs /api/user so a wiped DB re-issues deviceSecret for the same local id.
 */
async function provisionSession(): Promise<string> {
  const existing = await AsyncStorage.getItem(USER_ID_KEY)
  if (existing) {
    const { deviceSecret } = await registerUser(existing)
    if (deviceSecret) {
      await storeDeviceSecret(deviceSecret)
    } else {
      const local = await getDeviceSecret()
      if (!local) throw new Error('user registration failed: no deviceSecret')
    }
    return existing
  }

  const newId = `yuan_${uuidv4()}`
  const { deviceSecret } = await registerUser(newId)
  if (!deviceSecret) throw new Error('user registration failed: no deviceSecret')
  await storeDeviceSecret(deviceSecret)
  await AsyncStorage.setItem(USER_ID_KEY, newId)
  return newId
}

export type AppleLinkOutcome = 'linked' | 'recovered' | 'already_linked'

export interface AppleLinkInput {
  identityToken: string
  fullName?: string
}

export interface AppleLinkResult {
  outcome: AppleLinkOutcome
  /** The userId in effect after the call — may differ from before on `recovered`. */
  userId: string
}

export interface GoogleLinkInput {
  identityToken: string
}

export interface GoogleLinkResult {
  outcome: AppleLinkOutcome
  /** The userId in effect after the call — may differ from before on `recovered`. */
  userId: string
}

interface ApiSuccess<T> {
  ok: true
  data: T
}
interface ApiError {
  ok: false
  error: { code: string; message: string; details?: Record<string, unknown> }
}

export interface AuthState {
  userId: string | null
  userEmail: string | null
  isLoading: boolean
  signOut: () => Promise<void>
  /** Re-sync deviceSecret from POST /api/user (e.g. after 403 Authentication failed). */
  resyncCredentials: () => Promise<void>
  /** Refresh email/name from GET /api/user/:id */
  refreshProfile: () => Promise<void>
  /** After OTP email verify */
  setUserEmail: (email: string) => void
  /** Link the current user to an Apple ID, or recover an existing one. */
  linkApple: (input: AppleLinkInput) => Promise<AppleLinkResult>
  /** Link the current user to a Google account, or recover an existing one. */
  linkGoogle: (input: GoogleLinkInput) => Promise<GoogleLinkResult>
}

const AuthContext = createContext<AuthState | null>(null)

export interface AuthProviderProps {
  locale: string
  children: ReactNode
}

export function AuthProvider({ locale, children }: AuthProviderProps) {
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const refreshProfile = useCallback(async () => {
    const id = userId ?? (await AsyncStorage.getItem(USER_ID_KEY))
    if (!id) return
    try {
      const profile = await fetchUserProfile(id)
      setUserEmail(profile.email)
    } catch (err) {
      if (__DEV__) console.warn('[Kindred auth] refreshProfile failed', err)
    }
  }, [userId])

  const resyncCredentials = useCallback(async () => {
    const id = await AsyncStorage.getItem(USER_ID_KEY)
    if (!id) return
    const { deviceSecret } = await registerUser(id)
    if (deviceSecret) await storeDeviceSecret(deviceSecret)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const id = await provisionSession()
        if (!cancelled) {
          setUserId(id)
          try {
            const profile = await fetchUserProfile(id)
            if (!cancelled) setUserEmail(profile.email)
          } catch {
            // non-fatal — Settings can refresh later
          }
          if (!cancelled) setIsLoading(false)
        }
      } catch (err) {
        if (__DEV__) console.error('[Kindred auth] user provisioning failed', err)
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [locale])

  /**
   * Shared link logic for both providers — they POST identical-shape bodies
   * and the server returns the same 3 outcomes. Only the path + the input
   * payload differ, so we keep one function and split the public API into
   * `linkApple` + `linkGoogle` thin wrappers for clarity at the call site.
   */
  const linkProvider = useCallback(
    async (
      path: string,
      payload: AppleLinkInput | GoogleLinkInput
    ): Promise<{ outcome: AppleLinkOutcome; userId: string }> => {
      if (!userId) throw new Error('Cannot link a provider before user is provisioned')

      const body = JSON.stringify(payload)
      const sig = await signRequest({ method: 'POST', path, body, userId })
      if (!sig) throw new Error('Missing device secret')

      const res = await fetch(`${config.apiUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...sig },
        body,
      })
      const json = (await res.json()) as
        | ApiSuccess<{
            outcome: AppleLinkOutcome
            userId: string
            deviceSecret?: string
          }>
        | ApiError

      if (!json.ok) {
        const err = new Error(json.error.message) as Error & { code?: string }
        err.code = json.error.code
        throw err
      }

      const { outcome, userId: nextUserId, deviceSecret: nextSecret } = json.data

      if (outcome === 'recovered') {
        if (!nextSecret) throw new Error('Server returned recovered without deviceSecret')
        await storeDeviceSecret(nextSecret)
        await AsyncStorage.setItem(USER_ID_KEY, nextUserId)
        setUserId(nextUserId)
      }
      void refreshProfile()
      return { outcome, userId: nextUserId }
    },
    [userId, refreshProfile]
  )

  const linkApple = useCallback(
    (input: AppleLinkInput): Promise<AppleLinkResult> =>
      linkProvider('/api/onboarding/apple-link', input),
    [linkProvider]
  )

  const linkGoogle = useCallback(
    (input: GoogleLinkInput): Promise<GoogleLinkResult> =>
      linkProvider('/api/onboarding/google-link', input),
    [linkProvider]
  )

  const value = useMemo<AuthState>(
    () => ({
      userId,
      userEmail,
      isLoading,
      signOut: async () => {
        await AsyncStorage.removeItem(USER_ID_KEY)
        await clearDeviceSecret()
        setUserEmail(null)
        try {
          const id = await provisionSession()
          setUserId(id)
          try {
            const profile = await fetchUserProfile(id)
            setUserEmail(profile.email)
          } catch {
            // ignore
          }
        } catch (err) {
          if (__DEV__) console.error('[Kindred auth] re-provision after sign-out failed', err)
          setUserId(null)
        }
      },
      resyncCredentials,
      refreshProfile,
      setUserEmail,
      linkApple,
      linkGoogle,
    }),
    [userId, userEmail, isLoading, resyncCredentials, refreshProfile, linkApple, linkGoogle]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
