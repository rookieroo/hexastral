/**
 * useBondList — list the current user's bonds with optional filtering.
 *
 * Backend endpoint:
 *   GET /api/bonds
 *
 * Returns React Query–style result; supports filtering client-side by
 * `relationshipType` and `withReadingOnly`. For large bond counts the filter
 * should move to a server-side query param; v0 keeps it local.
 */

import { useCallback, useEffect, useState } from 'react'
import { useKindredClient } from '../context'
import { kindredBonds, unwrap } from '../lib/kindred-bonds-api'
import type { BondData, BondQuota, RelationshipType } from '../types'

export interface UseBondListOptions {
  /** Filter by relationship type label (client-side) */
  relationshipType?: RelationshipType
  /** Only bonds that have a generated reading */
  withReadingOnly?: boolean
}

export interface UseBondListResult {
  bonds: BondData[]
  /** True ONLY on the first-ever load (no cache yet) — drives the full-screen
   *  loader. A background/focus refresh over cached data does NOT set this. */
  isLoading: boolean
  /** True during a background or pull-to-refresh refetch when a cache already
   *  exists — drives the pull-to-refresh spinner, never the full-screen loader. */
  isRefreshing: boolean
  error: Error | null
  /** Refetch the list. `{ silent: true }` revalidates in the background with no
   *  spinner (used on focus); a bare call shows the pull-to-refresh spinner. */
  refetch: (opts?: { silent?: boolean }) => Promise<void>
  /** Soft-delete a bond. Removes it from the list optimistically and rolls
   *  back (re-inserting it) if the server call fails. */
  deleteBond: (id: string) => Promise<void>
  /** Re-run a bond's reading with the viewer's current birth (Pro, destructive).
   *  Refetches on success. 'needs_pro' → route to the paywall. */
  recompute: (id: string) => Promise<'recomputed' | 'needs_pro' | 'error'>
  /** Free-bond quota (Pro flag + used/limit). undefined until the first fetch
   *  resolves; surfaced for display only. */
  quota?: BondQuota
}

// Module-level session cache so returning to the list shows it INSTANTLY (no
// loader) across re-mounts; we then revalidate silently in the background. Pull
// to refresh for a manual, visible refresh.
let cachedBonds: BondData[] | null = null
let cachedQuota: BondQuota | undefined

const RELATIONSHIP_LABEL_BY_TYPE: Record<RelationshipType, ReadonlyArray<string>> = {
  romantic: ['恋人', '伴侣', 'partner', 'romantic'],
  family: ['家人', 'family'],
  parent: ['父母', '长辈', '長輩', '目上', 'parent', 'elder'],
  child: ['子女', '晚辈', '晚輩', '目下', 'child', 'junior'],
  sibling: ['兄弟', '姐妹', '姊妹', '兄弟姉妹', '平辈', 'sibling', 'peer'],
  friend: ['朋友', 'friend'],
  boss: ['上司', '老板', '领导', 'boss', 'manager'],
  colleague: ['同事', '同僚', 'colleague', 'coworker'],
  partner: ['合伙人', '商业伙伴', 'business partner', 'cofounder'],
  other: [],
}

function matchesRelationshipType(label: string, type: RelationshipType): boolean {
  if (type === 'other') return true // fall-through; caller can refine
  const synonyms = RELATIONSHIP_LABEL_BY_TYPE[type]
  const lower = label.toLowerCase()
  return synonyms.some((s) => lower.includes(s.toLowerCase()))
}

export function useBondList(options: UseBondListOptions = {}): UseBondListResult {
  const { client, onError } = useKindredClient()
  // Seed from the session cache so a re-mount paints the last list immediately.
  const [allBonds, setAllBonds] = useState<BondData[]>(cachedBonds ?? [])
  const [isLoading, setIsLoading] = useState<boolean>(cachedBonds === null)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const [quota, setQuota] = useState<BondQuota | undefined>(cachedQuota)

  const refetch = useCallback(async (opts?: { silent?: boolean }) => {
    // First-ever load → full-screen loader. A manual pull → the refresh spinner.
    // A silent (focus) revalidation shows nothing — the cached list just updates.
    if (cachedBonds === null) setIsLoading(true)
    else if (!opts?.silent) setIsRefreshing(true)
    setError(null)
    try {
      const data = await unwrap<{ bonds: BondData[]; quota?: BondQuota }>(
        await kindredBonds(client).$get()
      )
      setAllBonds(data.bonds)
      setQuota(data.quota)
      cachedBonds = data.bonds
      cachedQuota = data.quota
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      onError?.(e)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [client, onError])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const deleteBond = useCallback(
    async (id: string) => {
      // Optimistic — drop it now; the server soft-deletes (status 'removed')
      // and the next fetch already filters it. Roll back on failure.
      const snapshot = allBonds
      setAllBonds((prev) => {
        const next = prev.filter((b) => b.id !== id)
        cachedBonds = next // keep the session cache in sync so a re-mount agrees
        return next
      })
      try {
        await unwrap<{ id: string; status: string }>(
          await kindredBonds(client)[':id'].$delete({ param: { id } })
        )
      } catch (err) {
        setAllBonds(snapshot)
        cachedBonds = snapshot // roll the cache back too
        const e = err instanceof Error ? err : new Error(String(err))
        onError?.(e)
        throw e
      }
    },
    [client, onError, allBonds]
  )

  const recompute = useCallback(
    async (id: string): Promise<'recomputed' | 'needs_pro' | 'error'> => {
      try {
        const res = await kindredBonds(client)[':id'].recompute.$post({ param: { id } })
        if (res.status === 403) return 'needs_pro'
        if (!res.ok) return 'error'
        await refetch()
        return 'recomputed'
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)))
        return 'error'
      }
    },
    [client, refetch, onError]
  )

  const filtered = allBonds.filter((b) => {
    if (options.withReadingOnly && !b.hehunReadingId) return false
    if (
      options.relationshipType &&
      !matchesRelationshipType(b.relationshipLabel, options.relationshipType)
    ) {
      return false
    }
    return true
  })

  return { bonds: filtered, isLoading, isRefreshing, error, refetch, deleteBond, recompute, quota }
}
