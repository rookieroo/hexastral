import type { AdConvertMessage, Env, VendorResult } from '../types'

function tiktokEvent(name: AdConvertMessage['event_name']): string {
  switch (name) {
    case 'Purchase':
      return 'CompletePayment'
    case 'Subscribe':
      return 'Subscribe'
    case 'CompleteRegistration':
      return 'CompleteRegistration'
    case 'Lead':
      return 'ClickButton'
    case 'ViewContent':
      return 'ViewContent'
    default:
      return 'Pageview'
  }
}

export async function sendTikTok(env: Env, msg: AdConvertMessage): Promise<VendorResult> {
  const pixelId = env.TIKTOK_PIXEL_ID?.trim()
  const token = env.TIKTOK_ACCESS_TOKEN?.trim()
  if (!pixelId && !token) {
    return { vendor: 'tiktok', status: 'skipped', reason: 'not_configured' }
  }
  if (!pixelId || !token) {
    return {
      vendor: 'tiktok',
      status: 'config_error',
      reason: 'TIKTOK_PIXEL_ID or TIKTOK_ACCESS_TOKEN missing while partial set',
    }
  }

  const properties: Record<string, string | number> = {}
  if (msg.value != null) properties.value = msg.value
  if (msg.currency) properties.currency = msg.currency
  if (msg.target_app) properties.content_id = msg.target_app

  const context: Record<string, unknown> = {
    user_agent: msg.client_user_agent,
    ip: msg.client_ip,
  }
  if (msg.click_ids?.ttclid) {
    context.ad = { callback: msg.click_ids.ttclid }
  }

  const payload: Record<string, unknown> = {
    event_source: 'web',
    event_source_id: pixelId,
    data: [
      {
        event: tiktokEvent(msg.event_name),
        event_time: Math.floor(msg.occurred_at_ms / 1000),
        event_id: msg.event_id,
        user: msg.user_id ? { external_id: msg.user_id } : undefined,
        properties: Object.keys(properties).length > 0 ? properties : undefined,
        context,
      },
    ],
  }
  if (env.TIKTOK_TEST_EVENT_CODE?.trim()) {
    payload.test_event_code = env.TIKTOK_TEST_EVENT_CODE.trim()
  }

  try {
    const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': token,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12_000),
    })
    const text = await res.text().catch(() => '')
    if (res.status === 401 || res.status === 403) {
      return { vendor: 'tiktok', status: 'auth_error', httpStatus: res.status, body: text.slice(0, 400) }
    }
    if (!res.ok) {
      const transient = res.status >= 500 || res.status === 429
      return {
        vendor: 'tiktok',
        status: transient ? 'transient_error' : 'auth_error',
        httpStatus: res.status,
        body: text.slice(0, 400),
      }
    }
    return { vendor: 'tiktok', status: 'ok' }
  } catch (err: unknown) {
    return {
      vendor: 'tiktok',
      status: 'transient_error',
      body: err instanceof Error ? err.message : String(err),
    }
  }
}
