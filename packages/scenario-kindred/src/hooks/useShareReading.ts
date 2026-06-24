/**
 * useShareReading — register a public share link for the PERSONAL 命书 (the solo
 * full reading), the sibling of useShareBond (which shares a 合盘).
 *
 * Backend: POST /api/share (the generic snapshot endpoint) with reportType
 * 'fate' (综合命书). The web /report/<shareId> page already renders the 'fate'
 * type, so the personal report gets a per-report landing for free; the returned
 * url is stamped into the off-screen ShareableReadingCard before view-shot
 * captures it as a PNG.
 *
 * The contentJson is a small snapshot (日主 · 格局 · a prose excerpt) so the
 * landing can show highlights + a teaser; the full report stays in the app.
 */

import { useCallback, useState } from 'react'
import { useKindredClient } from '../context'
import { unwrap } from '../lib/kindred-bonds-api'

export interface ReadingShareInput {
  /** The viewer's userId (the server overwrites it from auth, but the schema
   *  requires a non-empty value). */
  userId: string
  /** chartHash — traceability only (the report itself isn't stored here). */
  reportId: string
  /** Title hint shown on the landing tab + header (e.g. the 日主 label). */
  titleHint?: string
  /** 日主 essence (e.g. 甲木) — a landing highlight chip. */
  dayMaster?: string
  /** 格局 word — a landing highlight chip. */
  geju?: string
  /** A prose excerpt (the teaser) — the landing preview text. */
  interpretation?: string
}

export interface ReadingShareResult {
  shareId: string
  url: string
}

export interface UseShareReadingResult {
  isSharing: boolean
  error: Error | null
  createShareUrl: (input: ReadingShareInput) => Promise<ReadingShareResult>
}

type ShareCreateBody = {
  userId: string
  reportType: 'fate'
  reportId: string
  titleHint?: string
  contentJson: string
}

export function useShareReading(): UseShareReadingResult {
  const { client, onError } = useKindredClient()
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createShareUrl = useCallback(
    async (input: ReadingShareInput): Promise<ReadingShareResult> => {
      setIsSharing(true)
      setError(null)
      try {
        const contentJson = JSON.stringify({
          // Brand marker — lets the web /report/<shareId> page render the Yuel
          // 命书 landing for this 'fate' share (other apps' 'fate' shares stay
          // on the generic star-theme page).
          brand: 'yuel',
          ...(input.dayMaster ? { dayMaster: input.dayMaster } : {}),
          ...(input.geju ? { geju: input.geju } : {}),
          ...(input.interpretation ? { fullInterpretation: input.interpretation } : {}),
        })
        const api = client.api as unknown as {
          share: { $post: (opts: { json: ShareCreateBody }) => Promise<Response> }
        }
        const data = await unwrap<ReadingShareResult>(
          await api.share.$post({
            json: {
              userId: input.userId,
              reportType: 'fate',
              reportId: input.reportId,
              titleHint: input.titleHint,
              contentJson,
            },
          })
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
