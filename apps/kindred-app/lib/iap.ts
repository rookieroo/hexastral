/**
 * Kindred IAP — RevenueCat wrapper.
 *
 * Two products gate "unlimited bonds". Flagship pricing (2026-06, founder-agreed —
 * Yuel is the premium tier vs Yuun's mass-market almanac); actual price is set in App
 * Store Connect / RevenueCat (authoritative). Intended targets:
 *   - `hexastral_kindred_pro_monthly`  — $7.99 / mo
 *   - `hexastral_kindred_pro_annual`   — $47.99 / yr
 *
 * Both grant the `hexastral_kindred_pro` entitlement.
 *
 * `react-native-purchases` is unavailable in Expo Go; all entry points no-op
 * silently in that env (the paywall surfaces a "preview only" message).
 */

import { Platform } from 'react-native'
import { config } from './config'

const ENTITLEMENT_ID = 'hexastral_kindred_pro'

export const YUAN_PRODUCT_IDS = {
  monthly: 'hexastral_kindred_pro_monthly',
  annual: 'hexastral_kindred_pro_annual',
} as const

type PurchasesModule = typeof import('react-native-purchases')
let Purchases: PurchasesModule['default'] | null = null

function loadPurchases(): PurchasesModule['default'] | null {
  if (Purchases) return Purchases
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases') as PurchasesModule
    Purchases = mod.default
    return Purchases
  } catch {
    return null
  }
}

let initialized = false

export function initializeYuanIap(): void {
  if (initialized) return
  const p = loadPurchases()
  if (!p) return
  const apiKey = Platform.OS === 'ios' ? config.revenueCat.ios : config.revenueCat.android
  const looksLikePlaceholder =
    !apiKey || apiKey.includes('REPLACE_WITH_') || apiKey.includes('xxxx')
  if (looksLikePlaceholder) return
  try {
    p.configure({ apiKey })
    initialized = true
  } catch {
    // ignore — paywall will degrade to preview mode
  }
}

export async function loginYuanIap(userId: string): Promise<void> {
  const p = loadPurchases()
  if (!p || !initialized) return
  try {
    await p.logIn(userId)
  } catch {
    // ignore
  }
}

export async function logoutYuanIap(): Promise<void> {
  const p = loadPurchases()
  if (!p || !initialized) return
  try {
    await p.logOut()
  } catch {
    // ignore
  }
}

export interface KindredProStatus {
  isPro: boolean
  expiresAt: string | null
}

// ── DEV-only Pro override ─────────────────────────────────────────────────────
// In-memory toggle (Settings · DEV) to force Pro/Free without a real purchase.
// Resets on reload; gated on __DEV__ so production never overrides.
export type KindredDevPro = 'pro' | 'free' | null
let devProOverride: KindredDevPro = null

export function getKindredDevPro(): KindredDevPro {
  return __DEV__ ? devProOverride : null
}

export function setKindredDevPro(next: KindredDevPro): void {
  if (__DEV__) devProOverride = next
}

export async function getYuanProStatus(): Promise<KindredProStatus> {
  const dev = getKindredDevPro()
  if (dev) return { isPro: dev === 'pro', expiresAt: null }
  const p = loadPurchases()
  if (!p || !initialized) return { isPro: false, expiresAt: null }
  try {
    const info = await p.getCustomerInfo()
    const ent = info.entitlements.active[ENTITLEMENT_ID]
    return { isPro: !!ent, expiresAt: ent?.expirationDate ?? null }
  } catch {
    return { isPro: false, expiresAt: null }
  }
}

export interface KindredOfferings {
  monthlyPriceString: string | null
  annualPriceString: string | null
  available: boolean
}

export async function getYuanOfferings(): Promise<KindredOfferings> {
  const p = loadPurchases()
  if (!p || !initialized)
    return { monthlyPriceString: null, annualPriceString: null, available: false }
  try {
    const offerings = await p.getOfferings()
    const current = offerings.current
    return {
      monthlyPriceString: current?.monthly?.product.priceString ?? null,
      annualPriceString: current?.annual?.product.priceString ?? null,
      available: !!current,
    }
  } catch {
    return { monthlyPriceString: null, annualPriceString: null, available: false }
  }
}

export type KindredPurchaseResult = 'success' | 'cancelled' | 'failed' | 'unavailable'

export async function purchaseKindredPro(
  plan: 'monthly' | 'annual'
): Promise<KindredPurchaseResult> {
  const p = loadPurchases()
  if (!p || !initialized) return 'unavailable'
  try {
    const offerings = await p.getOfferings()
    const pkg = plan === 'monthly' ? offerings.current?.monthly : offerings.current?.annual
    if (!pkg) return 'unavailable'
    const { customerInfo } = await p.purchasePackage(pkg)
    return customerInfo.entitlements.active[ENTITLEMENT_ID] ? 'success' : 'failed'
  } catch (err) {
    const code = (err as { code?: string; userCancelled?: boolean }).code
    if (code === 'PURCHASE_CANCELLED' || (err as { userCancelled?: boolean }).userCancelled) {
      return 'cancelled'
    }
    return 'failed'
  }
}

export async function restoreKindredPurchases(): Promise<boolean> {
  const p = loadPurchases()
  if (!p || !initialized) return false
  try {
    const info = await p.restorePurchases()
    return !!info.entitlements.active[ENTITLEMENT_ID]
  } catch {
    return false
  }
}

// ── Single purchases (non-subscription) ──────────────────────────────────────
// One-time unlocks. The purchase is recorded server-side by the RevenueCat
// webhook (single_purchases row); the caller then applies it to a bond via
// POST /bonds/:id/unlock. We don't read entitlements here — success = the
// store call resolved without throwing.

export const KINDRED_SINGLE_PRODUCT_IDS = {
  /** Full six-chapter synastry report for one bond ($6.99). */
  compatibility: 'hexastral_compatibility',
} as const

export type KindredSingleSku = keyof typeof KINDRED_SINGLE_PRODUCT_IDS

/** Localized store price for a single product, or null if unavailable (caller falls back). */
export async function getKindredSinglePrice(sku: KindredSingleSku): Promise<string | null> {
  const p = loadPurchases()
  if (!p || !initialized) return null
  try {
    const products = await p.getProducts([KINDRED_SINGLE_PRODUCT_IDS[sku]])
    return products[0]?.priceString ?? null
  } catch {
    return null
  }
}

export async function purchaseKindredSingle(sku: KindredSingleSku): Promise<KindredPurchaseResult> {
  const p = loadPurchases()
  if (!p || !initialized) return 'unavailable'
  try {
    await p.purchaseProduct(KINDRED_SINGLE_PRODUCT_IDS[sku])
    return 'success'
  } catch (err) {
    const code = (err as { code?: string; userCancelled?: boolean }).code
    if (code === 'PURCHASE_CANCELLED' || (err as { userCancelled?: boolean }).userCancelled) {
      return 'cancelled'
    }
    return 'failed'
  }
}
