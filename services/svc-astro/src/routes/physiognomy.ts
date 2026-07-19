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

function requireGeminiKey(env: Env): string {
  const key = env.GEMINI_API_KEY?.trim()
  if (!key) {
    throw new HTTPException(503, { message: 'gemini_api_key_missing' })
  }
  return key
}

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
 * 输出: 结构化面相特征 JSON（不含原图）
 * 模型: Gemini 3.1 Pro Vision（无 VLM 备用）
 */
physiognomyRoutes.post('/extract-features', async (c) => {
  const input = await c.req.json<{
    imageBase64: string
    mimeType?: string
  }>()

  if (!input.imageBase64) {
    throw new HTTPException(400, { message: 'imageBase64 is required' })
  }

  const apiKey = requireGeminiKey(c.env)
  const imageBase64 = normalizeIncomingBase64(input.imageBase64)

  try {
    const features = await extractFaceFeatures(
      apiKey,
      imageBase64,
      input.mimeType ?? 'image/jpeg'
    )
    return c.json({ features })
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

  const apiKey = requireGeminiKey(c.env)
  const imageBase64 = normalizeIncomingBase64(input.imageBase64)

  try {
    const features = await extractPalmFeatures(
      apiKey,
      imageBase64,
      input.mimeType ?? 'image/jpeg'
    )
    return c.json({ features })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[physiognomy/extract-palm-features]', message.slice(0, 500))
    throw new HTTPException(502, { message: `extract_palm_failed:${message.slice(0, 200)}` })
  }
})
