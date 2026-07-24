/**
 * DDL (Deferred Deep Link) routes
 *
 * POST /api/ddl              — Store fingerprint session (public, rate-limited)
 * GET  /api/ddl/:token       — Resolve session by token (public, one-time read)
 * POST /api/ddl/match        — Fuzzy match by device fingerprint (public, fallback for no-token cold start)
 *
 * KV key format : ddl:{token}  (TTL 30 min)
 * Token format  : 32-char hex (crypto.randomUUID() stripped of dashes)
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import type { CloudflareBindings, ContextVariables } from '../infra-types'

const DDL_TTL_SECONDS = 60 * 30 // 30 minutes
const DDL_KV_PREFIX = 'ddl:'

const fingerprintSchema = z.object({
  userAgent: z.string().max(512),
  language: z.string().max(20),
  timezone: z.string().max(80),
  screenWidth: z.number().int(),
  screenHeight: z.number().int(),
  pixelRatio: z.number(),
  platform: z.string().max(80),
  colorDepth: z.number().int(),
  touchPoints: z.number().int(),
  canvas: z.string().max(64),
  webgl: z.string().max(64),
})

const ddlCreateSchema = z.object({
  fingerprint: fingerprintSchema,
  meta: z
    .object({
      referrer: z.string().max(512).optional(),
      utm: z.record(z.string(), z.string()).optional(),
      /** Ad click / browser match ids (fbclid, gclid, ttclid, rdt_cid, _fbp, _fbc) */
      clickIds: z.record(z.string(), z.string()).optional(),
      landingPath: z.string().max(256).optional(),
      /** Portfolio satellite key for growth analytics */
      targetApp: z.string().max(64).optional(),
      payload: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
})

export const ddlRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: ContextVariables
}>()

// ── POST /api/ddl ─────────────────────────────────────────────
// Public endpoint: accept fingerprint, return session token.
// Protected by shared RATE_LIMITER (60 req/min/IP).
ddlRoutes.post('/', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw new HTTPException(422, { message: 'Expected JSON body' })
  }
  const parsed = ddlCreateSchema.safeParse(body)
  if (!parsed.success) {
    throw new HTTPException(422, { message: 'Invalid DDL payload' })
  }

  const { fingerprint, meta } = parsed.data
  const token = crypto.randomUUID().replace(/-/g, '')
  const kvKey = `${DDL_KV_PREFIX}${token}`

  const session = {
    fingerprint,
    meta: meta ?? {},
    clientIp: c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? '',
    createdAt: Date.now(),
  }

  await c.env.DDL_KV.put(kvKey, JSON.stringify(session), {
    expirationTtl: DDL_TTL_SECONDS,
  })

  return c.json({
    token,
    expiresAt: Date.now() + DDL_TTL_SECONDS * 1000,
  })
})

// ── GET /api/ddl/:token ───────────────────────────────────────
// Public endpoint: iOS app resolves intent after install via deep-link token.
// Token is high-entropy (32-char hex UUID) + one-time read → safe without auth.
ddlRoutes.get('/:token', async (c) => {
  const token = c.req.param('token')
  if (!/^[0-9a-f]{32}$/.test(token)) {
    throw new HTTPException(400, { message: 'Invalid token format' })
  }

  const kvKey = `${DDL_KV_PREFIX}${token}`
  const raw = await c.env.DDL_KV.get(kvKey)

  if (!raw) {
    return c.json({ session: null, found: false }, 404)
  }

  // One-time read — delete after resolve to prevent replays
  await c.env.DDL_KV.delete(kvKey)

  return c.json({ session: JSON.parse(raw), found: true })
})

// ── POST /api/ddl/match ──────────────────────────────────────
// Fallback for iOS cold start without deep-link token.
// Security: IP match is MANDATORY — prevents cross-network impersonation.
// Additional fingerprint signals provide confidence scoring.
// Rate-limited via dedicated per-IP key in index.ts.

const ddlMatchSchema = z.object({
  screenWidth: z.number().int(),
  screenHeight: z.number().int(),
  timezone: z.string().max(80),
  platform: z.string().max(80),
})

ddlRoutes.post('/match', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw new HTTPException(422, { message: 'Expected JSON body' })
  }
  const parsed = ddlMatchSchema.safeParse(body)
  if (!parsed.success) {
    throw new HTTPException(422, { message: 'Invalid match payload' })
  }

  const probe = parsed.data
  const clientIp = c.req.header('cf-connecting-ip') ?? ''

  // No IP → cannot safely match (prevent header-less abuse)
  if (!clientIp) {
    return c.json({ session: null, found: false, score: 0 }, 404)
  }

  // List recent DDL sessions from KV (prefix scan)
  const listResult = await c.env.DDL_KV.list({ prefix: DDL_KV_PREFIX, limit: 50 })

  let bestKey: string | null = null
  let bestScore = 0
  let bestRaw: string | null = null

  for (const key of listResult.keys) {
    const raw = await c.env.DDL_KV.get(key.name)
    if (!raw) continue

    const session = JSON.parse(raw) as {
      fingerprint: { screenWidth: number; screenHeight: number; timezone: string; platform: string }
      meta: Record<string, unknown>
      createdAt: number
      clientIp?: string
    }

    // MANDATORY: IP must match — prevents cross-network impersonation
    if (!session.clientIp || session.clientIp !== clientIp) continue

    const fp = session.fingerprint
    let score = 30 // Base score for IP match (mandatory)

    // Screen dimensions match (strongest signal — unique per device model)
    if (fp.screenWidth === probe.screenWidth && fp.screenHeight === probe.screenHeight) {
      score += 40
    }

    // Timezone match
    if (fp.timezone === probe.timezone) {
      score += 20
    }

    // Platform contains 'ios' / mobile signal
    if (fp.platform?.toLowerCase().includes('mac') || fp.platform?.toLowerCase().includes('ios')) {
      score += 10
    }

    if (score > bestScore) {
      bestScore = score
      bestKey = key.name
      bestRaw = raw
    }
  }

  // Require IP + at least screen or timezone match (score >= 70)
  if (!bestKey || !bestRaw || bestScore < 70) {
    return c.json({ session: null, found: false, score: bestScore }, 404)
  }

  // One-time read — delete matched session
  await c.env.DDL_KV.delete(bestKey)

  return c.json({ session: JSON.parse(bestRaw), found: true, score: bestScore })
})
