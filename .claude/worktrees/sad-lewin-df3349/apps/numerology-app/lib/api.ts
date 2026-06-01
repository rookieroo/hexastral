/**
 * Numerology compute client (Phase D.1).
 *
 * v1.0 is fully deterministic — no LLM call, no IAP gate. We hit the
 * `POST /api/numerology/compute` endpoint with `{ fullName, birthDate }` and
 * render the returned numbers locally. No portfolio-client / runAuto involved
 * because there's no AI generation pipeline yet.
 *
 * The endpoint is public (no signin needed) so the same call powers the web
 * `/[locale]/numerology/calculate` demo without auth plumbing.
 */

import Constants from 'expo-constants'

const API_URL =
  (Constants.expoConfig?.extra as Record<string, string> | undefined)?.EXPO_PUBLIC_API_URL ??
  process.env.EXPO_PUBLIC_API_URL ??
  'https://api.hexastral.com'

export interface NumerologyReading {
  fullName: string
  birthDate: string
  lifePath: number
  birthday: number
  expression: number
  soulUrge: number
  personality: number
  personalYear: number
  computedAt: string
}

export interface NumerologyResponse {
  ok: true
  reading: NumerologyReading
  /** Reserved for v1.5 — LLM-narrated interpretation. */
  interpretation: string | null
}

export async function computeNumerology(input: {
  fullName: string
  birthDate: string
  calendarYear?: number
  locale?: string
}): Promise<NumerologyResponse> {
  const res = await fetch(`${API_URL}/api/numerology/compute`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`numerology_compute_failed_${res.status}: ${text.slice(0, 120)}`)
  }
  return (await res.json()) as NumerologyResponse
}
