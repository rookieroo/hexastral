/**
 * Media Proxy Routes — /api/media
 *
 * Persistent user media managed via hexastral-media R2 bucket.
 * Serves avatars, palm photos, floor plans, etc. with long-lived caching.
 *
 * Key convention (legacy flagship): {type}s/{userId}/{nanoid}.{ext}
 * Key convention (portfolio satellites): {target_app}/users/{userId}/{type}s/{nanoid}.{ext}
 *   hexastral/users/u1/avatars/x.jpg  — default when x-target-app omitted
 *
 * All routes require HMAC auth (applied in index.ts).
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { nanoid } from 'nanoid'
import { z } from 'zod/v4'
import type { CloudflareBindings, ContextVariables } from '../infra-types'
import { resolvePortfolioTargetApp } from '../lib/portfolio-target-app'

type HonoCtx = { Bindings: CloudflareBindings; Variables: ContextVariables }

const ALLOWED_TYPES = ['avatar', 'palm', 'floorplan'] as const
type MediaType = (typeof ALLOWED_TYPES)[number]

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
}

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

function buildMediaObjectKey(
  targetApp: string,
  userId: string,
  type: MediaType,
  ext: string
): string {
  if (targetApp === 'hexastral') {
    return `${type}s/${userId}/${nanoid()}.${ext}`
  }
  return `${targetApp}/users/${userId}/${type}s/${nanoid()}.${ext}`
}

/** Legacy keys: avatars/{userId}/... — new: {app}/users/{userId}/avatars/... */
export function mediaKeyOwnedByUser(key: string, userId: string): boolean {
  const parts = key.split('/').filter(Boolean)
  if (parts.length < 2) return false
  const [a, b] = parts
  if (a === 'avatars' || a === 'palms' || a === 'floorplans') {
    return b === userId
  }
  if (parts.length >= 4 && b === 'users') {
    return parts[2] === userId
  }
  return false
}

/** Public avatar proxy: legacy avatars/ prefix or any .../users/{id}/avatars/ path. */
export function isPublicAvatarKey(key: string): boolean {
  if (key.startsWith('avatars/')) return true
  return /(^|\/)(users\/[^/]+\/avatars\/)/.test(key)
}

export const mediaRoutes = new Hono<HonoCtx>()

/**
 * GET /api/media/public/:key
 * Unauthenticated read-only route for serving avatars.
 * MUST only serve objects under the 'avatars/' prefix.
 */
mediaRoutes.get('/public/:key{.+}', async (c) => {
  const key = c.req.param('key')

  if (!isPublicAvatarKey(key)) {
    throw new HTTPException(403, { message: 'Only avatars can be served publicly' })
  }

  const ifNoneMatch = c.req.header('If-None-Match')
  const object = await c.env.MEDIA_BUCKET.get(key)

  if (!object) throw new HTTPException(404, { message: 'Media not found' })

  if (ifNoneMatch && ifNoneMatch === object.httpEtag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: object.httpEtag, 'Cache-Control': 'public, max-age=31536000, immutable' },
    })
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('ETag', object.httpEtag)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')

  return new Response(object.body, { headers })
})

const uploadJsonSchema = z.object({
  type: z.enum(['avatar', 'palm', 'floorplan']),
  mimeType: z.string(),
  fileName: z.string().optional(),
  base64Data: z.string(),
})

/**
 * POST /api/media/upload-json
 * JSON-based upload to bypass React Native FormData boundary hashing issues.
 * Required by HMAC request signing.
 * Returns: { key: string, url: string }
 */
mediaRoutes.post('/upload-json', async (c) => {
  const userId = c.get('userId')
  if (!userId) throw new HTTPException(401, { message: 'Unauthorized' })

  let data: unknown
  try {
    data = await c.req.json()
  } catch {
    throw new HTTPException(400, { message: 'Invalid JSON request body' })
  }

  const parsed = uploadJsonSchema.safeParse(data)
  if (!parsed.success) {
    throw new HTTPException(400, { message: 'Invalid payload schema' })
  }

  const { type, mimeType, base64Data } = parsed.data
  const targetApp = resolvePortfolioTargetApp(c.req.header('x-target-app'))

  const ext = ALLOWED_MIME_TYPES[mimeType]
  if (!ext) {
    throw new HTTPException(415, {
      message: 'Unsupported media type. Allowed: jpeg, png, webp, heic',
    })
  }

  // Convert base64 to Uint8Array safely (handles 'data:image/...;base64,' prefixes)
  const base64Prefix = 'base64,'
  const base64Payload = base64Data.includes(base64Prefix)
    ? (base64Data.split(base64Prefix)[1] ?? '')
    : base64Data

  let buffer: Uint8Array
  try {
    const raw = atob(base64Payload)
    buffer = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) {
      buffer[i] = raw.charCodeAt(i)
    }
  } catch {
    throw new HTTPException(400, { message: 'Invalid base64 payload' })
  }

  if (buffer.length > MAX_BYTES) {
    throw new HTTPException(413, { message: 'File too large. Max 10 MB' })
  }

  const key = buildMediaObjectKey(targetApp, userId, type, ext)

  await c.env.MEDIA_BUCKET.put(key, buffer, {
    httpMetadata: { contentType: mimeType },
    customMetadata: { userId },
  })

  // Provide the full proxy URL to the client
  const url = `${new URL(c.req.url).origin}/api/media/public/${key}`

  return c.json({ key, url })
})

/**
 * POST /api/media/upload
 * Multipart form upload.
 * Fields: file (File), type ('avatar' | 'palm' | 'floorplan')
 * Returns: { key: string }
 */
mediaRoutes.post('/upload', async (c) => {
  const userId = c.get('userId')
  if (!userId) throw new HTTPException(401, { message: 'Unauthorized' })

  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  const type = formData.get('type') as string | null

  if (!file) throw new HTTPException(400, { message: 'file is required' })
  if (!type || !(ALLOWED_TYPES as readonly string[]).includes(type)) {
    throw new HTTPException(400, { message: `type must be one of: ${ALLOWED_TYPES.join(', ')}` })
  }

  const ext = ALLOWED_MIME_TYPES[file.type]
  if (!ext) {
    throw new HTTPException(415, {
      message: 'Unsupported media type. Allowed: jpeg, png, webp, heic',
    })
  }

  if (file.size > MAX_BYTES) {
    throw new HTTPException(413, { message: 'File too large. Max 10 MB' })
  }

  const targetApp = resolvePortfolioTargetApp(c.req.header('x-target-app'))
  const key = buildMediaObjectKey(targetApp, userId, type as MediaType, ext)
  const buffer = await file.arrayBuffer()

  await c.env.MEDIA_BUCKET.put(key, buffer, {
    httpMetadata: { contentType: file.type },
    customMetadata: { userId, uploadedAt: new Date().toISOString() },
  })

  return c.json({ key })
})

/**
 * GET /api/media/:key
 * Serve a media object from R2 with immutable cache headers.
 * Supports ETag + 304 Not Modified via If-None-Match.
 */
mediaRoutes.get('/:key{.+}', async (c) => {
  const key = c.req.param('key')

  const ifNoneMatch = c.req.header('If-None-Match')

  const object = await c.env.MEDIA_BUCKET.get(key)
  if (!object) throw new HTTPException(404, { message: 'Media not found' })

  // ETag-based 304 Not Modified
  if (ifNoneMatch && ifNoneMatch === object.httpEtag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: object.httpEtag, 'Cache-Control': 'public, max-age=31536000, immutable' },
    })
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('ETag', object.httpEtag)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')

  return new Response(object.body, { headers })
})

/**
 * DELETE /api/media/:key
 * Delete a media object. Only the owning user may delete.
 */
mediaRoutes.delete('/:key{.+}', async (c) => {
  const key = c.req.param('key')
  const userId = c.get('userId')
  if (!userId) throw new HTTPException(401, { message: 'Unauthorized' })

  if (!mediaKeyOwnedByUser(key, userId)) {
    throw new HTTPException(403, { message: 'Forbidden' })
  }

  await c.env.MEDIA_BUCKET.delete(key)
  return new Response(null, { status: 204 })
})
