import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { config } from '@/lib/config'
import { signRequest } from '@/lib/hmac'

export type LifeEventType =
  | 'career'
  | 'relationship'
  | 'health'
  | 'travel'
  | 'education'
  | 'family'
  | 'other'

export interface LifeEvent {
  id: string
  userId: string
  eventDate: string
  eventType: LifeEventType
  title: string
  description: string | null
  aiInterpretation: string | null
  dayunIndex: number | null
  liunianGanZhi: string | null
  createdAt: string
}

export interface LifeEventsPage {
  data: LifeEvent[]
  total: number
  limit: number
  offset: number
}

interface CreateLifeEventInput {
  userId: string
  eventDate: string
  eventType: LifeEventType
  title: string
  description?: string
}

async function signedFetch(
  path: string,
  options: { method: string; userId: string; body?: string }
): Promise<Response> {
  const bodyStr = options.body ?? ''
  const hmacHeaders = await signRequest({
    body: bodyStr,
    userId: options.userId,
    method: options.method,
    path,
  })
  return fetch(`${config.apiUrl}${path}`, {
    method: options.method,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': options.userId,
      ...(hmacHeaders ?? {}),
    },
    body: bodyStr || undefined,
  })
}

async function fetchLifeEvents(
  userId: string,
  params: { limit?: number; offset?: number; eventType?: LifeEventType } = {}
): Promise<LifeEventsPage> {
  const qs = new URLSearchParams()
  if (params.limit !== undefined) qs.set('limit', String(params.limit))
  if (params.offset !== undefined) qs.set('offset', String(params.offset))
  if (params.eventType) qs.set('eventType', params.eventType)
  const path = `/api/life-events?${qs.toString()}`
  const res = await signedFetch(path, { method: 'GET', userId })
  if (!res.ok) throw new Error(`Failed to fetch life events: ${res.status}`)
  return res.json()
}

async function createLifeEvent(input: CreateLifeEventInput): Promise<LifeEvent> {
  const { userId, ...body } = input
  const bodyStr = JSON.stringify(body)
  const res = await signedFetch('/api/life-events', { method: 'POST', userId, body: bodyStr })
  if (!res.ok) throw new Error(`Failed to create life event: ${res.status}`)
  const json = await res.json()
  return json.data
}

async function deleteLifeEvent(userId: string, eventId: string): Promise<void> {
  const res = await signedFetch(`/api/life-events/${eventId}`, { method: 'DELETE', userId })
  if (!res.ok) throw new Error(`Failed to delete life event: ${res.status}`)
}

export function useLifeEventsQuery(
  userId: string | null,
  params: { limit?: number; offset?: number; eventType?: LifeEventType } = {}
) {
  return useQuery({
    queryKey: ['life-events', userId, params],
    queryFn: () => fetchLifeEvents(userId!, params),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateLifeEventMutation(userId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<CreateLifeEventInput, 'userId'>) =>
      createLifeEvent({ ...input, userId: userId! }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['life-events', userId] })
    },
  })
}

export function useDeleteLifeEventMutation(userId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (eventId: string) => deleteLifeEvent(userId!, eventId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['life-events', userId] })
    },
  })
}
