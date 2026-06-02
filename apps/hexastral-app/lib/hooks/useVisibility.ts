import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { config } from '@/lib/config'
import { signRequest } from '@/lib/hmac'

export interface PublicVisibility {
  signature: boolean
  bazi: boolean
  ziwei: boolean
  basic: boolean
  plainIntro: boolean
}

interface VisibilityResponse {
  chartPublic: boolean
  visibility: PublicVisibility
}

const QUERY_KEY = (userId: string) => ['user-visibility', userId] as const

async function fetchVisibility(userId: string): Promise<VisibilityResponse> {
  const path = '/api/user/visibility'
  const hmacHeaders = await signRequest({ body: '', userId, method: 'GET', path })
  const res = await fetch(`${config.apiUrl}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${userId}`,
      'x-user-id': userId,
      ...(hmacHeaders ?? {}),
    },
  })
  if (!res.ok) throw new Error(`Failed to fetch visibility: ${res.status}`)
  const json = (await res.json()) as { data: VisibilityResponse }
  return json.data
}

async function patchVisibility(input: {
  userId: string
  patch: Partial<PublicVisibility>
}): Promise<PublicVisibility> {
  const bodyStr = JSON.stringify(input.patch)
  const path = '/api/user/visibility'
  const hmacHeaders = await signRequest({
    body: bodyStr,
    userId: input.userId,
    method: 'PATCH',
    path,
  })
  const res = await fetch(`${config.apiUrl}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${input.userId}`,
      'x-user-id': input.userId,
      ...(hmacHeaders ?? {}),
    },
    body: bodyStr,
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const errJson = (await res.json()) as { message?: string; error?: string }
      detail = (errJson.message ?? errJson.error ?? detail).trim() || detail
    } catch {
      // ignore non-JSON error body
    }
    throw new Error(detail)
  }
  const json = (await res.json()) as { data: { visibility: PublicVisibility } }
  return json.data.visibility
}

export function useVisibilityQuery(userId: string | null | undefined) {
  return useQuery<VisibilityResponse>({
    queryKey: QUERY_KEY(userId ?? 'anon'),
    queryFn: () => fetchVisibility(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePatchVisibility(userId: string | null | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<PublicVisibility>) => patchVisibility({ userId: userId!, patch }),
    onMutate: async (patch) => {
      if (!userId) return
      await qc.cancelQueries({ queryKey: QUERY_KEY(userId) })
      const prev = qc.getQueryData<VisibilityResponse>(QUERY_KEY(userId))
      const baseVisibility: PublicVisibility = prev?.visibility ?? {
        signature: true,
        bazi: true,
        ziwei: true,
        basic: true,
        plainIntro: false,
      }
      qc.setQueryData<VisibilityResponse>(QUERY_KEY(userId), {
        chartPublic: prev?.chartPublic ?? false,
        visibility: { ...baseVisibility, ...patch },
      })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (userId && ctx?.prev) qc.setQueryData(QUERY_KEY(userId), ctx.prev)
    },
    onSettled: () => {
      if (userId) qc.invalidateQueries({ queryKey: QUERY_KEY(userId) })
    },
  })
}
