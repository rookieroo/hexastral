/**
 * monthly-depth — the shared contract + client for 本月深度 (the Pro LLM read that
 * deepens the deterministic `composeMonthlyFortune` card).
 *
 * The free card (monthly-fortune) is instant and offline; this layer fetches a deeper,
 * chart-grounded read from `POST /api/report/monthly`, which expands the card's own
 * deterministic atoms. The server caches one depth per user+month+chart; the client
 * caches it too (keyed by chart + month + locale), so the normal case is one generation
 * per month and revisits are instant.
 *
 * This module owns the *contract* (types), the request shape, the response
 * normalization, and the cache logic — everything both apps must agree on. The transport
 * (how a signed request is actually sent, and where it is cached) is INJECTED, so the
 * package stays free of any app's auth / config / storage. Yuel (kindred) and Yuun
 * (auspice) each call `createMonthlyDepthClient` with their own plumbing.
 */

export interface MonthlyDepth {
  title: string
  overview: string
  themes: { label: string; body: string }[]
  advice: string
  watchFor: string
  generatedAt: string
}

/** The grounding the server expands — the deterministic card's own atoms. */
export interface MonthlyDepthInput {
  monthKey: string
  monthLabel: string
  ganZhi: string
  element: string
  headline: string
  body: string
  /** The OPENING device's locale — the depth is generated + cached in THIS language,
   *  not the inviter's / the account's stored locale. */
  locale: string
}

export type MonthlyDepthResult =
  | { kind: 'ok'; depth: MonthlyDepth }
  | { kind: 'needs_pro' }
  | { kind: 'error' }

/** Minimal storage surface — satisfied by AsyncStorage. */
export interface MonthlyDepthStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
}

/** Minimal response surface — satisfied by a fetch `Response`. */
export interface MonthlyDepthResponse {
  status: number
  json(): Promise<unknown>
}

/** App-injected transport: signing, base URL, auth, timeout, and cache backend. */
export interface MonthlyDepthTransport {
  /**
   * POST a signed JSON request to `path` and resolve the raw response. Return `null`
   * when the caller is not authenticated or signing fails (mapped to `error`). Throwing
   * (network / abort) is also mapped to `error`.
   */
  post(path: string, body: string): Promise<MonthlyDepthResponse | null>
  storage: MonthlyDepthStorage
  /** Cache key prefix, e.g. `kindred_monthly_depth_`. Keep stable to preserve caches. */
  cachePrefix: string
  /** Endpoint path. Defaults to the kindred `/api/report/monthly`; Yuun passes its own
   *  auspice-gated `/api/auspice/monthly`. */
  endpoint?: string
}

export const MONTHLY_DEPTH_ENDPOINT = '/api/report/monthly'

const cacheKey = (prefix: string, chartHash: string, monthKey: string, locale: string) =>
  `${prefix}${chartHash}_${monthKey}_${locale}`

function isDepth(d: unknown): d is Omit<MonthlyDepth, 'generatedAt'> {
  if (!d || typeof d !== 'object') return false
  const o = d as Record<string, unknown>
  return (
    typeof o.title === 'string' &&
    typeof o.overview === 'string' &&
    Array.isArray(o.themes) &&
    typeof o.advice === 'string' &&
    typeof o.watchFor === 'string'
  )
}

/** Validate + normalize the `{ depth, generatedAt }` envelope into a `MonthlyDepth`, or null. */
export function normalizeMonthlyDepth(raw: unknown): MonthlyDepth | null {
  const json = (raw ?? {}) as { depth?: unknown; generatedAt?: string }
  const d = json.depth
  if (!isDepth(d)) return null
  return {
    ...d,
    themes: d.themes.filter(
      (t): t is { label: string; body: string } =>
        !!t && typeof t.label === 'string' && typeof t.body === 'string'
    ),
    generatedAt: json.generatedAt ?? new Date().toISOString(),
  }
}

/** The signed request body — the deterministic card's atoms + opening-device locale. */
export function monthlyDepthRequestBody(input: MonthlyDepthInput): string {
  return JSON.stringify({
    monthKey: input.monthKey,
    monthLabel: input.monthLabel,
    ganZhi: input.ganZhi,
    element: input.element,
    headline: input.headline,
    body: input.body,
    locale: input.locale,
  })
}

export interface MonthlyDepthClient {
  /** Cached depth for this chart + month + locale, or null. Paints instantly on revisit. */
  getCachedMonthlyDepth(
    chartHash: string,
    monthKey: string,
    locale: string
  ): Promise<MonthlyDepth | null>
  /**
   * Fetch (or cache-hit) the monthly depth. `needs_pro` maps the 402 gate to a paywall;
   * `error` covers signed-out / network / bad-shape so the caller keeps the free card.
   * On success the depth is cached per chart + month + locale.
   */
  fetchMonthlyDepth(chartHash: string, input: MonthlyDepthInput): Promise<MonthlyDepthResult>
}

export function createMonthlyDepthClient(t: MonthlyDepthTransport): MonthlyDepthClient {
  async function getCachedMonthlyDepth(
    chartHash: string,
    monthKey: string,
    locale: string
  ): Promise<MonthlyDepth | null> {
    try {
      const raw = await t.storage.getItem(cacheKey(t.cachePrefix, chartHash, monthKey, locale))
      return raw ? (JSON.parse(raw) as MonthlyDepth) : null
    } catch {
      return null
    }
  }

  async function fetchMonthlyDepth(
    chartHash: string,
    input: MonthlyDepthInput
  ): Promise<MonthlyDepthResult> {
    const cached = await getCachedMonthlyDepth(chartHash, input.monthKey, input.locale)
    if (cached) return { kind: 'ok', depth: cached }

    let res: MonthlyDepthResponse | null
    try {
      res = await t.post(t.endpoint ?? MONTHLY_DEPTH_ENDPOINT, monthlyDepthRequestBody(input))
    } catch {
      return { kind: 'error' }
    }
    if (!res) return { kind: 'error' }
    if (res.status === 402) return { kind: 'needs_pro' }
    if (res.status < 200 || res.status >= 300) return { kind: 'error' }

    let json: unknown
    try {
      json = await res.json()
    } catch {
      return { kind: 'error' }
    }
    const depth = normalizeMonthlyDepth(json)
    if (!depth) return { kind: 'error' }

    try {
      await t.storage.setItem(
        cacheKey(t.cachePrefix, chartHash, input.monthKey, input.locale),
        JSON.stringify(depth)
      )
    } catch {}
    return { kind: 'ok', depth }
  }

  return { getCachedMonthlyDepth, fetchMonthlyDepth }
}
