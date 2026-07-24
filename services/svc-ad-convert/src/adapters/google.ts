import type { AdConvertMessage, Env, VendorResult } from '../types'

function gaEventName(name: AdConvertMessage['event_name']): string {
  switch (name) {
    case 'Purchase':
      return 'purchase'
    case 'Subscribe':
      return 'subscribe'
    case 'CompleteRegistration':
      return 'sign_up'
    case 'Lead':
      return 'generate_lead'
    case 'ViewContent':
      return 'view_item'
    default:
      return 'page_view'
  }
}

/** Google Analytics 4 Measurement Protocol (Enhanced Conversions–adjacent server hit). */
export async function sendGoogle(env: Env, msg: AdConvertMessage): Promise<VendorResult> {
  const measurementId = env.GOOGLE_MEASUREMENT_ID?.trim()
  const apiSecret = env.GOOGLE_API_SECRET?.trim()
  if (!measurementId && !apiSecret) {
    return { vendor: 'google', status: 'skipped', reason: 'not_configured' }
  }
  if (!measurementId || !apiSecret) {
    return {
      vendor: 'google',
      status: 'config_error',
      reason: 'GOOGLE_MEASUREMENT_ID or GOOGLE_API_SECRET missing while partial set',
    }
  }

  const sanitized = msg.event_id.replace(/[^a-zA-Z0-9.-]/g, '').slice(0, 36)
  const clientId = msg.click_ids?.gclid ?? msg.user_id ?? (sanitized || '555.555')

  const params: Record<string, string | number> = {
    engagement_time_msec: 1,
  }
  if (msg.value != null) params.value = msg.value
  if (msg.currency) params.currency = msg.currency
  if (msg.click_ids?.gclid) params.gclid = msg.click_ids.gclid
  if (msg.target_app) params.item_id = msg.target_app

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        timestamp_micros: String(msg.occurred_at_ms * 1000),
        events: [
          {
            name: gaEventName(msg.event_name),
            params: {
              ...params,
              transaction_id: msg.event_id,
            },
          },
        ],
      }),
      signal: AbortSignal.timeout(12_000),
    })
    const text = await res.text().catch(() => '')
    if (res.status === 401 || res.status === 403) {
      return { vendor: 'google', status: 'auth_error', httpStatus: res.status, body: text.slice(0, 400) }
    }
    if (!res.ok) {
      const transient = res.status >= 500 || res.status === 429
      return {
        vendor: 'google',
        status: transient ? 'transient_error' : 'auth_error',
        httpStatus: res.status,
        body: text.slice(0, 400),
      }
    }
    return { vendor: 'google', status: 'ok' }
  } catch (err: unknown) {
    return {
      vendor: 'google',
      status: 'transient_error',
      body: err instanceof Error ? err.message : String(err),
    }
  }
}
