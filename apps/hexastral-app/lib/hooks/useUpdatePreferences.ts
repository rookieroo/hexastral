import { useMutation, useQueryClient } from '@tanstack/react-query'
import { config } from '@/lib/config'
import { signRequest } from '@/lib/hmac'

type TonePreference = 'gentle' | 'straight' | 'poetic'

export interface NotifPrefs {
  dailyFortune: boolean
  luckyWindow: boolean
  chartTransit: boolean
  fateReportReady: boolean
}

interface UpdatePreferencesInput {
  userId: string
  tonePreference?: TonePreference
  locale?: string
  notifPrefs?: NotifPrefs
}

async function patchPreferences(input: UpdatePreferencesInput): Promise<void> {
  const { userId, ...body } = input
  const bodyStr = JSON.stringify(body)
  const path = `/api/user/${userId}/preferences`
  const hmacHeaders = await signRequest({ body: bodyStr, userId, method: 'PATCH', path })

  const res = await fetch(`${config.apiUrl}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
      ...(hmacHeaders ?? {}),
    },
    body: bodyStr,
  })

  if (!res.ok) {
    throw new Error(`Failed to update preferences: ${res.status}`)
  }
}

/** Mutation hook to update user AI tone preference, locale, and notification preferences. */
export function useUpdatePreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: patchPreferences,
    onSuccess: (_data, variables) => {
      // Invalidate the user query so profile refetches updated data
      qc.invalidateQueries({ queryKey: ['user', variables.userId] })
    },
  })
}
