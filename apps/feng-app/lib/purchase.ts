/**
 * Server-side purchase / entitlement checks for Fēng analyze gating.
 */

import type { FengResidenceType } from '@zhop/scenario-feng'
import { config } from './config'
import { isDevProSync } from './dev-flags'
import { type FengSingleSku, singleSkuForResidence } from './feng-pricing-client'
import { signRequest } from './hmac'

const TARGET_APP = 'feng'

async function authedHeaders(
  userId: string,
  method: string,
  path: string,
  body: string
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${userId}`,
    'X-Target-App': TARGET_APP,
  }
  const sig = await signRequest({ body, userId, method, path })
  if (sig) Object.assign(headers, sig)
  if (isDevProSync()) headers['x-feng-dev-pro'] = '1'
  return headers
}

interface PurchaseAvailableResponse {
  available: boolean
  purchaseId: string | null
}

interface EntitlementsResponse {
  data?: { entitlements?: Array<{ key: string }> }
}

export async function fetchFengPurchaseAvailable(
  userId: string,
  skuId: FengSingleSku = 'feng_analysis'
): Promise<boolean> {
  const path = `/api/purchase/available/${skuId}`
  const res = await fetch(`${config.apiUrl}${path}`, {
    headers: await authedHeaders(userId, 'GET', path, ''),
  })
  if (!res.ok) return false
  const json = (await res.json()) as PurchaseAvailableResponse
  return Boolean(json.available)
}

export async function fetchHasAnySubscription(userId: string): Promise<boolean> {
  const path = '/api/user/me/entitlements'
  const res = await fetch(`${config.apiUrl}${path}`, {
    headers: await authedHeaders(userId, 'GET', path, ''),
  })
  if (!res.ok) return false
  const json = (await res.json()) as EntitlementsResponse
  const list = json.data?.entitlements ?? []
  return list.length > 0
}

/** True when analyze can proceed without opening the paywall (server may still 403). */
export async function hasFengAnalyzeAccess(
  userId: string,
  residenceType: FengResidenceType = 'apartment'
): Promise<boolean> {
  if (isDevProSync()) return true
  const skuId = singleSkuForResidence(residenceType)
  const [purchase, subscribed] = await Promise.all([
    fetchFengPurchaseAvailable(userId, skuId),
    fetchHasAnySubscription(userId),
  ])
  return purchase || subscribed
}

const WEBHOOK_POLL_MS = 500
const WEBHOOK_POLL_ATTEMPTS = 24

/** Poll until RevenueCat webhook records the single purchase row for the tier SKU. */
export async function waitForFengPurchaseAvailable(
  userId: string,
  residenceType: FengResidenceType = 'apartment'
): Promise<boolean> {
  const skuId = singleSkuForResidence(residenceType)
  for (let i = 0; i < WEBHOOK_POLL_ATTEMPTS; i++) {
    if (await fetchFengPurchaseAvailable(userId, skuId)) return true
    await new Promise((r) => setTimeout(r, WEBHOOK_POLL_MS))
  }
  return false
}

export interface FengReportChatAccess {
  chatUnlocked: boolean
  analyzeComplete: boolean
}

export async function fetchFengReportChatAccess(
  userId: string,
  reportId: string
): Promise<FengReportChatAccess> {
  const path = `/api/feng/reports/${reportId}/chat-access`
  const res = await fetch(`${config.apiUrl}${path}`, {
    headers: await authedHeaders(userId, 'GET', path, ''),
  })
  if (!res.ok) {
    return { chatUnlocked: false, analyzeComplete: false }
  }
  const json = (await res.json()) as {
    ok?: boolean
    data?: FengReportChatAccess
  }
  if (json.ok && json.data) return json.data
  return { chatUnlocked: false, analyzeComplete: false }
}
