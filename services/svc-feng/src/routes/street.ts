/**
 * POST /street/sha — street-level 形煞 detection (小峦头) via Mapillary + Gemini.
 *
 * OFF unless MAPILLARY_TOKEN is set (returns degraded). For each nearby street
 * photo the VLM lists 形煞 aimed at a building; each finding is tagged with the
 * capturing image's compass angle so the caller can bin it into a 八卦宫.
 *
 * Body: { lat, lng, locale }  →  { degraded, imageCount, attribution, findings }.
 */

import { callGeminiVisionStructured, withZodRetry } from '@zhop/ai-vision'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { logger } from '../lib/logger'
import { fetchStreetImages, MAPILLARY_ATTRIBUTION } from '../lib/mapillary'

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

  let images: Awaited<ReturnType<typeof fetchStreetImages>> = []
  try {
    images = await fetchStreetImages({
      lat,
      lng,
      token: c.env.MAPILLARY_TOKEN,
      signal: AbortSignal.timeout(8000),
    })
  } catch (err) {
    logger.warn('street.fetch.error', { error: err instanceof Error ? err.message : String(err) })
  }

  if (images.length === 0) {
    return c.json({
      degraded: true,
      imageCount: 0,
      attribution: MAPILLARY_ATTRIBUTION,
      findings: [],
    })
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

  // Bin each finding by its capturing image's compass angle (→ 宫 by the caller).
  const findings = validated.findings
    .filter((f) => f.imageIndex >= 0 && f.imageIndex < images.length)
    .map((f) => ({
      compassAngle: (images[f.imageIndex] as (typeof images)[number]).compassAngle,
      type: f.type,
      severity: f.severity,
      evidence: f.evidence,
    }))

  logger.info('street.sha.done', {
    durationMs: Date.now() - started,
    imageCount: images.length,
    findingCount: findings.length,
  })

  return c.json({
    degraded: false,
    imageCount: images.length,
    attribution: MAPILLARY_ATTRIBUTION,
    findings,
  })
})
