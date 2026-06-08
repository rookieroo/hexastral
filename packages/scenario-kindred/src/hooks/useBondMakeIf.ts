/**
 * useBondMakeIf — relationship decision support (Workstream B make-if).
 *
 * Lazily runs POST /api/bonds/:id/makeif (on demand, not on mount): ranks the
 * bond's forward 流月 windows by 用神 alignment + 冲/合 and returns a deterministic
 * verdict. Forward-only framing (never past rumination). Pro-gated — the server
 * is authoritative: non-Pro comes back `{ pro: false, upsell }` with no windows.
 */

import { useCallback, useState } from 'react'
import { useKindredClient } from '../context'
import { kindredBonds, unwrap } from '../lib/kindred-bonds-api'
import type { RelMakeIfResponse } from '../types'

export interface UseBondMakeIfResult {
  data: RelMakeIfResponse | null
  isLoading: boolean
  error: Error | null
  /** Run the推演 for `bondId`. Returns the result, or null on failure. */
  run: (bondId: string) => Promise<RelMakeIfResponse | null>
}

export function useBondMakeIf(): UseBondMakeIfResult {
  const { client, onError } = useKindredClient()
  const [data, setData] = useState<RelMakeIfResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const run = useCallback(
    async (bondId: string): Promise<RelMakeIfResponse | null> => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await unwrap<RelMakeIfResponse>(
          await kindredBonds(client)[':id'].makeif.$post({ param: { id: bondId } })
        )
        setData(res)
        return res
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err))
        setError(e)
        onError?.(e)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [client, onError]
  )

  return { data, isLoading, error, run }
}
