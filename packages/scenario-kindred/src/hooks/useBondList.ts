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
import type { BondData, RelationshipType } from '../types'

export interface UseBondListOptions {
  /** Filter by relationship type label (client-side) */
  relationshipType?: RelationshipType
  /** Only bonds that have a generated reading */
  withReadingOnly?: boolean
}

export interface UseBondListResult {
  bonds: BondData[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  /** Soft-delete a bond. Removes it from the list optimistically and rolls
   *  back (re-inserting it) if the server call fails. */
  deleteBond: (id: string) => Promise<void>
  /** Re-run a bond's reading with the viewer's current birth (Pro, destructive).
   *  Refetches on success. 'needs_pro' → route to the paywall. */
  recompute: (id: string) => Promise<'recomputed' | 'needs_pro' | 'error'>
}

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
  const [allBonds, setAllBonds] = useState<BondData[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await unwrap<{ bonds: BondData[] }>(await kindredBonds(client).$get())
      setAllBonds(data.bonds)
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

  const deleteBond = useCallback(
    async (id: string) => {
      // Optimistic — drop it now; the server soft-deletes (status 'removed')
      // and the next fetch already filters it. Roll back on failure.
      const snapshot = allBonds
      setAllBonds((prev) => prev.filter((b) => b.id !== id))
      try {
        await unwrap<{ id: string; status: string }>(
          await kindredBonds(client)[':id'].$delete({ param: { id } })
        )
      } catch (err) {
        setAllBonds(snapshot)
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

  return { bonds: filtered, isLoading, error, refetch, deleteBond, recompute }
}
