/**
 * useBondsTimeline — the ego-centric multi-bond relationship timeline (ADR-0014).
 *
 * Backend:
 *   GET  /api/bonds/timeline           — merged, privacy-projected nodes + Pro push timetable
 *   POST /api/bonds/timeline/explain   — deep-explain one node (bondId-keyed; D2-safe)
 *
 * Free tier = current year + all (≤3) bonds, no push. Pro (kindred_pro /
 * universe_pro) = +15y look-ahead + the `notifications` timetable (the moat).
 * The server is authoritative on the gate; `pro`/`upsell` come straight back.
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
  /** 流月 living layer — near-term months. Free = current month; Pro = 12. */
  liuyue: BondsTimelineNode[]
  /** Pro-only local-push timetable; empty for free tier. */
  notifications: BondsTimelineNotification[]
  /** True iff kindred_pro / universe_pro (server-authoritative). */
  pro: boolean
  upsell: BondsTimelineResponse['upsell']
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  /** Deep-explain a node. Returns the result, or null on failure. */
  explainNode: (input: BondsTimelineExplainInput) => Promise<BondsTimelineExplainResult | null>
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

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await unwrap<BondsTimelineResponse>(await kindredBonds(client).timeline.$get())
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
  }, [client, onError])

  useEffect(() => {
    void refetch()
  }, [refetch])

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

  return { nodes, liuyue, notifications, pro, upsell, isLoading, error, refetch, explainNode }
}
