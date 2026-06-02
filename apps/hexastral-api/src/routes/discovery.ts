/**
 * GET /api/discovery/recommendations — server-driven satellite→flagship funnel routing.
 *
 * Lets us re-target a satellite's upsell (where it sends users next) without shipping a
 * new app build. v1 serves a baked-in default mapping; a `DISCOVERY_CONFIG` KV overlay
 * (runtime-adjustable weights) is a follow-up (needs `wrangler kv namespace create`).
 *
 * Anonymous, IP rate-limited (see mount in index.ts). The client owns copy/scheme/App Store
 * URL per target (satellite-ui helpers) — the server only decides target + weight.
 */

import { Hono } from 'hono'
import type { CloudflareBindings, ContextVariables } from '../infra-types'

type FlagshipTarget = 'kindred' | 'feng'
interface Recommendation {
  target: FlagshipTarget
  weight: number
}

const CONFIG_VERSION = 'v1'
const BOTH: Recommendation[] = [
  { target: 'kindred', weight: 0.6 },
  { target: 'feng', weight: 0.6 },
]

/** source → intent → recommendations. `*` is the intent wildcard fallback. */
const DEFAULTS: Record<string, Record<string, Recommendation[]>> = {
  fate: {
    relationship: [{ target: 'kindred', weight: 1 }],
    career_wealth: [{ target: 'kindred', weight: 1 }],
    home_office: [{ target: 'feng', weight: 1 }],
    self_daily: [],
    '*': BOTH,
  },
  numerology: {
    relationship: [{ target: 'kindred', weight: 1 }],
    home_office: [{ target: 'feng', weight: 1 }],
    '*': BOTH,
  },
  coincast: {
    '*': [
      { target: 'kindred', weight: 0.5 },
      { target: 'feng', weight: 0.5 },
    ],
  },
  dreamoracle: {
    relationship: [{ target: 'kindred', weight: 1 }],
    '*': [{ target: 'kindred', weight: 0.7 }],
  },
  faceoracle: { '*': BOTH },
  cycle: { '*': BOTH },
}

function resolveRecommendations(source: string, intent: string | null): Recommendation[] {
  const bySource = DEFAULTS[source]
  if (!bySource) return BOTH
  if (intent && bySource[intent]) return bySource[intent]
  return bySource['*'] ?? BOTH
}

export const discoveryRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: ContextVariables
}>().get('/', (c) => {
  const source = c.req.query('source') ?? ''
  const intent = c.req.query('intent') ?? null
  return c.json({
    recommendations: resolveRecommendations(source, intent),
    configVersion: CONFIG_VERSION,
  })
})
