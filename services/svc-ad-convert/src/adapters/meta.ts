import type { AdConvertMessage, Env, VendorResult } from '../types'

function metaEventName(name: AdConvertMessage['event_name']): string {
  switch (name) {
    case 'Lead':
      return 'Lead'
    case 'Purchase':
      return 'Purchase'
    case 'Subscribe':
      return 'Subscribe'
    case 'CompleteRegistration':
      return 'CompleteRegistration'
    case 'ViewContent':
      return 'ViewContent'
    default:
      return 'PageView'
  }
}

export async function sendMeta(env: Env, msg: AdConvertMessage): Promise<VendorResult> {
  const pixelId = env.META_PIXEL_ID?.trim()
  const token = env.META_ACCESS_TOKEN?.trim()
  if (!pixelId && !token) {
    return { vendor: 'meta', status: 'skipped', reason: 'not_configured' }
  }
  if (!pixelId || !token) {
    return {
      vendor: 'meta',
      status: 'config_error',
      reason: 'META_PIXEL_ID or META_ACCESS_TOKEN missing while partial set',
    }
  }

  const userData: Record<string, string> = {}
  const ids = msg.click_ids ?? {}
  if (ids.fbclid) userData.fbc = ids._fbc ?? `fb.1.${Math.floor(msg.occurred_at_ms / 1000)}.${ids.fbclid}`
  if (ids._fbp) userData.fbp = ids._fbp
  if (ids._fbc) userData.fbc = ids._fbc
  if (msg.client_ip) userData.client_ip_address = msg.client_ip
  if (msg.client_user_agent) userData.client_user_agent = msg.client_user_agent
  if (msg.user_id) userData.external_id = msg.user_id

  const customData: Record<string, string | number> = {}
  if (msg.value != null) customData.value = msg.value
  if (msg.currency) customData.currency = msg.currency
  if (msg.target_app) customData.content_name = msg.target_app

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: metaEventName(msg.event_name),
        event_time: Math.floor(msg.occurred_at_ms / 1000),
        event_id: msg.event_id,
        action_source: msg.action_source === 'app' ? 'app' : 'website',
        user_data: userData,
        custom_data: Object.keys(customData).length > 0 ? customData : undefined,
      },
    ],
  }
  if (env.META_TEST_EVENT_CODE?.trim()) {
    body.test_event_code = env.META_TEST_EVENT_CODE.trim()
  }

  const url = `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    })
    const text = await res.text().catch(() => '')
    if (res.status === 401 || res.status === 403) {
      return { vendor: 'meta', status: 'auth_error', httpStatus: res.status, body: text.slice(0, 400) }
    }
    if (!res.ok) {
      const transient = res.status >= 500 || res.status === 429
      return {
        vendor: 'meta',
        status: transient ? 'transient_error' : 'auth_error',
        httpStatus: res.status,
        body: text.slice(0, 400),
      }
    }
    return { vendor: 'meta', status: 'ok' }
  } catch (err: unknown) {
    return {
      vendor: 'meta',
      status: 'transient_error',
      body: err instanceof Error ? err.message : String(err),
    }
  }
}
