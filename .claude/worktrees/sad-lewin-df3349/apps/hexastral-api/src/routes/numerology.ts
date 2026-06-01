/**
 * Numerology routes (Phase D.2).
 *
 * `POST /api/numerology/compute` is the primary v1.0 endpoint — fully
 * deterministic Pythagorean numerology. No LLM call, no IAP gate (the value
 * comes from the AI-augmented narration in v1.5; v1.0 is a free hook into
 * the satellite App Store funnel).
 *
 * The route is shared between the `numerology-app` satellite and the
 * `hexastral-web` `/[locale]/numerology/calculate` web demo (no signin
 * required for the demo — `userId` is optional).
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import type { AppEnv } from '../infra-types'
import { computeNumerologyReading } from '../lib/numerology'

export const numerologyRoutes = new Hono<AppEnv>()

const computeSchema = z.object({
  fullName: z.string().min(1).max(120),
  /** YYYY-MM-DD (Gregorian). Validated loosely; the lib throws on bad input. */
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{1,2}-\d{1,2}$/, 'birthDate must be YYYY-MM-DD'),
  /** Optional override; defaults to current UTC year. */
  calendarYear: z.int().min(1900).max(2200).optional(),
  locale: z.string().max(16).optional(),
})

numerologyRoutes.post('/compute', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const input = computeSchema.parse(body)

  try {
    const reading = computeNumerologyReading({
      fullName: input.fullName,
      birthDate: input.birthDate,
      calendarYear: input.calendarYear,
    })
    return c.json({
      ok: true,
      reading,
      // v1.0 returns the numbers only. The `interpretation` slot is reserved
      // for v1.5 (LLM narration). Clients should render their own static
      // copy keyed by reading.lifePath etc. until then.
      interpretation: null as string | null,
    })
  } catch (err) {
    throw new HTTPException(400, {
      message: err instanceof Error ? err.message : 'numerology_compute_failed',
    })
  }
})
