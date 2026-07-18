/**
 * Xingqi IAP — dual track (ADR-0028):
 *   faceoracle_pro_monthly / annual → faceoracle_pro
 *   faceoracle_reading → one-shot consumable (≥ $9.99)
 */

import { Platform } from 'react-native'
import { config } from './config'
import { REVENUECAT_PRODUCT_IDS } from './growth-config'

export const FACE_PRODUCT_IDS = REVENUECAT_PRODUCT_IDS
export const ENTITLEMENT_ID = 'faceoracle_pro'

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

export function initializeFaceIap(): void {
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
    // paywall degrades
  }
}

export async function loginFaceIap(userId: string): Promise<void> {
  const p = loadPurchases()
  if (!p || !initialized) return
  try {
    await p.logIn(userId)
  } catch {
    // ignore
  }
}

export async function purchaseProduct(productId: string): Promise<boolean> {
  const p = loadPurchases()
  if (!p || !initialized) return false
  try {
    await p.purchaseProduct(productId)
    return true
  } catch {
    return false
  }
}

export async function restorePurchases(): Promise<void> {
  const p = loadPurchases()
  if (!p || !initialized) return
  try {
    await p.restorePurchases()
  } catch {
    // ignore
  }
}

/** @deprecated kindred name — keep compile stubs for leftover settings imports */
export type KindredDevPro = 'off' | 'pro' | 'free'
export function getKindredDevPro(): KindredDevPro {
  return 'off'
}
export function setKindredDevPro(_v: KindredDevPro): void {}
export const initializeYuanIap = initializeFaceIap
export const loginYuanIap = loginFaceIap
export const YUAN_PRODUCT_IDS = FACE_PRODUCT_IDS
