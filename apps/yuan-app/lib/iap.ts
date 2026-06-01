/**
 * Yuán IAP — RevenueCat wrapper.
 *
 * Two products gate "unlimited bonds":
 *   - `hexastral_yuan_pro_monthly`  — $1.99 / mo
 *   - `hexastral_yuan_pro_annual`   — $14.99 / yr
 *
 * Both grant the `hexastral_yuan_pro` entitlement.
 *
 * `react-native-purchases` is unavailable in Expo Go; all entry points no-op
 * silently in that env (the paywall surfaces a "preview only" message).
 */

import { Platform } from 'react-native'
import { config } from './config'

const ENTITLEMENT_ID = 'hexastral_yuan_pro'

export const YUAN_PRODUCT_IDS = {
  monthly: 'hexastral_yuan_pro_monthly',
  annual: 'hexastral_yuan_pro_annual',
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

export interface YuanProStatus {
  isPro: boolean
  expiresAt: string | null
}

export async function getYuanProStatus(): Promise<YuanProStatus> {
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

export interface YuanOfferings {
  monthlyPriceString: string | null
  annualPriceString: string | null
  available: boolean
}

export async function getYuanOfferings(): Promise<YuanOfferings> {
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

export type YuanPurchaseResult = 'success' | 'cancelled' | 'failed' | 'unavailable'

export async function purchaseYuanPro(plan: 'monthly' | 'annual'): Promise<YuanPurchaseResult> {
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

export async function restoreYuanPurchases(): Promise<boolean> {
  const p = loadPurchases()
  if (!p || !initialized) return false
  try {
    const info = await p.restorePurchases()
    return !!info.entitlements.active[ENTITLEMENT_ID]
  } catch {
    return false
  }
}
