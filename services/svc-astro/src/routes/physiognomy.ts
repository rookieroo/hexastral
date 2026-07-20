/**
 * 面相/手相 HTTP 端点
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import {
  extractFaceFeatures,
  extractPalmFeatures,
  generatePhysiognomyReading,
} from '../services/physiognomy'
import type { Env } from '../types'

type AppEnv = { Bindings: Env }

function normalizeIncomingBase64(raw: string): string {
  const trimmed = raw.trim()
  const dataUrl = /^data:[^;]+;base64,(.+)$/i.exec(trimmed)
  return (dataUrl?.[1] ?? trimmed).replace(/\s+/g, '')
}

export const physiognomyRoutes = new Hono<AppEnv>()

/** POST /analyze — VLM描述 + 玄学解读 */
physiognomyRoutes.post('/analyze', async (c) => {
  const input = await c.req.json()

  const reading = await generatePhysiognomyReading(c.env, input.photoBase64, input.type, {
    stellarChartInfo: input.stellarChartInfo,
    isPro: input.isPro ?? false,
    language: input.language,
  })

  return c.json(reading)
})

/**
 * POST /extract-features
 * 面相特征结构化提取 — 隐私优先架构
 *
 * 输入: base64 图片
 * 输出: { features, model }（不含原图）
 * Cascade: CF Kimi K2.6 → Gemini Flash → Llama 3.2 vision
 */
physiognomyRoutes.post('/extract-features', async (c) => {
  const input = await c.req.json<{
    imageBase64: string
    mimeType?: string
  }>()

  if (!input.imageBase64) {
    throw new HTTPException(400, { message: 'imageBase64 is required' })
  }

  const imageBase64 = normalizeIncomingBase64(input.imageBase64)

  try {
    const { features, landmarks, model } = await extractFaceFeatures(
      c.env,
      imageBase64,
      input.mimeType ?? 'image/jpeg'
    )
    return c.json({ features, landmarks, model })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[physiognomy/extract-features]', message.slice(0, 500))
    throw new HTTPException(502, { message: `extract_features_failed:${message.slice(0, 200)}` })
  }
})

/**
 * POST /extract-palm-features
 * Structured palm extract — mirrors /extract-features; image is ephemeral (ADR-0028).
 */
physiognomyRoutes.post('/extract-palm-features', async (c) => {
  const input = await c.req.json<{
    imageBase64: string
    mimeType?: string
  }>()

  if (!input.imageBase64) {
    throw new HTTPException(400, { message: 'imageBase64 is required' })
  }

  const imageBase64 = normalizeIncomingBase64(input.imageBase64)

  try {
    const { features, landmarks, model } = await extractPalmFeatures(
      c.env,
      imageBase64,
      input.mimeType ?? 'image/jpeg'
    )
    return c.json({ features, landmarks, model })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[physiognomy/extract-palm-features]', message.slice(0, 500))
    throw new HTTPException(502, { message: `extract_palm_failed:${message.slice(0, 200)}` })
  }
})
