import type { AdConvertMessage, Env, VendorResult } from '../types'

function redditEventType(name: AdConvertMessage['event_name']): string {
  switch (name) {
    case 'Purchase':
      return 'Purchase'
    case 'Subscribe':
      return 'Subscribe'
    case 'CompleteRegistration':
      return 'SignUp'
    case 'Lead':
      return 'Lead'
    case 'ViewContent':
      return 'ViewContent'
    default:
      return 'PageVisit'
  }
}

export async function sendReddit(env: Env, msg: AdConvertMessage): Promise<VendorResult> {
  const pixelId = env.REDDIT_PIXEL_ID?.trim()
  const token = env.REDDIT_CONVERSIONS_TOKEN?.trim()
  if (!pixelId && !token) {
    return { vendor: 'reddit', status: 'skipped', reason: 'not_configured' }
  }
  if (!pixelId || !token) {
    return {
      vendor: 'reddit',
      status: 'config_error',
      reason: 'REDDIT_PIXEL_ID or REDDIT_CONVERSIONS_TOKEN missing while partial set',
    }
  }

  const event: Record<string, unknown> = {
    event_at: Math.floor(msg.occurred_at_ms / 1000),
    event_type: { tracking_type: redditEventType(msg.event_name) },
    event_metadata: {
      conversion_id: msg.event_id,
      ...(msg.value != null
        ? {
            value_decimal: msg.value,
            currency: msg.currency ?? 'USD',
          }
        : {}),
      item_count: 1,
    },
    click_id: msg.click_ids?.rdt_cid,
  }

  try {
    const res = await fetch(`https://ads-api.reddit.com/api/v2.0/conversions/events/${pixelId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ events: [event] }),
      signal: AbortSignal.timeout(12_000),
    })
    const text = await res.text().catch(() => '')
    if (res.status === 401 || res.status === 403) {
      return { vendor: 'reddit', status: 'auth_error', httpStatus: res.status, body: text.slice(0, 400) }
    }
    if (!res.ok) {
      const transient = res.status >= 500 || res.status === 429
      return {
        vendor: 'reddit',
        status: transient ? 'transient_error' : 'auth_error',
        httpStatus: res.status,
        body: text.slice(0, 400),
      }
    }
    return { vendor: 'reddit', status: 'ok' }
  } catch (err: unknown) {
    return {
      vendor: 'reddit',
      status: 'transient_error',
      body: err instanceof Error ? err.message : String(err),
    }
  }
}
