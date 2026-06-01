/**
 * useBondInvitation — create / fetch / accept a bond invitation.
 *
 * Backend endpoints:
 *   POST /api/bonds/invite              → A creates an invitation
 *   GET  /api/bonds/invite/:token/info  → B's landing page loads invite context
 *   POST /api/bonds/invite/:token/respond → B accepts (or declines)
 *
 * Each call returns a React Query–style result. Internally uses the
 * @zhop/hexastral-client RPC client wired via <YuanClientProvider>.
 *
 * Phase F: uses `unwrap()` to absorb the `{ ok, data, meta }` envelope and
 * surface server error codes via `error.code`.
 */

import { useCallback, useEffect, useState } from 'react'
import { useYuanClient } from '../context'
import { unwrap, yuanBonds } from '../lib/yuan-bonds-api'
import type {
  InvitationInfo,
  ResonanceInviteInput,
  ResonanceInviteResult,
  RespondInput,
  RespondResult,
} from '../types'

export interface UseBondInvitationResult {
  /** Loaded invitation context when `token` is provided */
  invitation: InvitationInfo | null
  isLoading: boolean
  error: Error | null
  /** A creates an invitation; resolves with the new invitation incl. token */
  create: (input: ResonanceInviteInput) => Promise<ResonanceInviteResult>
  /** B responds (accept or decline) */
  respond: (token: string, input: RespondInput) => Promise<RespondResult>
}

export function useBondInvitation(token?: string): UseBondInvitationResult {
  const { client, onError } = useYuanClient()
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(token != null)
  const [error, setError] = useState<Error | null>(null)

  // GET /api/bonds/invite/:token/info — fetched whenever token changes
  useEffect(() => {
    if (!token) {
      setInvitation(null)
      setIsLoading(false)
      return
    }
    let cancelled = false
    setIsLoading(true)
    setError(null)
    ;(async () => {
      try {
        const data = await unwrap<InvitationInfo>(
          await yuanBonds(client).invite[':token'].info.$get({ param: { token } })
        )
        if (!cancelled) {
          setInvitation(data)
          setIsLoading(false)
        }
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err))
        if (!cancelled) {
          setError(e)
          setIsLoading(false)
        }
        onError?.(e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, client, onError])

  // POST /api/bonds/invite — A creates an invitation
  const create = useCallback(
    async (input: ResonanceInviteInput): Promise<ResonanceInviteResult> => {
      return unwrap<ResonanceInviteResult>(await yuanBonds(client).invite.$post({ json: input }))
    },
    [client]
  )

  // POST /api/bonds/invite/:token/respond — B accepts (or declines)
  const respond = useCallback(
    async (tk: string, input: RespondInput): Promise<RespondResult> => {
      return unwrap<RespondResult>(
        await yuanBonds(client).invite[':token'].respond.$post({
          param: { token: tk },
          json: input,
        })
      )
    },
    [client]
  )

  return { invitation, isLoading, error, create, respond }
}
