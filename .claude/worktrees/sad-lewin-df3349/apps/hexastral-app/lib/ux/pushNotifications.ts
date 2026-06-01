/**
 * lib/pushNotifications.ts — Expo Push Notification 客户端
 *
 * 功能：
 * 1. 请求推送权限（iOS 需主动询问）
 * 2. 获取 Expo Push Token（唯一设备标识）
 * 3. 向 svc-notify 注册 token（绑定 userId）
 * 4. 注销 token（登出时调用）
 *
 * 调用时机：
 * - DDL 还原命盘成功后，展示"每日运势"全屏引导弹窗，用户同意后调用 registerPushToken()
 * - 登出时调用 unregisterPushToken()
 */

import * as Notifications from 'expo-notifications'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { config } from '@/lib/config'
import { signRequest } from '@/lib/hmac'

const NOTIFY_API = `${config.apiUrl}/api/notify`

/** Build HMAC-signed headers for a notify request */
async function buildSignedHeaders(body: string, method: string, path: string): Promise<Headers> {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const userId = (await SecureStore.getItemAsync('user_id')) ?? ''
  const sigs = await signRequest({ body, userId, method, path })
  if (sigs) {
    for (const [k, v] of Object.entries(sigs)) headers.set(k, v)
  }
  if (userId) headers.set('Authorization', `Bearer ${userId}`)
  return headers
}

export type PushPermissionStatus = 'granted' | 'denied' | 'undetermined'

// ── Permission ────────────────────────────────────────────────────

/**
 * 请求推送通知权限
 * iOS：弹出系统权限对话框
 * Android：Android 13+ 需要运行时权限，低版本自动授权
 */
export async function requestPushPermission(): Promise<PushPermissionStatus> {
  if (Platform.OS === 'web') return 'denied'

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  if (existingStatus === 'granted') return 'granted'

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  })

  return status as PushPermissionStatus
}

/**
 * 获取当前推送权限状态（不弹窗）
 */
export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync()
  return status as PushPermissionStatus
}

// ── Token ─────────────────────────────────────────────────────────

/**
 * 获取 Expo Push Token
 * 前提：推送权限已授权
 * 返回 null 表示设备不支持或权限未授权
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    })
    return token.data
  } catch {
    return null
  }
}

// ── Registration ──────────────────────────────────────────────────

/**
 * 注册推送 Token 到 svc-notify
 * 在 DDL aha moment 全屏弹窗用户同意后调用
 *
 * @param userId  — 当前登录用户 ID（访客也可以用 anonymousId）
 * @param locale  — 用户语言，用于发送本地化的每日运势文本
 * @param timezone — IANA 时区（如 'Asia/Shanghai'），可选
 */
export async function registerPushToken(
  userId: string,
  _locale: string,
  timezone?: string
): Promise<boolean> {
  const status = await requestPushPermission()
  if (status !== 'granted') return false

  const token = await getExpoPushToken()
  if (!token) return false

  try {
    const timezoneId = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
    const body = JSON.stringify({ userId, token, platform: Platform.OS, timezoneId })
    const path = '/api/notify/register-device'
    const headers = await buildSignedHeaders(body, 'POST', path)
    const res = await fetch(`${NOTIFY_API}/register-device`, { method: 'POST', headers, body })
    return res.ok
  } catch {
    return false
  }
}

/**
 * 注销推送 Token（登出时调用）
 */
export async function unregisterPushToken(_userId: string): Promise<void> {
  try {
    const path = '/api/notify/register-device'
    const headers = await buildSignedHeaders('', 'DELETE', path)
    await fetch(`${NOTIFY_API}/register-device`, { method: 'DELETE', headers })
  } catch {
    // 静默失败，不阻塞登出流程
  }
}

// ── Notification Handlers ─────────────────────────────────────────

/**
 * 配置通知展示行为（App 处于前台时也显示通知横幅）
 * 在 app/_layout.tsx 根层调用一次即可
 */
export function configureNotificationHandlers(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
}
