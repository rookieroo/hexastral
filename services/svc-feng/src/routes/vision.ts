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

import { callGeminiVisionStructured, fetchR2AsBase64, withZodRetry } from '@zhop/ai-vision'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { logger } from '../lib/logger'
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
  logger.info('vision.analyze.done', {
    locale,
    durationMs: Date.now() - started,
    degraded,
    modelVersion: result.modelVersion,
    shapeShaCount: validated.形煞.length,
    shaCount: validated.砂.length,
  })
  return c.json(result)
})
