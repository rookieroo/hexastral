/**
 * Daily signal LLM output schema.
 *
 * This is the strict-JSON contract returned by `POST /signal/generate`.
 * It mirrors the consumer schema in `apps/hexastral-api/src/routes/signal.ts`.
 *
 * Fields:
 *   - headline:    push-friendly one-liner (≤16 chars CJK / ≤8 words latin)
 *   - energy:      coarse vibe meter (level + dominant wuxing)
 *   - todayLens:   1–2 sentence strategic frame for the day
 *   - watchFor:    1 sentence specific avoidance / softening note
 *   - lucky:       practical coordinates (hour / direction / color / advice)
 *   - goldenLine:  flagship-tier "今日金句" — 1–2 sentences distilled from todayLens,
 *                  rendered hero-first on the home tab; ≤50 chars CJK / ≤30 words latin.
 *   - reasoningChain: short bridge linking the user's natal traits to today's stem-branch
 */

import { z } from 'zod/v4'

export const signalEnergyLevelEnum = z.enum([
  'rising',
  'steady',
  'productive',
  'guarded',
  'volatile',
])

export const signalWuxingEnum = z.enum(['wood', 'fire', 'earth', 'metal', 'water'])

export const signalOutputSchema = z.object({
  headline: z.string().min(1),
  energy: z.object({
    level: signalEnergyLevelEnum,
    wuxing: signalWuxingEnum,
  }),
  todayLens: z.string().min(1),
  watchFor: z.string().min(1),
  lucky: z.object({
    hour: z.string().min(1),
    direction: z.string().min(1),
    color: z.string().min(1),
    advice: z.string().min(1),
  }),
  goldenLine: z.string().min(1).optional(),
  reasoningChain: z.string().min(1),
})

export type SignalOutput = z.infer<typeof signalOutputSchema>
export type SignalEnergyLevel = z.infer<typeof signalEnergyLevelEnum>
export type SignalWuxing = z.infer<typeof signalWuxingEnum>
