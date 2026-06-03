/**
 * Hexastral 统一认证模块
 *
 * 合并周易 + 星宫 + 风水的认证逻辑：
 * - 存储完整 User 对象（来自周易 API）
 * - 登录时同时在三 API 注册同一 userId
 * - Apple Sign-In + 匿名访客
 */

import type { User } from '@zhop/hexastral-client'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as SecureStore from 'expo-secure-store'
import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Platform } from 'react-native'
import { apiClient } from './api'
import { loginRevenueCat, logoutRevenueCat } from './domain/subscription'
import { getDeviceSecret, storeDeviceSecret } from './hmac'
import { clearAppSessionCaches } from './session-reset'

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin')

let isGoogleSigninConfigured = false

export function getIsPro(user: { subscriptionStatus?: string | null } | null | undefined): boolean {
  return (
    user?.subscriptionStatus === 'pro' ||
    user?.subscriptionStatus === 'premium' ||
    user?.subscriptionStatus === 'active'
  )
}

async function getGoogleSigninModule(): Promise<GoogleSigninModule | null> {
  try {
    const module = await import('@react-native-google-signin/google-signin')
    if (!isGoogleSigninConfigured) {
      module.GoogleSignin.configure({
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        webClientId:
          Platform.OS === 'android' ? process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID : undefined,
      })
      isGoogleSigninConfigured = true
    }
    return module
  } catch {
    return null
  }
}

/** Hermes 不支持 crypto.randomUUID()，用 Math.random 代替 */
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/** 创建本地 guest 用户对象，无需网络 */
function makeLocalUser(userId: string, name?: string): User {
  const now = new Date().toISOString()
  return {
    id: userId,
    email: null,
    name: name ?? null,
    appleUserId: null,
    birthSolarDate: null,
    birthTimeIndex: null,
    birthGender: null,
    birthCity: null,
    birthLongitude: null,
    subscriptionStatus: 'free',
    totalReadings: 0,
    totalDivinations: 0,
    totalAnalyses: 0,
    credits: 0,
    createdAt: now,
    updatedAt: now,
  }
}

interface AuthContextType {
  /** 完整用户对象（来自周易 API） */
  user: User | null
  /** 用户 ID 快捷访问 */
  userId: string | null
  isLoading: boolean
  isAuthenticated: boolean
  signInWithApple: () => Promise<boolean>
  signInWithGoogle: () => Promise<boolean>
  signInAsGuest: () => Promise<boolean>
  signOut: () => Promise<void>
  /** 删除账号 — 吊销 Apple 凭据 + 删除三 API 数据 + 清除本地存储 */
  deleteAccount: () => Promise<void>
  /** 邮箱验证成功后同步更新内存中的 user.email */
  updateEmail: (email: string) => void
  /** Re-fetch `GET /api/user/:id` and merge into context (e.g. after dev subscription toggle). */
  refreshUserFromServer: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userId: null,
  isLoading: true,
  isAuthenticated: false,
  signInWithApple: async () => false,
  signInWithGoogle: async () => false,
  signInAsGuest: async () => false,
  signOut: async () => {},
  deleteAccount: async () => {},
  updateEmail: () => {},
  refreshUserFromServer: async () => {},
})

/**
 * 在三 API 同时注册用户
 * 优先获取周易 API 的完整 User 对象
 */
async function registerAllApis(
  userId: string,
  email?: string,
  name?: string,
  appleId?: string,
  _googleId?: string
): Promise<User> {
  // 统一 hexastral-api 注册（单次注册取代原来的三 API 并行）
  const resp = await apiClient.api.user.$post({
    json: { id: userId, email, name, appleUserId: appleId },
  })
  if (!resp.ok) throw new Error(await resp.text())
  const json = await resp.json()
  const apiUser = json.data as Record<string, unknown>

  // 存储 HMAC 签名密钥 (Per-device HMAC signing)
  if (typeof apiUser.deviceSecret === 'string') {
    await storeDeviceSecret(apiUser.deviceSecret)
  }

  return apiUser as unknown as User
}

/**
 * Idempotent post-signin auto-heal: if the user already has birth info on
 * file but is missing chart-derived fields (returning user, stale state from
 * an interrupted onboarding), fire the bootstrap pipeline. Server-side is
 * idempotent and LLM cost only triggers when no signal exists for today.
 *
 * Fire-and-forget — failures are logged in dev but never block sign-in.
 */
function autoHealAfterSignin(user: User): void {
  const birthSolarDate = (user as unknown as { birthSolarDate?: string | null }).birthSolarDate
  const dayMasterStem = (user as unknown as { dayMasterStem?: string | null }).dayMasterStem
  const ziwei = (user as unknown as { ziweiMingPalaceStar?: string | null }).ziweiMingPalaceStar
  if (!birthSolarDate) return // never onboarded — onboarding flow handles bootstrap
  if (dayMasterStem && ziwei) return // chart state intact — nothing to heal
  apiClient.api.onboarding.bootstrap
    .$post({ json: { explanationMode: 'plain' } })
    .then(async (resp) => {
      if (!resp.ok && __DEV__) {
        console.warn('[auth] post-signin bootstrap failed', resp.status, await resp.text())
      }
    })
    .catch((err) => {
      if (__DEV__) console.warn('[auth] post-signin bootstrap threw', err)
    })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 恢复会话
  useEffect(() => {
    async function restore() {
      try {
        const storedUserId = await SecureStore.getItemAsync('user_id')
        if (storedUserId) {
          // Ensure deviceSecret exists — if missing, re-register to get one
          const existingSecret = await getDeviceSecret()
          if (!existingSecret) {
            try {
              // POST /api/user is NOT HMAC-gated — always returns deviceSecret
              const apiUser = await registerAllApis(storedUserId)
              setUser(apiUser)
            } catch {
              setUser(makeLocalUser(storedUserId))
            }
          } else {
            try {
              const resp = await apiClient.api.user[':userId'].$get({
                param: { userId: storedUserId },
              })
              if (!resp.ok) throw new Error('fetch_failed')
              const json = await resp.json()
              const restored = json.data as unknown as User
              setUser(restored)
              autoHealAfterSignin(restored)
            } catch {
              // API 无法到达（离线 / 开发环境）— 本地用户对象不阻塞登录
              setUser(makeLocalUser(storedUserId))
            }
          }
        }
      } catch {
        // SecureStore 读取失败，静默处理
      } finally {
        setIsLoading(false)
      }
    }
    restore()
  }, [])

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

      const newUser = await registerAllApis(
        userId,
        credential.email ?? undefined,
        name,
        credential.user
      )

      await SecureStore.setItemAsync('user_id', userId)
      await SecureStore.setItemAsync('auth_token', credential.identityToken ?? '')
      // 绑定 RevenueCat 用户身份，设置 appAccountToken
      // 若之前以访客身份购买，RevenueCat 会自动 alias merge
      await loginRevenueCat(userId)
      setUser(newUser)
      autoHealAfterSignin(newUser)
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
        throw new Error('Google Sign-In requires a development build, not Expo Go.')
      }

      await googleSigninModule.GoogleSignin.hasPlayServices()
      const { data } = await googleSigninModule.GoogleSignin.signIn()
      if (!data) return false

      const userId = `google_${data.user.id}`
      const newUser = await registerAllApis(
        userId,
        data.user.email ?? undefined,
        data.user.name ?? undefined,
        undefined,
        data.user.id
      )

      await SecureStore.setItemAsync('user_id', userId)
      await loginRevenueCat(userId)
      setUser(newUser)
      autoHealAfterSignin(newUser)
      return true
    } catch (error: unknown) {
      const code = (error as { code?: string }).code
      const googleSigninModule = await getGoogleSigninModule()
      if (googleSigninModule && code === googleSigninModule.statusCodes.SIGN_IN_CANCELLED)
        return false
      throw error
    }
  }, [])

  const signInAsGuest = useCallback(async () => {
    const guestId = `guest_${uuidv4()}`
    // 访客登录不依赖网络—本地创建用户对象
    // 首次占卜时 API 会惰性创建用户记录
    const localUser = makeLocalUser(guestId, 'Guest')
    await SecureStore.setItemAsync('user_id', guestId)
    // 访客也绑定 RevenueCat 身份，消费包购买记录不丢失
    loginRevenueCat(guestId).catch((err) => {
      if (__DEV__) console.error('[Auth] Guest RevenueCat login failed:', err)
    })
    setUser(localUser)

    // 后台尝试 API 注册，失败不影响登录
    registerAllApis(guestId, undefined, localUser.name ?? undefined)
      .then((apiUser) => {
        setUser(apiUser)
      })
      .catch((err) => {
        if (__DEV__) console.error('[Auth] Guest API registration failed:', err)
      })
    return true
  }, [])

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync('user_id')
    await SecureStore.deleteItemAsync('auth_token')
    await clearAppSessionCaches()
    await logoutRevenueCat()
    setUser(null)
  }, [])

  const deleteAccount = useCallback(async () => {
    const currentUserId = user?.id
    if (!currentUserId) return

    // 1. 吊销第三方凭据 — 必须在删除用户数据之前，HMAC 验证需要 deviceSecret 仍存在
    if (currentUserId.startsWith('apple_')) {
      try {
        const appleId = currentUserId.replace('apple_', '')
        const freshCredential = await AppleAuthentication.refreshAsync({ user: appleId })
        if (freshCredential.authorizationCode) {
          await apiClient.api.user['revoke-apple']
            .$post({
              json: { authorizationCode: freshCredential.authorizationCode },
            })
            .catch(() => {
              // 吊销失败不阻塞删除流程
            })
        }
      } catch {
        // refreshAsync 失败不阻塞删除流程
      }
    }

    if (currentUserId.startsWith('google_')) {
      try {
        const googleSigninModule = await getGoogleSigninModule()
        if (googleSigninModule) {
          await googleSigninModule.GoogleSignin.revokeAccess()
          await googleSigninModule.GoogleSignin.signOut()
        }
      } catch {
        // 吊销失败不阻塞删除流程
      }
    }

    // 2. 删除服务端用户数据（凭据吊销完成后执行）
    await apiClient.api.user[':userId'].$delete({ param: { userId: currentUserId } }).catch(() => {
      // 删除失败不阻塞登出流程
    })

    // 3. 清除本地存储
    await SecureStore.deleteItemAsync('user_id')
    await SecureStore.deleteItemAsync('auth_token')
    await clearAppSessionCaches()
    setUser(null)
  }, [user])

  const updateEmail = useCallback((email: string) => {
    setUser((prev) => (prev ? { ...prev, email } : prev))
  }, [])

  const refreshUserFromServer = useCallback(async () => {
    const id = user?.id ?? (await SecureStore.getItemAsync('user_id'))
    if (!id) return
    try {
      const resp = await apiClient.api.user[':userId'].$get({ param: { userId: id } })
      if (!resp.ok) return
      const json = await resp.json()
      setUser(json.data as unknown as User)
    } catch (err) {
      if (__DEV__) console.warn('[auth] refreshUserFromServer failed', err)
    }
  }, [user?.id])

  const value = useMemo(
    () => ({
      user,
      userId: user?.id ?? null,
      isLoading,
      isAuthenticated: !!user,
      signInWithApple,
      signInWithGoogle,
      signInAsGuest,
      signOut,
      deleteAccount,
      updateEmail,
      refreshUserFromServer,
    }),
    [
      user,
      isLoading,
      signInWithApple,
      signInWithGoogle,
      signInAsGuest,
      signOut,
      deleteAccount,
      updateEmail,
      refreshUserFromServer,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
