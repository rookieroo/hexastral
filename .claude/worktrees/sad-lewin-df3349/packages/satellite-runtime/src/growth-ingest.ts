import type { GrowthFunnelEvent } from '@zhop/growth-funnel'

/**
 * Push a validated funnel event to hexastral-api POST /api/growth/events (fire-and-forget).
 */
export async function ingestGrowthEvent(
  apiBase: string,
  payload: GrowthFunnelEvent
): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase}/api/growth/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      console.warn('[satellite-runtime] growth ingest failed', res.status)
      return false
    }
    return true
  } catch (err) {
    console.warn('[satellite-runtime] growth ingest error', err)
    return false
  }
}
