/**
 * Upload last-touch DDL attribution (click ids / UTM) to the API so RC
 * INITIAL_PURCHASE webhooks can attach them to merchant CAPI postbacks.
 */

import { resolvePortfolioApiUrl } from './api-url'
import { readLastResolvedDdlMeta } from './ddl-session-cache'
import { signRequest } from './hmac'
import { getOrCreateAnonymousInstallId } from './install-id'
import { getPortfolioUserId } from './session'

function asStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === 'string' && v.length > 0) out[k] = v
  }
  return out
}

function attributionFromMeta(meta: Record<string, unknown> | null): {
  click_ids: Record<string, string>
  utm: Record<string, string>
  landing_path?: string
  target_app?: string
} | null {
  if (!meta) return null
  const click_ids = asStringRecord(meta.clickIds)
  const utm = asStringRecord(meta.utm)
  if (Object.keys(click_ids).length === 0 && Object.keys(utm).length === 0) return null
  return {
    click_ids,
    utm,
    landing_path: typeof meta.landingPath === 'string' ? meta.landingPath : undefined,
    target_app: typeof meta.targetApp === 'string' ? meta.targetApp : undefined,
  }
}

/** Pre-login: POST /api/growth/attribution/anon after DDL claim. */
export async function uploadAnonGrowthAttribution(opts: {
  apiBase: string
  storagePrefix: string
  targetApp: string
}): Promise<void> {
  const meta = await readLastResolvedDdlMeta(opts.storagePrefix)
  const attr = attributionFromMeta(meta)
  if (!attr) return

  const anonymousId = await getOrCreateAnonymousInstallId(opts.storagePrefix)
  const base = opts.apiBase.replace(/\/+$/, '') || resolvePortfolioApiUrl()
  try {
    const res = await fetch(`${base}/api/growth/attribution/anon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anonymous_id: anonymousId,
        target_app: attr.target_app ?? opts.targetApp,
        click_ids: attr.click_ids,
        utm: attr.utm,
        landing_path: attr.landing_path,
        claimed_at_ms: Date.now(),
      }),
    })
    if (!res.ok) {
      console.warn('[satellite-runtime] anon attribution upload', res.status)
    }
  } catch (err) {
    console.warn('[satellite-runtime] anon attribution upload failed', err)
  }
}

/**
 * Post-login: HMAC POST /api/growth/attribution — re-keys anon row → userId
 * and optionally emits CompleteRegistration CAPI.
 */
export async function uploadSignedGrowthAttribution(opts: {
  apiBase: string
  storagePrefix: string
  targetApp: string
  emitLoginPostback?: boolean
}): Promise<void> {
  const userId = await getPortfolioUserId()
  if (!userId) return

  const meta = await readLastResolvedDdlMeta(opts.storagePrefix)
  const attr = attributionFromMeta(meta)
  if (!attr) return

  const anonymousId = await getOrCreateAnonymousInstallId(opts.storagePrefix)
  const base = opts.apiBase.replace(/\/+$/, '') || resolvePortfolioApiUrl()
  const path = '/api/growth/attribution'
  const body = JSON.stringify({
    anonymous_id: anonymousId,
    target_app: attr.target_app ?? opts.targetApp,
    click_ids: attr.click_ids,
    utm: attr.utm,
    landing_path: attr.landing_path,
    claimed_at_ms: Date.now(),
    emit_login_postback: opts.emitLoginPostback === true,
  })
  const signed = await signRequest({ body, userId, method: 'POST', path })
  if (!signed) {
    console.warn('[satellite-runtime] signed attribution: missing deviceSecret')
    return
  }

  try {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userId}`,
        ...signed,
      },
      body,
    })
    if (!res.ok) {
      console.warn('[satellite-runtime] signed attribution upload', res.status)
    }
  } catch (err) {
    console.warn('[satellite-runtime] signed attribution upload failed', err)
  }
}
