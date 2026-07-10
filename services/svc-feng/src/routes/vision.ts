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
import { formatFormAzimuthsForPrompt } from '../lib/form-azimuth'
import { auditVisionHits } from '../lib/output-audit'
import {
  buildInteriorUserPrompt,
  INTERIOR_RESPONSE_SCHEMA,
  INTERIOR_SYSTEM_PROMPT,
} from '../prompts/interior'
import {
  buildVisionUserPrompt,
  VISION_FORM_RESPONSE_SCHEMA,
  VISION_FORM_SYSTEM_PROMPT,
  VISION_SHA_RESPONSE_SCHEMA,
  VISION_SHA_SYSTEM_PROMPT,
} from '../prompts/vision'

const ConfidenceSchema = z.enum(['high', 'low']).optional().default('high')

const VisionShaItemSchema = z.object({
  type: z.string(),
  direction: z.string(),
  distance: z.enum(['near', 'mid', 'far']),
  severity: z.number().int().min(1).max(5),
  evidence: z.string(),
  confidence: ConfidenceSchema,
})

const VisionSandItemSchema = z.object({
  type: z.string(),
  direction: z.string(),
  distance: z.enum(['near', 'mid', 'far']),
  strength: z.enum(['strong', 'medium', 'weak']),
  confidence: ConfidenceSchema,
})

const VisionWaterItemSchema = z.object({
  type: z.string(),
  direction: z.string(),
  distance: z.enum(['near', 'mid', 'far']),
  flow: z.enum(['in', 'out', 'still']),
  confidence: ConfidenceSchema,
})

const VisionCourtItemSchema = z.object({
  type: z.string(),
  direction: z.string(),
  distance: z.enum(['near', 'mid', 'far']),
  confidence: ConfidenceSchema,
})

const VisionShaResultSchema = z.object({
  形煞: z.array(VisionShaItemSchema),
  notes: z.string().optional(),
})

const VisionFormResultSchema = z.object({
  砂: z.array(VisionSandItemSchema),
  水: z.array(VisionWaterItemSchema),
  朝案: z.array(VisionCourtItemSchema),
  notes: z.string().optional(),
})

const VisionResultSchema = z.object({
  形煞: z.array(VisionShaItemSchema),
  砂: z.array(VisionSandItemSchema),
  水: z.array(VisionWaterItemSchema),
  朝案: z.array(VisionCourtItemSchema),
  notes: z.string().optional(),
})

export interface VisionAnalysisResult extends z.infer<typeof VisionResultSchema> {
  modelVersion: string
}

const VisionRequestSchema = z.object({
  annotatedKeys: z.array(z.string().min(1)).min(1).max(3),
  facingDegTrue: z.number(),
  sitDegTrue: z.number(),
  doorDegTrue: z.number().optional(),
  locale: z.enum(['en', 'zh', 'zh-Hant', 'ja']).default('en'),
  expectedFeatures: z.array(z.enum(['砂', '水', '朝案'])).optional(),
  terrainSummary: z.string().optional(),
  formAzimuths: z
    .array(
      z.object({
        kind: z.enum(['water', 'waterway', 'road']),
        palace: z.enum(['坎', '艮', '震', '巽', '离', '坤', '兑', '乾']),
        bearingDeg: z.number(),
        distanceM: z.number(),
        source: z.literal('tilequery'),
      })
    )
    .optional(),
})

const MODEL_VERSION = 'gemini-3.1-pro-vision-v2'
const VISION_SHA_VERSION = 'v2-sha'
const VISION_FORM_VERSION = 'v2-form'
const PROMPT_VERSION = 'v2-split'
const VISION_AUDIT_VERSION = 'v1'
const SHA_FLASH_MODEL = 'gemini-2.5-flash'
// Successful vision is bound to the (immutable) annotated-tile hashes, so it can
// live long; a prompt/model bump is what should invalidate it, not time.
const VISION_TTL_SECONDS = 180 * 24 * 60 * 60 // 180 days
// A degraded (model-failed) result is negatively cached only briefly, so a burst
// of retries doesn't re-hammer Gemini, while a transient failure still recovers
// on the next analyze after it expires.
const DEGRADED_TTL_SECONDS = 5 * 60 // 5 minutes
const LOW_CONFIDENCE_TTL_SECONDS = DEGRADED_TTL_SECONDS

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
    formAzimuths,
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
    formAzimuths,
    promptVersion: PROMPT_VERSION,
    auditVersion: VISION_AUDIT_VERSION,
    visionShaVersion: VISION_SHA_VERSION,
    visionFormVersion: VISION_FORM_VERSION,
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

  const userPromptBase = buildVisionUserPrompt({
    facingDegTrue,
    sitDegTrue,
    doorDegTrue,
    locale,
    imageCount,
    expectedFeatures,
    terrainSummary,
    formAzimuthLines: formAzimuths?.length
      ? formatFormAzimuthsForPrompt(formAzimuths)
      : undefined,
  })

  const closeImages = images.slice(0, 1)
  const formImages = images.length > 1 ? images.slice(1) : images

  const shaValidated = await withZodRetry({
    label: 'vision-sha',
    schema: VisionShaResultSchema,
    call: () =>
      callGeminiVisionStructured<unknown>(c.env.GEMINI_API_KEY, {
        systemPrompt: VISION_SHA_SYSTEM_PROMPT,
        userPrompt: `${userPromptBase}\n\nAnalyze ONLY 形煞 in the close image.`,
        images: closeImages,
        responseSchema: VISION_SHA_RESPONSE_SCHEMA,
        maxOutputTokens: 2048,
        temperature: 0.2,
        model: SHA_FLASH_MODEL,
      }),
    degraded: () => ({ 形煞: [], notes: 'Sha pass failed; empty 形煞.' }),
  })

  const runFormPass =
    shaValidated.形煞.length > 0 ||
    (expectedFeatures?.some((f) => f === '砂' || f === '水') ?? images.length > 1)

  let formValidated: z.infer<typeof VisionFormResultSchema> = {
    砂: [],
    水: [],
    朝案: [],
    notes: undefined,
  }

  if (runFormPass) {
    formValidated = await withZodRetry({
      label: 'vision-form',
      schema: VisionFormResultSchema,
      call: () =>
        callGeminiVisionStructured<unknown>(c.env.GEMINI_API_KEY, {
          systemPrompt: VISION_FORM_SYSTEM_PROMPT,
          userPrompt: `${userPromptBase}\n\nAnalyze 砂/水/朝案 only (no 形煞).`,
          images: formImages,
          responseSchema: VISION_FORM_RESPONSE_SCHEMA,
          maxOutputTokens: 3072,
          temperature: 0.2,
        }),
      degraded: () => ({
        砂: [],
        水: [],
        朝案: [],
        notes: 'Form pass failed; empty 砂/水/朝案.',
      }),
    })
  }

  let validated: z.infer<typeof VisionResultSchema> = {
    形煞: shaValidated.形煞,
    砂: formValidated.砂,
    水: formValidated.水,
    朝案: formValidated.朝案,
    notes: [shaValidated.notes, formValidated.notes].filter(Boolean).join(' | ') || undefined,
  }

  let rewriteSuffix = ''
  const visionAudit = auditVisionHits(JSON.stringify(validated))
  if (visionAudit.hits.length > 0) {
    rewriteSuffix = visionAudit.rewriteSuffix ?? ''
    logger.warn('vision.analyze.forbidden_phrases', { hits: visionAudit.hits })
    const retrySha = await withZodRetry({
      label: 'vision-sha-forbidden-retry',
      schema: VisionShaResultSchema,
      call: () =>
        callGeminiVisionStructured<unknown>(c.env.GEMINI_API_KEY, {
          systemPrompt: VISION_SHA_SYSTEM_PROMPT,
          userPrompt: `${userPromptBase}${rewriteSuffix}\n\nAnalyze ONLY 形煞.`,
          images: closeImages,
          responseSchema: VISION_SHA_RESPONSE_SCHEMA,
          maxOutputTokens: 2048,
          temperature: 0.2,
          model: SHA_FLASH_MODEL,
        }),
      degraded: () => shaValidated,
    })
    validated = { ...validated, 形煞: retrySha.形煞, notes: retrySha.notes ?? validated.notes }
  }

  const degraded = validated.notes?.includes('failed after retries')
  const allShaLowConfidence =
    validated.形煞.length > 0 && validated.形煞.every((s) => s.confidence === 'low')
  const shortTtl = degraded || allShaLowConfidence
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
    shortTtl ? LOW_CONFIDENCE_TTL_SECONDS : VISION_TTL_SECONDS
  )
  logger.info('vision.analyze.done', {
    locale,
    durationMs: Date.now() - started,
    degraded,
    shortTtl,
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
  /** User-placed 立极 on the cover plan (normalized 0–1). */
  centerNorm: z.object({ x: z.number().gte(0).lte(1), y: z.number().gte(0).lte(1) }).optional(),
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
const INTERIOR_PROMPT_VERSION = 'v2'

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
  const { floorplanKeys, northUpBearing, locale, floorLabels, centerNorm } = parsed.data
  const started = Date.now()
  logger.info('vision.interior.start', { locale, imageCount: floorplanKeys.length })

  // Analyze floors CONCURRENTLY, not sequentially — a villa's N floors under one
  // outer AbortSignal (feng-client TIMEOUTS.vision) would blow the budget in series
  // and fail-open the WHOLE interior stage. In parallel the wall-clock ≈ the slowest
  // single floor. Each floor is independently resilient: a missing image or a failed
  // VLM call degrades THAT floor only (empty rooms), never the rest.
  const perFloor = await Promise.all(
    floorplanKeys.map(
      async (key, i): Promise<{ floor: InteriorFloorResult; degraded: boolean }> => {
        const floorLabel = floorLabels?.[i]
        const vKey = await cacheKey('feng-interior', {
          key,
          northUpBearing,
          locale,
          centerNorm: centerNorm ?? null,
          promptVersion: INTERIOR_PROMPT_VERSION,
          modelVersion: INTERIOR_MODEL_VERSION,
        })
        try {
          const cached = await readCache(c.env.ANNOTATED_CACHE, vKey)
          if (cached) {
            const result = JSON.parse(new TextDecoder().decode(cached.bytes)) as z.infer<
              typeof InteriorResultSchema
            >
            return { floor: { key, ...result }, degraded: false }
          }
          const base64 = await fetchR2AsBase64(c.env.FLOORPLAN_CACHE, key)
          const interiorPromptBase = buildInteriorUserPrompt({
            northUpBearing,
            locale,
            floorLabel,
            centerNorm: i === 0 ? centerNorm : undefined,
          })
          let interiorRewrite = ''
          let validated = await withZodRetry({
            label: 'interior',
            schema: InteriorResultSchema,
            call: () =>
              callGeminiVisionStructured<unknown>(c.env.GEMINI_API_KEY, {
                systemPrompt: INTERIOR_SYSTEM_PROMPT,
                userPrompt: interiorPromptBase + interiorRewrite,
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
          const interiorAudit = auditVisionHits(JSON.stringify(validated))
          if (interiorAudit.hits.length > 0) {
            interiorRewrite = interiorAudit.rewriteSuffix ?? ''
            logger.warn('vision.interior.forbidden_phrases', { hits: interiorAudit.hits, key })
            validated = await withZodRetry({
              label: 'interior-forbidden-retry',
              schema: InteriorResultSchema,
              call: () =>
                callGeminiVisionStructured<unknown>(c.env.GEMINI_API_KEY, {
                  systemPrompt: INTERIOR_SYSTEM_PROMPT,
                  userPrompt: interiorPromptBase + interiorRewrite,
                  images: [{ base64, mimeType: mimeForKey(key) }],
                  responseSchema: INTERIOR_RESPONSE_SCHEMA,
                  maxOutputTokens: 4096,
                  temperature: 0.2,
                }),
              degraded: () => validated,
            })
          }
          const degraded = validated.notes?.includes('failed after retries') ?? false
          await writeCache(
            c.env.ANNOTATED_CACHE,
            vKey,
            new TextEncoder().encode(JSON.stringify(validated)).buffer as ArrayBuffer,
            'application/json',
            degraded ? DEGRADED_TTL_SECONDS : VISION_TTL_SECONDS
          )
          return { floor: { key, ...validated }, degraded }
        } catch (err) {
          // A single unreadable image / transport error must not fail the villa.
          logger.warn('vision.interior.floor_failed', {
            key,
            error: err instanceof Error ? err.message : String(err),
          })
          return {
            floor: { key, rooms: [], 形煞: [], 缺角: [], notes: 'floor unavailable' },
            degraded: true,
          }
        }
      }
    )
  )
  const floors: InteriorFloorResult[] = perFloor.map((r) => r.floor)
  const degradedFloors = perFloor.filter((r) => r.degraded).length
  const anyDegraded = degradedFloors > 0

  logger.info('vision.interior.done', {
    locale,
    durationMs: Date.now() - started,
    floors: floors.length,
    degradedFloors,
    roomCount: floors.reduce((n, f) => n + f.rooms.length, 0),
  })
  return c.json({
    floors,
    modelVersion: anyDegraded ? `${INTERIOR_MODEL_VERSION}-degraded` : INTERIOR_MODEL_VERSION,
  } satisfies InteriorAnalysisResult)
})
