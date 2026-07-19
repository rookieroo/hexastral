/**
 * Unified service binding clients for hexastral-api
 *
 * Each client wraps the corresponding SVC_* Cloudflare Service Binding with:
 *   - AbortSignal.timeout() to prevent hung requests
 *   - Structured ServiceError propagation (preserves upstream status codes)
 *   - Typed request/response helpers
 *
 * Usage:
 *   import { astroClient } from '../lib/service-clients'
 *   const result = await astroClient.post(c.env.SVC_ASTRO, '/stellar/chart', payload)
 */

import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { alertAdmin } from './admin-alert'

type Fetcher = { fetch(input: RequestInfo, init?: RequestInit): Promise<Response> }

/** SVC_ADMIN_NOTIFY fetcher — injected once, used by servicePost/serviceGet for auto-alerting */
let _adminNotify: Fetcher | undefined

/** Call once in middleware or app startup to enable automatic service-error alerting */
export function setAdminNotifyFetcher(svc: Fetcher): void {
  _adminNotify = svc
}

const TIMEOUTS = {
  /** Chart / text LLM calls */
  astro: 30_000,
  /**
   * Gemini Vision structured extract (face/palm). Photos + thinkingLevel can
   * exceed 30s; hexastral-api allows cpu_ms 300000 so this is safe.
   */
  astroVision: 120_000,
  geocode: 10_000,
  notify: 10_000,
  mailer: 15_000,
} as const

async function servicePost<T>(
  svc: Fetcher,
  host: string,
  path: string,
  body: unknown,
  timeoutMs: number
): Promise<T> {
  let res: Response
  try {
    res = await svc.fetch(
      new Request(`https://${host}.internal${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      })
    )
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError'
    if (_adminNotify) {
      alertAdmin(_adminNotify, {
        title: 'Service binding timeout',
        message: `POST ${host}${path} timed out after ${timeoutMs}ms`,
        level: 'error',
        context: { service: host, path, timeoutMs: String(timeoutMs) },
      }).catch(() => {})
    }
    throw new HTTPException(504, {
      message: `${host} ${path} ${isTimeout ? 'timed out' : 'unreachable'}`,
    })
  }
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    if (res.status >= 500 && _adminNotify) {
      alertAdmin(_adminNotify, {
        title: 'Service binding error',
        message: `POST ${host}${path} returned ${res.status}`,
        level: 'error',
        context: { service: host, path, status: String(res.status), response: text.slice(0, 200) },
      }).catch(() => {})
    }
    throw new HTTPException(res.status as ContentfulStatusCode, {
      message: `${host} ${path} failed: ${text}`,
    })
  }
  return res.json() as Promise<T>
}

async function serviceGet<T>(
  svc: Fetcher,
  host: string,
  path: string,
  timeoutMs: number
): Promise<T> {
  let res: Response
  try {
    res = await svc.fetch(
      new Request(`https://${host}.internal${path}`, {
        signal: AbortSignal.timeout(timeoutMs),
      })
    )
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError'
    if (_adminNotify) {
      alertAdmin(_adminNotify, {
        title: 'Service binding timeout',
        message: `GET ${host}${path} timed out after ${timeoutMs}ms`,
        level: 'error',
        context: { service: host, path, timeoutMs: String(timeoutMs) },
      }).catch(() => {})
    }
    throw new HTTPException(504, {
      message: `${host} ${path} ${isTimeout ? 'timed out' : 'unreachable'}`,
    })
  }
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    if (res.status >= 500 && _adminNotify) {
      alertAdmin(_adminNotify, {
        title: 'Service binding error',
        message: `GET ${host}${path} returned ${res.status}`,
        level: 'error',
        context: { service: host, path, status: String(res.status), response: text.slice(0, 200) },
      }).catch(() => {})
    }
    throw new HTTPException(res.status as ContentfulStatusCode, {
      message: `${host} ${path} failed: ${text}`,
    })
  }
  return res.json() as Promise<T>
}

// ── svc-astro ─────────────────────────────────────────────────────────────

export const astroClient = {
  post<T = unknown>(svc: Fetcher, path: string, body: unknown): Promise<T> {
    return servicePost<T>(svc, 'svc-astro', path, body, TIMEOUTS.astro)
  },
  /** Face/palm VLM extract — longer timeout than chart calls. */
  postVision<T = unknown>(svc: Fetcher, path: string, body: unknown): Promise<T> {
    return servicePost<T>(svc, 'svc-astro', path, body, TIMEOUTS.astroVision)
  },
  get<T = unknown>(svc: Fetcher, path: string): Promise<T> {
    return serviceGet<T>(svc, 'svc-astro', path, TIMEOUTS.astro)
  },
}

// ── svc-geocode ───────────────────────────────────────────────────────────

export const geocodeClient = {
  post<T = unknown>(svc: Fetcher, path: string, body: unknown): Promise<T> {
    return servicePost<T>(svc, 'svc-geocode', path, body, TIMEOUTS.geocode)
  },
  get<T = unknown>(svc: Fetcher, path: string): Promise<T> {
    return serviceGet<T>(svc, 'svc-geocode', path, TIMEOUTS.geocode)
  },
}

// ── svc-notify ────────────────────────────────────────────────────────────

export const notifyClient = {
  post<T = unknown>(svc: Fetcher, path: string, body: unknown): Promise<T> {
    return servicePost<T>(svc, 'svc-notify', path, body, TIMEOUTS.notify)
  },
  get<T = unknown>(svc: Fetcher, path: string): Promise<T> {
    return serviceGet<T>(svc, 'svc-notify', path, TIMEOUTS.notify)
  },
}

// ── svc-mailer ────────────────────────────────────────────────────────────

export const mailerClient = {
  post<T = unknown>(svc: Fetcher, path: string, body: unknown): Promise<T> {
    return servicePost<T>(svc, 'svc-mailer', path, body, TIMEOUTS.mailer)
  },
}
