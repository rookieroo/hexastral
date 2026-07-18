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

  const features = await extractFaceFeatures(
    c.env.GEMINI_API_KEY,
    input.imageBase64,
    input.mimeType ?? 'image/jpeg'
  )

  return c.json({ features })
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

  const features = await extractPalmFeatures(
    c.env.GEMINI_API_KEY,
    input.imageBase64,
    input.mimeType ?? 'image/jpeg'
  )

  return c.json({ features })
})
