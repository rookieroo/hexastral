/**
 * POST /floorplan/put
 *
 * Persists a user-uploaded floor-plan image into FLOORPLAN_CACHE (R2) and
 * returns its content-addressed key. Unlike the satellite map cache, these are
 * OWNED assets — permanent, purged only when the site is deleted (no lifecycle
 * GC on this bucket) — so reports stay viewable indefinitely.
 *
 * Body: raw image bytes (image/png | image/jpeg | image/webp).
 * JPEG (APPn/COM) + PNG (eXIf/iTXt/tEXt/zTXt) metadata is stripped before storage;
 * WebP is passed through (uncommon here). See image-sanitize.
 *
 * Reachable only via Service Binding from hexastral-api, which does the
 * HMAC/ownership check before forwarding — svc-feng has no public ingress.
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { writeCache } from '../lib/cache'
import { sanitizeImageBytes } from '../lib/image-sanitize'
import { logger } from '../lib/logger'

const MAX_BYTES = 8 * 1024 * 1024 // 8 MB
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp'])
// Owned/permanent — far beyond any reasonable retention. The soft TTL is never
// consulted on the serving path (direct r2.get); this is belt-and-suspenders.
const OWNED_TTL_SECONDS = 10 * 365 * 24 * 60 * 60

function extFor(contentType: string): 'png' | 'jpg' | 'webp' {
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('webp')) return 'webp'
  return 'jpg'
}

async function sha1Hex(bytes: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-1', bytes)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const floorplanRouter = new Hono<{ Bindings: Env }>()

floorplanRouter.post('/put', async (c) => {
  const contentType = (c.req.header('content-type') ?? '').split(';')[0]?.trim() ?? ''
  if (!ALLOWED.has(contentType)) {
    throw new HTTPException(415, { message: `unsupported content-type: ${contentType || 'none'}` })
  }

  const raw = await c.req.arrayBuffer()
  if (raw.byteLength === 0) throw new HTTPException(400, { message: 'empty body' })
  if (raw.byteLength > MAX_BYTES) {
    throw new HTTPException(413, { message: 'image too large (max 8MB)' })
  }

  const clean = sanitizeImageBytes(raw, contentType)
  const hex = await sha1Hex(clean.bytes)
  const key = `floorplan/${hex}.${extFor(clean.contentType)}`

  await writeCache(c.env.FLOORPLAN_CACHE, key, clean.bytes, clean.contentType, OWNED_TTL_SECONDS)
  logger.info('floorplan.put', {
    key,
    bytes: clean.bytes.byteLength,
    contentType: clean.contentType,
  })
  return c.json({ key }, { headers: { 'x-feng-cache-key': key } })
})

/**
 * POST /floorplan/delete
 *
 * Purge user-uploaded floor-plan images from R2 (account / site deletion — the
 * bucket has no lifecycle GC, so this is the ONLY way these owned PII assets
 * leave storage). hexastral-api does the HMAC/ownership check before forwarding
 * and only passes keys belonging to the deleting user's own sites.
 */
floorplanRouter.post('/delete', async (c) => {
  const body = (await c.req.json().catch(() => null)) as { keys?: unknown } | null
  const keys = Array.isArray(body?.keys)
    ? body.keys.filter((k): k is string => typeof k === 'string' && k.startsWith('floorplan/'))
    : []
  if (keys.length === 0) return c.json({ deleted: 0 })
  // R2 supports bulk delete (up to 1000 keys); chunk defensively.
  for (let i = 0; i < keys.length; i += 1000) {
    await c.env.FLOORPLAN_CACHE.delete(keys.slice(i, i + 1000))
  }
  logger.info('floorplan.delete', { count: keys.length })
  return c.json({ deleted: keys.length })
})
