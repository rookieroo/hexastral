/**
 * Hexastral 订阅 + 单次解读 (IAP)
 *
 * RevenueCat 统一入口：
 * - 年订阅        hexastral_pro_annual        → entitlement hexastral_pro ($69/yr)
 * - 单次占卜      hexastral_divination_single → consumable ($1.99)
 * - 单次命运全解  hexastral_fate_reading      → consumable ($9.99)
 * - 单次合婚配对  hexastral_compatibility     → consumable ($12.99)
 *
 * 用户归因 (appAccountToken)：
 * - 登录/访客时调用 loginRevenueCat(userId)，RevenueCat 内部绑定 appAccountToken
 * - 访客购买后 Apple ID 登录 → logIn(appleUserId) 自动 alias merge
 */

import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { config } from '@/lib/config'
import { signRequest } from '@/lib/hmac'
import { clearLastNotificationId, getLastNotificationId } from '@/lib/hooks/usePushAttribution'
import { isExpoGo } from '@/lib/native'

// Dynamic require — @shopify/react-native-purchases is not available in Expo Go.
// eslint-disable-next-line @typescript-eslint/no-require-imports
type PurchasesModule = typeof import('react-native-purchases')
let Purchases: PurchasesModule['default'] | null = null
let LOG_LEVEL: PurchasesModule['LOG_LEVEL'] | null = null

if (!isExpoGo) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-native-purchases') as PurchasesModule
  Purchases = mod.default
  LOG_LEVEL = mod.LOG_LEVEL
}

const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? ''
const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? ''

const ENTITLEMENT_ID = 'hexastral_pro'

/** Fire-and-forget: sends push → IAP attribution if a recent notification was captured */
function reportPushAttribution(productId: string, skuId: string): void {
  const notificationId = getLastNotificationId()
  if (!notificationId) return
  clearLastNotificationId()
  ;(async () => {
    try {
      const body = JSON.stringify({ notificationId, productId, skuId })
      const path = '/api/notify/attribution'
      const userId = (await SecureStore.getItemAsync('user_id')) ?? ''
      const sigs = await signRequest({ body, userId, method: 'POST', path })
      const headers = new Headers({ 'Content-Type': 'application/json' })
      if (sigs) {
        for (const [k, v] of Object.entries(sigs)) headers.set(k, v)
      }
      if (userId) headers.set('Authorization', `Bearer ${userId}`)
      await fetch(`${config.apiUrl}${path}`, { method: 'POST', headers, body })
    } catch {
      // Attribution is best-effort — never block the purchase flow
    }
  })()
}

/** RevenueCat Offering / product identifiers */
export const PRODUCT_IDS = {
  /** 年订阅 — RevenueCat default offering, Annual package ($69/yr) */
  annual: 'hexastral_pro_annual',
  /** 单次占卜 — Consumable ($1.99) */
  divination_single: 'hexastral_divination_single',
  /** 单次命运全解（含大运 + 流年） — Consumable ($9.99) */
  fate_reading: 'hexastral_fate_reading',
  /** 单次合婚配对 — Consumable ($12.99) */
  compatibility: 'hexastral_compatibility',
} as const

// ─────────── 初始化 ───────────────────────────────────────────────

export function initializeSubscriptions() {
  if (!Purchases) return // Expo Go — skip
  const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY
  const looksLikePlaceholderKey = apiKey.includes('REPLACE_WITH_') || apiKey.includes('xxxx')
  if (!apiKey || looksLikePlaceholderKey) return

  if (__DEV__ && Platform.OS === 'ios') {
    // Use local StoreKit configuration file for simulator testing.
    // Products are fetched from ios/HexAstral/Configuration.storekit instead of App Store Connect.
    Purchases.configure({ apiKey, useAmazon: false })
    Purchases.setSimulatesAskToBuyInSandbox(false)
  } else {
    Purchases.configure({ apiKey })
  }

  if (__DEV__ && LOG_LEVEL) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG)
  }
}

/**
 * 登录/切换 RevenueCat 用户身份，绑定 appAccountToken
 *
 * 调用时机：Apple Sign-In 成功后、访客登录后
 * 访客购买 → Apple 登录后传新 userId 即可自动 alias merge
 */
export async function loginRevenueCat(userId: string): Promise<void> {
  if (!Purchases) return
  try {
    await Purchases.logIn(userId)
  } catch {
    // 不阻塞登录流程
  }
}

export async function logoutRevenueCat(): Promise<void> {
  if (!Purchases) return
  try {
    await Purchases.logOut()
  } catch {
    // ignore
  }
}

// ─────────── 订阅状态 ─────────────────────────────────────────────

export async function checkSubscriptionStatus(): Promise<{
  isSubscribed: boolean
  expiresAt: string | null
}> {
  if (!Purchases) return { isSubscribed: false, expiresAt: null }
  try {
    const customerInfo = await Purchases.getCustomerInfo()
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID]
    return {
      isSubscribed: !!entitlement,
      expiresAt: entitlement?.expirationDate ?? null,
    }
  } catch {
    return { isSubscribed: false, expiresAt: null }
  }
}

// ─────────── 年订阅 ───────────────────────────────────────────────

/**
 * 获取年订阅本地化价格字符串
 * RevenueCat Dashboard → Offerings → default → Annual package
 */
export async function getAnnualPrice(): Promise<string | null> {
  if (!Purchases) return null
  try {
    const offerings = await Purchases.getOfferings()
    const pkg = offerings.current?.annual
    return pkg?.product.priceString ?? null
  } catch {
    return null
  }
}

/**
 * 购买年订阅
 * RevenueCat 自动用 logIn 设置的 userId 作为 appAccountToken
 */
export async function purchaseAnnual(): Promise<boolean> {
  if (!Purchases) return false
  try {
    const offerings = await Purchases.getOfferings()
    const pkg = offerings.current?.annual
    if (!pkg) return false

    const { customerInfo } = await Purchases.purchasePackage(pkg)
    const granted = !!customerInfo.entitlements.active[ENTITLEMENT_ID]
    if (granted) reportPushAttribution(PRODUCT_IDS.annual, 'pro_annual')
    return granted
  } catch {
    return false
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!Purchases) return false
  try {
    const customerInfo = await Purchases.restorePurchases()
    return !!customerInfo.entitlements.active[ENTITLEMENT_ID]
  } catch {
    return false
  }
}

// ─────────── 单次解读购买 (Consumable) ───────────────────────────

export type SingleSkuId = 'divination' | 'fate_reading' | 'compatibility'

const SINGLE_READING_PRODUCT_IDS: Record<SingleSkuId, string> = {
  divination: PRODUCT_IDS.divination_single,
  fate_reading: PRODUCT_IDS.fate_reading,
  compatibility: PRODUCT_IDS.compatibility,
}

export interface SingleReadingProduct {
  skuId: SingleSkuId
  productId: string
  priceString: string
}

/**
 * 获取单次解读 RevenueCat 产品信息（本地化价格来自 RevenueCat）
 * RevenueCat Dashboard → Offerings → "single_readings" offering
 */
export async function getSingleReadingProduct(
  skuId: SingleSkuId
): Promise<SingleReadingProduct | null> {
  if (!Purchases) return null
  try {
    const offerings = await Purchases.getOfferings()
    const offering = offerings.all.single_readings
    const productId = SINGLE_READING_PRODUCT_IDS[skuId]

    const pkg = offering?.availablePackages.find((p) => p.product.identifier === productId)
    if (!pkg) return null

    return { skuId, productId, priceString: pkg.product.priceString }
  } catch {
    return null
  }
}

/**
 * 购买单次解读
 * RevenueCat webhook → 服务端写入 single_purchases 表 (status='purchased')
 * 客户端 poll GET /api/purchase/available/:skuId 等待 webhook 生效
 *
 * @returns true if purchase completed successfully
 */
export async function purchaseSingleReading(skuId: SingleSkuId): Promise<boolean> {
  if (!Purchases) return false
  try {
    const offerings = await Purchases.getOfferings()
    const offering = offerings.all.single_readings
    const productId = SINGLE_READING_PRODUCT_IDS[skuId]

    const pkg = offering?.availablePackages.find((p) => p.product.identifier === productId)
    if (!pkg) return false

    await Purchases.purchasePackage(pkg)
    reportPushAttribution(productId, skuId)
    return true
  } catch {
    return false
  }
}
