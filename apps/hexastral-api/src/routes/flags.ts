/**
 * GET /api/flags — return all current feature flag values.
 *
 * Anonymous, no auth required (flags are not secret; kill-switches are
 * global behavior changes the client SHOULD know about).
 *
 * IP rate-limited at index.ts mount to prevent abuse. Response cached for
 * 60s at the edge via Cache-Control — flag changes propagate within 1 min,
 * which is fine for kill-switches (the 24h App Review save is what matters).
 *
 * Response shape:
 *   {
 *     flags: { feng_llm_kill: true, paywall_variant: "control", ... },
 *     fetchedAt: "2026-05-30T12:00:00.000Z"
 *   }
 *
 * Client hook `useFlag(key, default)` in @zhop/satellite-runtime consumes
 * this. Default values live client-side — server only knows about flags
 * ops has explicitly SET (via wrangler kv:key put).
 *
 * Admin write endpoint deliberately not exposed via API in v1; flip via
 * `bunx wrangler kv:key put --binding=GUARD_KV "flag:<name>" '<json>'` from
 * the trusted laptop. A signed POST endpoint can come later if non-engineers
 * need to flip flags.
 */

import { Hono } from 'hono'

import type { AppEnv } from '../infra-types'
import { listFlags } from '../lib/feature-flag'

export const flagsRoutes = new Hono<AppEnv>()

flagsRoutes.get('/', async (c) => {
  const flags = await listFlags(c.env)
  // Cache 60s at edge — flag changes propagate within 1 minute. Far faster
  // than a new App Store build / review cycle (which is the entire reason
  // this exists). Stale-while-revalidate avoids cliff-edge on flag flip.
  c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  return c.json({
    flags,
    fetchedAt: new Date().toISOString(),
  })
})
