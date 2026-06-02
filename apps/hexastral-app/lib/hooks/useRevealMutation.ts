/**
 * useRevealMutation — onboarding AI reveal (one-time per user).
 *
 * Called from the post-auth onboarding step. Server is idempotent per
 * (userId, today) — repeated calls return the existing first signal row
 * rather than re-billing the LLM.
 *
 * On success, busts the today-signal cache so the Fate tab immediately shows
 * the freshly persisted row (no second network call).
 */
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { type SignalContent, useInvalidateSignal } from './useSignalQuery'

export interface RevealArgs {
  /** BCP-47 locale; defaults to user's stored preference server-side. */
  locale?: string
  /** 'term' = jargon-first, 'plain' = everyday speech. Default: plain. */
  explanationMode?: 'term' | 'plain'
}

export interface RevealResult {
  signalId: string
  date: string
  content: SignalContent
  model: string
  promptVersion: string
}

interface ApiSuccess<T> {
  ok: true
  data: T
}
interface ApiError {
  ok: false
  error: { code: string; message: string; details?: Record<string, unknown> }
}

async function postReveal(args: RevealArgs): Promise<RevealResult> {
  const res = await apiClient.api.onboarding.reveal.$post({
    json: {
      explanationMode: args.explanationMode ?? 'plain',
      ...(args.locale ? { locale: args.locale } : {}),
    },
  })
  if (!res.ok) throw new Error(`onboarding/reveal failed: ${res.status}`)
  const json = (await res.json()) as ApiSuccess<RevealResult> | ApiError
  if (!json.ok) {
    const err = new Error(json.error.message) as Error & { code?: string }
    err.code = json.error.code
    throw err
  }
  return json.data
}

export function useRevealMutation(userId: string | null | undefined) {
  const invalidateSignal = useInvalidateSignal()
  return useMutation<RevealResult, Error, RevealArgs>({
    mutationFn: postReveal,
    onSuccess: () => {
      if (userId) invalidateSignal(userId)
    },
  })
}
