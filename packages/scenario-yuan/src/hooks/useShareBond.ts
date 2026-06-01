/**
 * useShareBond — register a public share link for a bond reading.
 *
 * Backend: POST /api/bonds/:id/share
 *
 * The yuán-app uses this when the user taps "Share" on a chapter — the URL
 * gets stamped into the off-screen ShareableChapterCard before view-shot
 * captures it as a PNG.
 */

import { useCallback, useState } from 'react'
import { useYuanClient } from '../context'
import { unwrap, yuanBonds } from '../lib/yuan-bonds-api'

export interface BondShareResult {
  shareId: string
  url: string
}

export interface UseShareBondResult {
  isSharing: boolean
  error: Error | null
  createShareUrl: (bondId: string) => Promise<BondShareResult>
}

export function useShareBond(): UseShareBondResult {
  const { client, onError } = useYuanClient()
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createShareUrl = useCallback(
    async (bondId: string): Promise<BondShareResult> => {
      setIsSharing(true)
      setError(null)
      try {
        const data = await unwrap<BondShareResult>(
          await yuanBonds(client)[':id'].share.$post({ param: { id: bondId } })
        )
        setIsSharing(false)
        return data
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err))
        setError(e)
        setIsSharing(false)
        onError?.(e)
        throw e
      }
    },
    [client, onError]
  )

  return { isSharing, error, createShareUrl }
}
