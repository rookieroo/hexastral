/**
 * useSoloBond — A creates a one-sided synastry reading.
 *
 * Backend: POST /api/bonds/solo
 *
 * Used by Yuán's onboarding "fill in for the other person" path (when B isn't
 * available to invite — public figure, late relative, undisclosed partner).
 *
 * Phase F: uses `unwrap()` to absorb the `{ ok, data, meta }` envelope and
 * surface server error codes (`paywall_required`, `missing_required`, etc.)
 * via `error.code`.
 */

import { useCallback, useState } from 'react'
import { useYuanClient } from '../context'
import { unwrap, yuanBonds } from '../lib/yuan-bonds-api'
import type { SoloCreateInput, SoloCreateResult } from '../types'

export interface UseSoloBondResult {
  isLoading: boolean
  error: Error | null
  /** Resolves with the newly-created bond detail. */
  create: (input: SoloCreateInput) => Promise<SoloCreateResult>
}

export function useSoloBond(): UseSoloBondResult {
  const { client, onError } = useYuanClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const create = useCallback(
    async (input: SoloCreateInput): Promise<SoloCreateResult> => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await unwrap<SoloCreateResult>(
          await yuanBonds(client).solo.$post({ json: input })
        )
        setIsLoading(false)
        return data
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err))
        setError(e)
        setIsLoading(false)
        onError?.(e)
        throw e
      }
    },
    [client, onError]
  )

  return { isLoading, error, create }
}
