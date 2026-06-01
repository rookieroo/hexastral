/**
 * Yuán auth state — minimal AsyncStorage-backed userId provisioning.
 *
 * On first launch, the app POSTs to /api/onboarding/bootstrap to get a fresh
 * userId + deviceSecret. Both are persisted (userId in AsyncStorage, deviceSecret
 * in SecureStore via lib/hmac). Subsequent app launches read userId from storage.
 *
 * Apple Sign In links this anonymous identity to an Apple account; the userId
 * is preserved across that link.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { config } from './config'
import { storeDeviceSecret } from './hmac'

const USER_ID_KEY = 'yuan_user_id'

interface BootstrapResponse {
  data: {
    userId: string
    deviceSecret: string
  }
}

async function bootstrap(locale: string): Promise<{ userId: string; deviceSecret: string }> {
  const res = await fetch(`${config.apiUrl}/api/onboarding/bootstrap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-platform': 'ios',
    },
    body: JSON.stringify({ locale, source: 'yuan' }),
  })
  if (!res.ok) throw new Error(`bootstrap failed: ${res.status}`)
  const json = (await res.json()) as BootstrapResponse
  return json.data
}

export interface AuthState {
  userId: string | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export interface AuthProviderProps {
  locale: string
  children: ReactNode
}

export function AuthProvider({ locale, children }: AuthProviderProps) {
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const existing = await AsyncStorage.getItem(USER_ID_KEY)
        if (existing) {
          if (!cancelled) {
            setUserId(existing)
            setIsLoading(false)
          }
          return
        }
        const { userId: newId, deviceSecret } = await bootstrap(locale)
        await storeDeviceSecret(deviceSecret)
        await AsyncStorage.setItem(USER_ID_KEY, newId)
        if (!cancelled) {
          setUserId(newId)
          setIsLoading(false)
        }
      } catch (err) {
        if (__DEV__) console.error('[Yuán auth] bootstrap failed', err)
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [locale])

  const value = useMemo<AuthState>(
    () => ({
      userId,
      isLoading,
      signOut: async () => {
        await AsyncStorage.removeItem(USER_ID_KEY)
        setUserId(null)
      },
    }),
    [userId, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
