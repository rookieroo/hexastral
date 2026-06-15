/**
 * useBondsTimeline — the ego-centric multi-bond relationship timeline (ADR-0014).
 *
 * Backend:
 *   GET  /api/bonds/timeline           — merged, privacy-projected nodes + Pro push timetable
 *   POST /api/bonds/timeline/explain   — deep-explain one node (bondId-keyed; D2-safe)
 *
 * Gate (2026-06): the timeline is a subscription wall, symmetric with what-if.
 * Free tier = no nodes (the server early-returns `{ pro:false, upsell }`); Pro
 * (kindred_pro / universe_pro) = the full +15y axis, 12-month 流月, and the
 * `notifications` push timetable (the moat). Server is authoritative on the gate;
 * `pro`/`upsell` come straight back.
 */

import { useCallback, useEffect, useState } from 'react'
import { useKindredClient } from '../context'
import { kindredBonds, unwrap } from '../lib/kindred-bonds-api'
import type {
  BondsTimelineExplainInput,
  BondsTimelineExplainResult,
  BondsTimelineNode,
  BondsTimelineNotification,
  BondsTimelineResponse,
} from '../types'

export interface UseBondsTimelineResult {
  nodes: BondsTimelineNode[]
  /** 流月 living layer — near-term months. Free = none (wall); Pro = 12. */
  liuyue: BondsTimelineNode[]
  /** Pro-only local-push timetable; empty for free tier. */
  notifications: BondsTimelineNotification[]
  /** True iff kindred_pro / universe_pro (server-authoritative). */
  pro: boolean
  upsell: BondsTimelineResponse['upsell']
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  /** True once the viewer opened the hidden beyond-10y horizon. */
  far: boolean
  /** Open the beyond-10y horizon (Pro) — refetches the axis with `horizon=far`. */
  loadFurther: () => void
  /** Deep-explain a node. Returns the result, or null on failure. */
  explainNode: (input: BondsTimelineExplainInput) => Promise<BondsTimelineExplainResult | null>
}

/** Reject if `p` hasn't settled within `ms` — so a stalled request surfaces as a
 *  retryable error instead of an endless loading state. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Request timed out')), ms)
    p.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      }
    )
  })
}

export function useBondsTimeline(): UseBondsTimelineResult {
  const { client, onError } = useKindredClient()
  const [nodes, setNodes] = useState<BondsTimelineNode[]>([])
  const [liuyue, setLiuyue] = useState<BondsTimelineNode[]>([])
  const [notifications, setNotifications] = useState<BondsTimelineNotification[]>([])
  const [pro, setPro] = useState<boolean>(false)
  const [upsell, setUpsell] = useState<BondsTimelineResponse['upsell']>(undefined)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  // Default axis is 10y; `loadFurther` flips this and the effect refetches the
  // beyond-10y view (Pro hidden door). Stays on once opened for the session.
  const [far, setFar] = useState<boolean>(false)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Bound the request so a stalled response can never leave the screen on its
      // loader forever (the "一直 loading" bug). The server early-returns for free
      // users now, so this mainly guards the Pro axis / a flaky network — on
      // timeout we surface an error with Retry instead of an endless spinner.
      const data = await withTimeout(
        (async () =>
          unwrap<BondsTimelineResponse>(
            await kindredBonds(client).timeline.$get(
              far ? { query: { horizon: 'far' } } : undefined
            )
          ))(),
        20_000
      )
      setNodes(data.nodes)
      setLiuyue(data.liuyue ?? [])
      setNotifications(data.notifications)
      setPro(data.pro)
      setUpsell(data.upsell)
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      onError?.(e)
    } finally {
      setIsLoading(false)
    }
  }, [client, onError, far])

  useEffect(() => {
    void refetch()
  }, [refetch])

  // Flipping `far` changes refetch's identity → the effect above refetches with
  // the beyond-10y horizon. One-way for the session (no need to collapse back).
  const loadFurther = useCallback(() => setFar(true), [])

  const explainNode = useCallback(
    async (input: BondsTimelineExplainInput): Promise<BondsTimelineExplainResult | null> => {
      try {
        return await unwrap<BondsTimelineExplainResult>(
          await kindredBonds(client).timeline.explain.$post({ json: input })
        )
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)))
        return null
      }
    },
    [client, onError]
  )

  return {
    nodes,
    liuyue,
    notifications,
    pro,
    upsell,
    isLoading,
    error,
    refetch,
    far,
    loadFurther,
    explainNode,
  }
}
