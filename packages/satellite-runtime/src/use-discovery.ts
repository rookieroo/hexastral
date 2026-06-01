/**
 * Dynamic satellite→flagship funnel routing. Hits the anonymous
 * `/api/discovery/recommendations` endpoint so business can re-target a
 * satellite's upsell without an app rebuild. Cached in-memory per session;
 * callers should keep an offline fallback for the loading / failure case.
 */

import type { CrossAppDiscoveryTapEvent } from '@zhop/growth-funnel'
import { useEffect, useState } from 'react'
import { resolvePortfolioApiUrl } from './api-url'
import { ingestGrowthEvent } from './growth-ingest'
import { getOrCreateAnonymousInstallId } from './install-id'
import { freshEventEnvelope } from './new-event-envelope'

export interface DiscoveryRecommendation {
  /** Flagship key, e.g. 'yuan' | 'feng'. */
  target: string
  weight: number
}

interface DiscoveryResponse {
  recommendations: DiscoveryRecommendation[]
  configVersion: string
}

const sessionCache = new Map<string, DiscoveryRecommendation[]>()

export function useDiscoveryRecommendations(
  source: string,
  intent: string | null,
  locale: string
): { recommendations: DiscoveryRecommendation[]; loading: boolean } {
  const key = `${source}:${intent ?? '*'}:${locale}`
  const [recommendations, setRecommendations] = useState<DiscoveryRecommendation[]>(
    () => sessionCache.get(key) ?? []
  )
  const [loading, setLoading] = useState(() => !sessionCache.has(key))

  useEffect(() => {
    const cached = sessionCache.get(key)
    if (cached) {
      setRecommendations(cached)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const params = new URLSearchParams({ source, locale })
        if (intent) params.set('intent', intent)
        const url = `${resolvePortfolioApiUrl()}/api/discovery/recommendations?${params.toString()}`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`discovery_${res.status}`)
        const json = (await res.json()) as DiscoveryResponse
        if (cancelled) return
        sessionCache.set(key, json.recommendations)
        setRecommendations(json.recommendations)
      } catch {
        if (!cancelled) setRecommendations([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [key, source, intent, locale])

  return { recommendations, loading }
}

/**
 * Emit a `cross_app_discovery_tap` funnel event when the user acts on a
 * flagship upsell. Fire-and-forget; closes the satellite→flagship conversion
 * loop so the routing in `useDiscoveryRecommendations` can be measured/tuned.
 */
export async function emitCrossAppDiscoveryTap(opts: {
  storagePrefix: string
  sourceApp: string
  targetApp: string
  action: 'tap' | 'open_native' | 'fallback_app_store'
  via?: string
}): Promise<void> {
  const anonymousId = await getOrCreateAnonymousInstallId(opts.storagePrefix)
  const event: CrossAppDiscoveryTapEvent = {
    ...freshEventEnvelope({
      anonymousId,
      targetApp: opts.targetApp,
      surface: 'flagship_upsell',
    }),
    event_name: 'cross_app_discovery_tap',
    payload: {
      source_app: opts.sourceApp,
      target_app: opts.targetApp,
      action: opts.action,
      via: opts.via,
    },
  }
  await ingestGrowthEvent(resolvePortfolioApiUrl(), event)
}
