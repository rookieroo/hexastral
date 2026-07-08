/**
 * POST /street/sha — street-level 形煞 detection (小峦头) via Mapillary + Gemini.
 *
 * OFF unless MAPILLARY_TOKEN is set (returns degraded). For each nearby street
 * photo the VLM lists 形煞 aimed at a building; each finding is tagged with the
 * capturing image's compass angle so the caller can bin it into a 八卦宫.
 *
 * Body: { lat, lng, locale }  →  { degraded, imageCount, attribution, findings }.
 *
 * Cost controls (WP3b):
 *   - Coverage preflight (limit=1 bbox probe) before thumb fetch + Gemini
 *   - Content-addressed R2 cache keyed by ~50m grid + prompt version
 *   - maxImages default 2 (down from 4)
 */

import {
  cacheKey,
  callGeminiVisionStructured,
  readCache,
  withZodRetry,
  writeCache,
} from '@zhop/ai-vision'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { logger } from '../lib/logger'
import { fetchStreetImages, MAPILLARY_ATTRIBUTION, probeStreetCoverage } from '../lib/mapillary'
import { STREET_SHA_VERSION, streetGridKey } from '../lib/street-cache'

export const streetRouter = new Hono<{ Bindings: Env }>()

const InputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  locale: z.enum(['en', 'zh', 'zh-Hant', 'ja']).default('zh'),
})

const STREET_SYSTEM_PROMPT = `You are a feng-shui 形煞 analyst reading STREET-LEVEL photos near a building.
Detect only 形煞 (harmful forms) that would aim at a nearby residential/office building:
路冲 (road rush head-on), 反弓 (reverse-bow road/river), 尖角冲射 (sharp building corner pointing at it), 天斩煞 (narrow gap between two tall buildings), 电塔/高压 (pylon/power line), 烟囱煞 (chimney), 招牌煞 (large signage/billboard edge), 孤峰/壁刀 (lone tower / wall-blade), or "other".
Rules:
- Only report a 形煞 if it is clearly visible AND plausibly aimed at a building. Do NOT invent.
- Each finding cites the 0-based image index it was seen in.
- severity 1-5 (5 = major, directly aimed, close). Be calibrated.
- evidence < 100 chars. If an image shows no 形煞, omit it.
- Return an empty findings array when nothing qualifies.`

const StreetResultSchema = z.object({
  findings: z.array(
    z.object({
      imageIndex: z.number().int().min(0),
      type: z.string(),
      severity: z.number().int().min(1).max(5),
      evidence: z.string(),
    })
  ),
})

const STREET_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    findings: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          imageIndex: { type: 'INTEGER' },
          type: { type: 'STRING' },
          severity: { type: 'INTEGER' },
          evidence: { type: 'STRING' },
        },
        required: ['imageIndex', 'type', 'severity', 'evidence'],
      },
    },
  },
  required: ['findings'],
}

const STREET_TTL_SECONDS = 30 * 24 * 60 * 60
const STREET_NO_COVERAGE_TTL_SECONDS = 7 * 24 * 60 * 60

interface StreetShaResponse {
  degraded: boolean
  imageCount: number
  attribution: string
  findings: Array<{
    compassAngle: number
    type: string
    severity: number
    evidence: string
  }>
}

streetRouter.post('/sha', async (c) => {
  const json = await c.req.json().catch(() => null)
  const parsed = InputSchema.safeParse(json)
  if (!parsed.success) throw new HTTPException(400, { message: 'invalid street payload' })
  const { lat, lng, locale } = parsed.data
  const started = Date.now()

  if (!c.env.MAPILLARY_TOKEN) {
    return c.json({
      degraded: true,
      imageCount: 0,
      attribution: MAPILLARY_ATTRIBUTION,
      findings: [],
    })
  }

  const { gridLat, gridLng } = streetGridKey(lat, lng)
  const cachePayload = { gridLat, gridLng, locale, version: STREET_SHA_VERSION }
  const sKey = await cacheKey('feng-street', cachePayload)
  const cached = await readCache(c.env.ANNOTATED_CACHE, sKey)
  if (cached) {
    const hit = JSON.parse(new TextDecoder().decode(cached.bytes)) as StreetShaResponse
    logger.info('street.sha.cache', { hit: true, key: sKey, durationMs: Date.now() - started })
    return c.json(hit)
  }

  const signal = AbortSignal.timeout(8000)

  let hasCoverage = false
  try {
    hasCoverage = await probeStreetCoverage({
      lat,
      lng,
      token: c.env.MAPILLARY_TOKEN,
      signal,
    })
  } catch (err) {
    logger.warn('street.probe.error', { error: err instanceof Error ? err.message : String(err) })
  }

  if (!hasCoverage) {
    const empty: StreetShaResponse = {
      degraded: true,
      imageCount: 0,
      attribution: MAPILLARY_ATTRIBUTION,
      findings: [],
    }
    await writeCache(
      c.env.ANNOTATED_CACHE,
      sKey,
      new TextEncoder().encode(JSON.stringify(empty)).buffer as ArrayBuffer,
      'application/json',
      STREET_NO_COVERAGE_TTL_SECONDS
    )
    return c.json(empty)
  }

  let images: Awaited<ReturnType<typeof fetchStreetImages>> = []
  try {
    images = await fetchStreetImages({
      lat,
      lng,
      token: c.env.MAPILLARY_TOKEN,
      signal,
      maxImages: 2,
    })
  } catch (err) {
    logger.warn('street.fetch.error', { error: err instanceof Error ? err.message : String(err) })
  }

  if (images.length === 0) {
    const empty: StreetShaResponse = {
      degraded: true,
      imageCount: 0,
      attribution: MAPILLARY_ATTRIBUTION,
      findings: [],
    }
    await writeCache(
      c.env.ANNOTATED_CACHE,
      sKey,
      new TextEncoder().encode(JSON.stringify(empty)).buffer as ArrayBuffer,
      'application/json',
      STREET_NO_COVERAGE_TTL_SECONDS
    )
    return c.json(empty)
  }

  const userPrompt = `You are given ${images.length} street photo(s) near the site (image index 0..${images.length - 1}). Output locale: ${locale}. List 形煞 per the rules.`

  const validated = await withZodRetry({
    label: 'street-sha',
    schema: StreetResultSchema,
    call: () =>
      callGeminiVisionStructured<unknown>(c.env.GEMINI_API_KEY, {
        systemPrompt: STREET_SYSTEM_PROMPT,
        userPrompt,
        images: images.map((im) => ({ base64: im.base64, mimeType: im.mimeType })),
        responseSchema: STREET_RESPONSE_SCHEMA,
        maxOutputTokens: 2048,
        temperature: 0.2,
      }),
    degraded: () => ({ findings: [] }),
  })

  const findings = validated.findings
    .filter((f) => f.imageIndex >= 0 && f.imageIndex < images.length)
    .map((f) => ({
      compassAngle: (images[f.imageIndex] as (typeof images)[number]).compassAngle,
      type: f.type,
      severity: f.severity,
      evidence: f.evidence,
    }))

  const response: StreetShaResponse = {
    degraded: false,
    imageCount: images.length,
    attribution: MAPILLARY_ATTRIBUTION,
    findings,
  }

  await writeCache(
    c.env.ANNOTATED_CACHE,
    sKey,
    new TextEncoder().encode(JSON.stringify(response)).buffer as ArrayBuffer,
    'application/json',
    STREET_TTL_SECONDS
  )

  logger.info('street.sha.done', {
    durationMs: Date.now() - started,
    imageCount: images.length,
    findingCount: findings.length,
    cached: false,
  })

  return c.json(response)
})
