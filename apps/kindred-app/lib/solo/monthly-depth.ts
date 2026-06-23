/**
 * 流年深读 (monthly LLM depth) — the Pro enrichment of the deterministic 本月运势 card.
 *
 * The free card (composeMonthlyFortune) gives the month's tone + 十神 framing instantly
 * and offline. For Pro, this fetches a deeper, chart-grounded monthly read from the API
 * (POST /api/report/monthly), which expands that same deterministic grounding. The server
 * caches one depth per user+month+chart; the client also caches it in AsyncStorage keyed by
 * month + chartHash, so the normal case is one generation per month and revisits are instant.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { config } from '../config'
import { signRequest } from '../hmac'

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

const cacheKey = (chartHash: string, monthKey: string, locale: string) =>
  `kindred_monthly_depth_${chartHash}_${monthKey}_${locale}`

async function getUserId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('yuan_user_id')
  } catch {
    return null
  }
}

/** Cached depth for this chart + month + locale, or null. Paints instantly on revisit. */
export async function getCachedMonthlyDepth(
  chartHash: string,
  monthKey: string,
  locale: string
): Promise<MonthlyDepth | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(chartHash, monthKey, locale))
    return raw ? (JSON.parse(raw) as MonthlyDepth) : null
  } catch {
    return null
  }
}

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

/**
 * Fetch (or cache-hit) the monthly depth for the current chart. `needs_pro` maps the
 * 402 gate to a paywall; `error` covers signed-out / network / bad-shape so the caller
 * keeps the free deterministic card. On success the depth is cached per month + chart.
 */
export async function fetchMonthlyDepth(
  chartHash: string,
  input: MonthlyDepthInput
): Promise<MonthlyDepthResult> {
  const cached = await getCachedMonthlyDepth(chartHash, input.monthKey, input.locale)
  if (cached) return { kind: 'ok', depth: cached }

  const userId = await getUserId()
  if (!userId) return { kind: 'error' }

  const path = '/api/report/monthly'
  const requestBody = JSON.stringify({
    monthKey: input.monthKey,
    monthLabel: input.monthLabel,
    ganZhi: input.ganZhi,
    element: input.element,
    headline: input.headline,
    body: input.body,
    locale: input.locale,
  })
  const signed = await signRequest({ body: requestBody, userId, method: 'POST', path })
  if (!signed) return { kind: 'error' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 60_000)
  try {
    const res = await fetch(`${config.apiUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userId}`,
        ...signed,
      },
      body: requestBody,
      signal: controller.signal,
    })
    if (res.status === 402) return { kind: 'needs_pro' }
    if (!res.ok) return { kind: 'error' }
    const json = (await res.json()) as { depth?: unknown; generatedAt?: string }
    if (!isDepth(json.depth)) return { kind: 'error' }
    const depth: MonthlyDepth = {
      ...json.depth,
      themes: json.depth.themes.filter(
        (t): t is { label: string; body: string } =>
          !!t && typeof t.label === 'string' && typeof t.body === 'string'
      ),
      generatedAt: json.generatedAt ?? new Date().toISOString(),
    }
    try {
      await AsyncStorage.setItem(
        cacheKey(chartHash, input.monthKey, input.locale),
        JSON.stringify(depth)
      )
    } catch {}
    return { kind: 'ok', depth }
  } catch {
    return { kind: 'error' }
  } finally {
    clearTimeout(timer)
  }
}
