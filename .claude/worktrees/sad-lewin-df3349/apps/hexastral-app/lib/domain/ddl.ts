/**
 * Deferred Deep Link (DDL) — iOS 侧消费逻辑
 *
 * Web 端用户完成 Onboarding → DDLRedirectButton 创建 Session（含 payload）→ 跳转 App Store
 * iOS App 启动 → 尝试两种方式还原 payload：
 *   1. Token 精确匹配（deep link 带来的 token）→ GET /api/ddl/:token
 *   2. 指纹模糊匹配（冷启动无 token 时）→ POST /api/ddl/match
 *
 * 流程：
 *   H5 DDLRedirectButton → createDDLSession → KV 存入 → redirectToAppStore(token)
 *   iOS 安装后首次启动 → [有 token] resolveDDLSession : [无 token] matchDDLSession → 写入 BirthInfo
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import type { DDLSession } from '@zhop/ddl-client'
import { matchDDLSession, resolveDDLSession } from '@zhop/ddl-client/client'
import { Dimensions, Platform } from 'react-native'
import { config } from '../config'
import { saveBirthInfo } from './birthInfo'

const DDL_CLAIMED_KEY = 'hexastral_ddl_claimed'
const DDL_TOKEN_KEY = 'hexastral_ddl_token'

// ─────────── DDL Payload ────────────────────────────────────────

export interface DDLPayload {
  mode?: 'personal' | 'pairing'
  dayMaster?: string
  score?: number
  birthYear?: string
  gender?: '男' | '女'
  solarDate?: string
  timeIndex?: number
  referralCode?: string
  /** Hehun pairing flow — bond context from web collection page */
  bondId?: string
  inviterUserId?: string
  partnerSolarDate?: string
  partnerTimeIndex?: number
  partnerGender?: '男' | '女'
  partnerName?: string
  previewScore?: number
  source?: string
  [key: string]: unknown
}

// ─────────── Token 管理 ─────────────────────────────────────────

/**
 * 缓存 deep link 传来的 DDL token，供 attemptDDLRestore 读取。
 * 由 _layout.tsx 的 deep link handler 调用。
 */
export async function setDDLToken(token: string): Promise<void> {
  await AsyncStorage.setItem(DDL_TOKEN_KEY, token)
}

/** 读取并清除缓存的 DDL token（一次性读取） */
async function consumeDDLToken(): Promise<string | null> {
  const token = await AsyncStorage.getItem(DDL_TOKEN_KEY)
  if (token) {
    await AsyncStorage.removeItem(DDL_TOKEN_KEY)
  }
  return token
}

// ─────────── 设备指纹（轻量版，用于模糊匹配） ──────────────────

function collectDeviceFingerprint() {
  const { width, height } = Dimensions.get('screen')
  return {
    screenWidth: Math.round(width),
    screenHeight: Math.round(height),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    platform: Platform.OS,
  }
}

// ─────────── Session → Payload 提取 ────────────────────────────

function extractPayload(session: DDLSession): DDLPayload | null {
  const payload = session.meta?.payload as DDLPayload | undefined
  return payload ?? null
}

/** 将 payload 中的出生信息写入本地 BirthInfo */
async function persistBirthInfo(payload: DDLPayload): Promise<void> {
  if (payload.birthYear || payload.solarDate || payload.gender || payload.timeIndex !== undefined) {
    await saveBirthInfo({
      birthYear: payload.birthYear,
      gender: payload.gender,
      solarDate: payload.solarDate,
      timeIndex: payload.timeIndex,
    })
  }
}

/** If the DDL payload carries hehun pairing context, bond is now created server-side */
async function persistBondFromPayload(_payload: DDLPayload): Promise<void> {
  // Bond creation moved to server-side via POST /api/bonds/invite/:token/respond
  // This function is kept as a no-op for backward compatibility with existing DDL payloads
}

// ─────────── 主入口 ─────────────────────────────────────────────

/**
 * App 启动时调用，仅执行一次（通过 AsyncStorage 标记）。
 *
 * 策略：token 优先 → 指纹兜底
 *   1. 有缓存 token → resolveDDLSession（精确匹配）
 *   2. 无 token → matchDDLSession（指纹模糊匹配，利用 IP + 屏幕尺寸 + 时区）
 *
 * 返回值：
 * - `null` 表示无 DDL 数据（正常冷启动）
 * - `DDLPayload` 表示成功还原了 H5 的 Onboarding 数据
 */
export async function attemptDDLRestore(): Promise<DDLPayload | null> {
  try {
    const claimed = await AsyncStorage.getItem(DDL_CLAIMED_KEY)
    if (claimed === 'true') return null

    // 路径 1：Token 精确匹配（来自 deep link）
    const token = await consumeDDLToken()
    if (token) {
      const { session, found } = await resolveDDLSession(config.apiUrl, token)
      if (found && session) {
        const payload = extractPayload(session)
        if (payload) {
          await persistBirthInfo(payload)
          await persistBondFromPayload(payload)
          await AsyncStorage.setItem(DDL_CLAIMED_KEY, 'true')
          return payload
        }
      }
    }

    // 路径 2：指纹模糊匹配（冷启动无 token 兜底）
    const fingerprint = collectDeviceFingerprint()
    const matchResult = await matchDDLSession(config.apiUrl, fingerprint)
    if (matchResult.found && matchResult.session) {
      const payload = extractPayload(matchResult.session)
      if (payload) {
        await persistBirthInfo(payload)
        await persistBondFromPayload(payload)
        await AsyncStorage.setItem(DDL_CLAIMED_KEY, 'true')
        return payload
      }
    }

    // 两种路径都未匹配 → 标记已尝试
    await AsyncStorage.setItem(DDL_CLAIMED_KEY, 'true')
    return null
  } catch {
    // DDL 失败不应阻塞正常 App 启动
    return null
  }
}

// ─────────── Dev Tools ──────────────────────────────────────────

/** 重置 DDL 认领状态（开发调试，强制下次启动重新尝试） */
export async function resetDDLState(): Promise<void> {
  await AsyncStorage.removeItem(DDL_CLAIMED_KEY)
  await AsyncStorage.removeItem(DDL_TOKEN_KEY)
}

/** 手动注入 DDL Token 并立即还原（开发者面板用） */
export async function injectDDLToken(token: string): Promise<DDLPayload | null> {
  try {
    const { session, found } = await resolveDDLSession(config.apiUrl, token)

    if (!found || !session) return null

    const payload = extractPayload(session)
    if (!payload) return null

    await persistBirthInfo(payload)
    await persistBondFromPayload(payload)
    await AsyncStorage.setItem(DDL_CLAIMED_KEY, 'true')
    return payload
  } catch {
    return null
  }
}
