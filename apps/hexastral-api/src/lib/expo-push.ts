/**
 * Minimal Expo Push sender for Worker-side one-shot notifications
 * (FaceOracle reading_ready). Mirrors svc-notify sendExpoMessages shape.
 */

export type ExpoPushMessage = {
  to: string
  title: string
  body: string
  data?: Record<string, string>
  sound?: string
}

type ExpoTicket = {
  status: 'ok' | 'error'
  message?: string
  details?: { error?: string }
}

export async function sendExpoPushMessages(
  messages: ExpoPushMessage[]
): Promise<{ invalidTokens: string[] }> {
  const invalidTokens: string[] = []
  if (messages.length === 0) return { invalidTokens }

  const chunkSize = 100
  for (let i = 0; i < messages.length; i += chunkSize) {
    const chunk = messages.slice(i, i + chunkSize)
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(chunk.map((m) => ({ sound: 'default', ...m }))),
    })
    if (!res.ok) {
      console.error('[expo-push] API error', res.status)
      continue
    }
    const json = (await res.json()) as { data?: ExpoTicket[] }
    const tickets = Array.isArray(json.data) ? json.data : []
    tickets.forEach((item, idx) => {
      if (item.details?.error === 'DeviceNotRegistered') {
        const t = chunk[idx]?.to
        if (t) invalidTokens.push(t)
      }
    })
  }
  return { invalidTokens }
}
