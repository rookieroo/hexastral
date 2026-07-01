/**
 * POST /vision/analyze
 *
 * Stage 1 of the AI pipeline (per feng-plan.md §5.7). Takes 3 annotated
 * R2 keys + the building's facing degree, calls Gemini 2.5 Pro Vision,
 * returns structured 外巒頭 JSON.
 *
 * Phase F: now consumes `@zhop/ai-vision` for the shared Gemini client +
 * R2 fetch helper + Zod-retry envelope. Identical behavior, far less code.
 */

import {
  cacheKey,
  callGeminiVisionStructured,
  fetchR2AsBase64,
  readCache,
  withZodRetry,
  writeCache,
} from '@zhop/ai-vision'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { logger } from '../lib/logger'
import {
  buildInteriorUserPrompt,
  INTERIOR_RESPONSE_SCHEMA,
  INTERIOR_SYSTEM_PROMPT,
} from '../prompts/interior'
import {
  buildVisionUserPrompt,
  VISION_RESPONSE_SCHEMA,
  VISION_SYSTEM_PROMPT,
} from '../prompts/vision'

const VisionRequestSchema = z.object({
  annotatedKeys: z.array(z.string().min(1)).min(1).max(3),
  facingDegTrue: z.number(),
  sitDegTrue: z.number(),
  doorDegTrue: z.number().optional(),
  locale: z.enum(['en', 'zh', 'zh-Hant', 'ja']).default('en'),
  expectedFeatures: z.array(z.enum(['砂', '水', '朝案'])).optional(),
  terrainSummary: z.string().optional(),
})

const VisionResultSchema = z.object({
  形煞: z.array(
    z.object({
      type: z.string(),
      direction: z.string(),
      distance: z.enum(['near', 'mid', 'far']),
      severity: z.number().int().min(1).max(5),
      evidence: z.string(),
    })
  ),
  砂: z.array(
    z.object({
      type: z.string(),
      direction: z.string(),
      distance: z.enum(['near', 'mid', 'far']),
      strength: z.enum(['strong', 'medium', 'weak']),
    })
  ),
  水: z.array(
    z.object({
      type: z.string(),
      direction: z.string(),
      distance: z.enum(['near', 'mid', 'far']),
      flow: z.enum(['in', 'out', 'still']),
    })
  ),
  朝案: z.array(
    z.object({
      type: z.string(),
      direction: z.string(),
      distance: z.enum(['near', 'mid', 'far']),
    })
  ),
  notes: z.string().optional(),
})

export interface VisionAnalysisResult extends z.infer<typeof VisionResultSchema> {
  modelVersion: string
}

const MODEL_VERSION = 'gemini-3.1-pro-vision-v1'
// Bump when the vision prompt or response schema changes — folded into the cache
// key so a prompt edit busts stale results instead of serving pre-change output.
const PROMPT_VERSION = 'v1'
// Successful vision is bound to the (immutable) annotated-tile hashes, so it can
// live long; a prompt/model bump is what should invalidate it, not time.
const VISION_TTL_SECONDS = 180 * 24 * 60 * 60 // 180 days
// A degraded (model-failed) result is negatively cached only briefly, so a burst
// of retries doesn't re-hammer Gemini, while a transient failure still recovers
// on the next analyze after it expires.
const DEGRADED_TTL_SECONDS = 5 * 60 // 5 minutes

export const visionRouter = new Hono<{ Bindings: Env }>()

visionRouter.post('/analyze', async (c) => {
  const json = await c.req.json().catch(() => null)
  const parsed = VisionRequestSchema.safeParse(json)
  if (!parsed.success) {
    throw new HTTPException(400, { message: parsed.error.message })
  }

  const {
    annotatedKeys,
    facingDegTrue,
    sitDegTrue,
    doorDegTrue,
    locale,
    expectedFeatures,
    terrainSummary,
  } = parsed.data
  const started = Date.now()
  const imageCount = annotatedKeys.length as 1 | 2 | 3
  logger.info('vision.analyze.start', {
    locale,
    imageCount,
    expectedFeatures,
    terrainSummary,
  })

  // Content-addressed cache of the structured result. The annotatedKeys are
  // SHA-1 keys of the rendered+annotated tiles (deterministic per location /
  // zoom / facing), so the same site — and any nearby site that falls on the
  // same tile — reuses this without re-calling Gemini Vision. Checked BEFORE the
  // R2 image fetch + model call, so a re-analysis (e.g. after a downstream
  // insert retry) costs nothing. Stored in the shared ANNOTATED_CACHE bucket
  // under a distinct prefix.
  const vKey = await cacheKey('feng-vision', {
    annotatedKeys,
    facingDegTrue,
    sitDegTrue,
    doorDegTrue,
    locale,
    expectedFeatures,
    terrainSummary,
    promptVersion: PROMPT_VERSION,
    modelVersion: MODEL_VERSION,
  })
  const cachedVision = await readCache(c.env.ANNOTATED_CACHE, vKey)
  if (cachedVision) {
    logger.info('vision.analyze.cache', { hit: true, key: vKey, durationMs: Date.now() - started })
    return c.json(JSON.parse(new TextDecoder().decode(cachedVision.bytes)) as VisionAnalysisResult)
  }

  const images = await Promise.all(
    annotatedKeys.map(async (key) => ({
      base64: await fetchR2AsBase64(c.env.ANNOTATED_CACHE, key),
      mimeType: 'image/png' as const,
    }))
  )

  const userPrompt = buildVisionUserPrompt({
    facingDegTrue,
    sitDegTrue,
    doorDegTrue,
    locale,
    imageCount,
    expectedFeatures,
    terrainSummary,
  })

  const validated = await withZodRetry({
    label: 'vision',
    schema: VisionResultSchema,
    call: () =>
      callGeminiVisionStructured<unknown>(c.env.GEMINI_API_KEY, {
        systemPrompt: VISION_SYSTEM_PROMPT,
        userPrompt,
        images,
        responseSchema: VISION_RESPONSE_SCHEMA,
        maxOutputTokens: 4096,
        temperature: 0.2,
      }),
    degraded: () => ({
      形煞: [],
      砂: [],
      水: [],
      朝案: [],
      notes: 'Vision analysis failed after retries; report generated from compute data only.',
    }),
  })

  const degraded = validated.notes?.includes('failed after retries')
  const result: VisionAnalysisResult = {
    ...validated,
    modelVersion: degraded ? `${MODEL_VERSION}-degraded` : MODEL_VERSION,
  }
  // Cache success long (bound to immutable tile hashes) and degraded briefly:
  // the short negative-cache TTL absorbs retry storms without freezing an empty
  // reading in for months — it expires and the next analyze re-attempts Gemini.
  await writeCache(
    c.env.ANNOTATED_CACHE,
    vKey,
    new TextEncoder().encode(JSON.stringify(result)).buffer as ArrayBuffer,
    'application/json',
    degraded ? DEGRADED_TTL_SECONDS : VISION_TTL_SECONDS
  )
  logger.info('vision.analyze.done', {
    locale,
    durationMs: Date.now() - started,
    degraded,
    cached: false,
    modelVersion: result.modelVersion,
    shapeShaCount: validated.形煞.length,
    shaCount: validated.砂.length,
  })
  return c.json(result)
})

// ── Interior (室内 / 阳宅) vision — 户型图 ──────────────────────────────────
//
// One floor plan = one Gemini call (villas send N images = N calls). Each image
// is read against the stated north into 八卦九宫 rooms + interior 形煞; the
// compute layer joins these with 飞星/八宅 per palace. Results are content-
// addressed per (floorplan key, north, prompt/model version, locale) so a
// re-analysis of the same plan is free.

const InteriorRequestSchema = z.object({
  floorplanKeys: z.array(z.string().min(1)).min(1).max(6),
  /** True-north bearing of each plan's top edge (shared across floors). */
  northUpBearing: z.number(),
  locale: z.enum(['en', 'zh', 'zh-Hant', 'ja']).default('en'),
  /** Optional per-image label, e.g. "1F" / "2F" / "阁楼". */
  floorLabels: z.array(z.string()).optional(),
})

const InteriorResultSchema = z.object({
  rooms: z.array(
    z.object({
      type: z.string(),
      palace: z.string(),
      note: z.string().optional(),
    })
  ),
  形煞: z.array(
    z.object({
      type: z.string(),
      palace: z.string(),
      severity: z.number().int().min(1).max(5),
      evidence: z.string(),
    })
  ),
  缺角: z.array(
    z.object({
      palace: z.string(),
      note: z.string().optional(),
    })
  ),
  notes: z.string().optional(),
})

export interface InteriorFloorResult extends z.infer<typeof InteriorResultSchema> {
  key: string
}
export interface InteriorAnalysisResult {
  floors: InteriorFloorResult[]
  modelVersion: string
}

const INTERIOR_MODEL_VERSION = 'gemini-3.1-pro-vision-interior-v1'
const INTERIOR_PROMPT_VERSION = 'v1'

function mimeForKey(key: string): 'image/png' | 'image/jpeg' | 'image/webp' {
  if (key.endsWith('.jpg') || key.endsWith('.jpeg')) return 'image/jpeg'
  if (key.endsWith('.webp')) return 'image/webp'
  return 'image/png'
}

visionRouter.post('/interior', async (c) => {
  const json = await c.req.json().catch(() => null)
  const parsed = InteriorRequestSchema.safeParse(json)
  if (!parsed.success) {
    throw new HTTPException(400, { message: parsed.error.message })
  }
  const { floorplanKeys, northUpBearing, locale, floorLabels } = parsed.data
  const started = Date.now()
  logger.info('vision.interior.start', { locale, imageCount: floorplanKeys.length })

  const floors: InteriorFloorResult[] = []
  let anyDegraded = false

  for (const [i, key] of floorplanKeys.entries()) {
    const floorLabel = floorLabels?.[i]
    const vKey = await cacheKey('feng-interior', {
      key,
      northUpBearing,
      locale,
      promptVersion: INTERIOR_PROMPT_VERSION,
      modelVersion: INTERIOR_MODEL_VERSION,
    })
    const cached = await readCache(c.env.ANNOTATED_CACHE, vKey)
    if (cached) {
      const result = JSON.parse(
        new TextDecoder().decode(cached.bytes)
      ) as z.infer<typeof InteriorResultSchema>
      floors.push({ key, ...result })
      continue
    }

    const base64 = await fetchR2AsBase64(c.env.FLOORPLAN_CACHE, key)
    const validated = await withZodRetry({
      label: 'interior',
      schema: InteriorResultSchema,
      call: () =>
        callGeminiVisionStructured<unknown>(c.env.GEMINI_API_KEY, {
          systemPrompt: INTERIOR_SYSTEM_PROMPT,
          userPrompt: buildInteriorUserPrompt({ northUpBearing, locale, floorLabel }),
          images: [{ base64, mimeType: mimeForKey(key) }],
          responseSchema: INTERIOR_RESPONSE_SCHEMA,
          maxOutputTokens: 4096,
          temperature: 0.2,
        }),
      degraded: () => ({
        rooms: [],
        形煞: [],
        缺角: [],
        notes: 'Interior analysis failed after retries; report uses exterior + compute only.',
      }),
    })
    const degraded = validated.notes?.includes('failed after retries')
    if (degraded) anyDegraded = true
    await writeCache(
      c.env.ANNOTATED_CACHE,
      vKey,
      new TextEncoder().encode(JSON.stringify(validated)).buffer as ArrayBuffer,
      'application/json',
      degraded ? DEGRADED_TTL_SECONDS : VISION_TTL_SECONDS
    )
    floors.push({ key, ...validated })
  }

  logger.info('vision.interior.done', {
    locale,
    durationMs: Date.now() - started,
    floors: floors.length,
    degraded: anyDegraded,
    roomCount: floors.reduce((n, f) => n + f.rooms.length, 0),
  })
  return c.json({
    floors,
    modelVersion: anyDegraded ? `${INTERIOR_MODEL_VERSION}-degraded` : INTERIOR_MODEL_VERSION,
  } satisfies InteriorAnalysisResult)
})
