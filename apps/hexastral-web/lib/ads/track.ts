'use client'

import {
  mergeClickIdsForDdl,
  mergeUtmForDdl,
  readPersistedClickIds,
} from '@zhop/ddl-client'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.hexastral.com'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    ttq?: { track: (name: string, props?: Record<string, unknown>) => void; page: () => void }
    gtag?: (...args: unknown[]) => void
    rdt?: (...args: unknown[]) => void
  }
}

export function newAdEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

/** Fire browser pixels with a shared event_id for CAPI dedupe. */
export function trackBrowserConversion(opts: {
  eventName: 'PageView' | 'Lead' | 'Purchase' | 'Subscribe' | 'ViewContent' | 'CompleteRegistration'
  eventId: string
}): void {
  if (typeof window === 'undefined') return
  const { eventName, eventId } = opts

  try {
    if (typeof window.fbq === 'function') {
      window.fbq('track', eventName === 'Lead' ? 'Lead' : eventName, {}, { eventID: eventId })
    }
  } catch (err) {
    console.warn('[ads] meta pixel', err)
  }

  try {
    if (window.ttq?.track) {
      const ttName =
        eventName === 'Lead'
          ? 'ClickButton'
          : eventName === 'Purchase'
            ? 'CompletePayment'
            : eventName === 'PageView'
              ? 'Pageview'
              : eventName
      window.ttq.track(ttName, { event_id: eventId })
    }
  } catch (err) {
    console.warn('[ads] tiktok pixel', err)
  }

  try {
    if (typeof window.gtag === 'function') {
      const gaName =
        eventName === 'Lead'
          ? 'generate_lead'
          : eventName === 'Purchase'
            ? 'purchase'
            : eventName === 'PageView'
              ? 'page_view'
              : eventName.toLowerCase()
      window.gtag('event', gaName, { transaction_id: eventId, event_id: eventId })
    }
  } catch (err) {
    console.warn('[ads] gtag', err)
  }

  try {
    if (typeof window.rdt === 'function') {
      window.rdt('track', eventName === 'PageView' ? 'PageVisit' : eventName, {
        conversionId: eventId,
      })
    }
  } catch (err) {
    console.warn('[ads] reddit pixel', err)
  }
}

/** Enqueue server-side postback (same event_id as pixel). */
export async function enqueueAdConvertClient(opts: {
  eventName: 'PageView' | 'Lead' | 'Purchase' | 'Subscribe' | 'ViewContent' | 'CompleteRegistration'
  eventId: string
  targetApp?: string
}): Promise<void> {
  if (typeof window === 'undefined') return
  const search = new URLSearchParams(window.location.search)
  const body = {
    event_id: opts.eventId,
    event_name: opts.eventName,
    occurred_at_ms: Date.now(),
    action_source: 'website' as const,
    target_app: opts.targetApp,
    click_ids: {
      ...readPersistedClickIds(),
      ...mergeClickIdsForDdl(search),
    },
    utm: mergeUtmForDdl(search),
    client_user_agent: navigator.userAgent,
  }

  try {
    const res = await fetch(`${API_BASE}/api/growth/ad-convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    })
    if (!res.ok) {
      console.warn('[ads] ad-convert enqueue', res.status)
    }
  } catch (err) {
    console.warn('[ads] ad-convert enqueue failed', err)
  }
}
