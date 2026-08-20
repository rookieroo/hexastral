/**
 * 面相/手相 HTTP 端点 — structured VLM feature extraction only (ADR-0028).
 * Reading interpretation lives in hexastral-api faceoracle queue consumer.
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { extractFaceFeatures, extractPalmFeatures } from '../services/physiognomy'
import type { Env } from '../types'

type AppEnv = { Bindings: Env }

function normalizeIncomingBase64(raw: string): string {
  const trimmed = raw.trim()
  const dataUrl = /^data:[^;]+;base64,(.+)$/i.exec(trimmed)
  return (dataUrl?.[1] ?? trimmed).replace(/\s+/g, '')
}

export const physiognomyRoutes = new Hono<AppEnv>()

/**
 * POST /extract-features
 * 面相特征结构化提取 — 隐私优先架构
 *
 * 输入: base64 图片
 * 输出: { features, landmarks, model }（不含原图）
 * Cascade: CF Kimi K2.6 → Gemini Flash → Qwen 3.8 27B
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
 * Structured palm extract — feature text only; landmarks always {}.
 * Client plots palm stars from a handedness-mirrored canonical anatomical layout.
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

/**
 * POST /harvest-push — secondary LLM pass after a Pro reading (push-retention).
 * Returns dated windows for faceoracle_push_queue. Never diagnoses disease.
 */
physiognomyRoutes.post('/harvest-push', async (c) => {
  const input = await c.req.json<{
    locale?: string
    events?: Array<{ startMonth?: string; theme?: string; note?: string }>
    chapterHints?: string
  }>()
  const locale = typeof input.locale === 'string' ? input.locale : 'zh'
  const events = Array.isArray(input.events) ? input.events : []
  const hints = typeof input.chapterHints === 'string' ? input.chapterHints.slice(0, 1400) : ''
  try {
    const { callWithFallback } = await import('../lib/ai-router')
    const { extractJson } = await import('../lib/extract-json')
    const { buildLanguageBlock, buildLanguageReminder } = await import('../lib/i18n-prompt')
    const system = [
      '你为形气（面相手相+八字）App 撰写锁屏推送语料：自我观察与节奏提醒，增加回访意愿。',
      '硬合规：禁止病名、处方、器官诊断、恐吓口吻；不下天命定论。',
      '少硬约束：不必凑满条数或卡死字数；贴合事件与章节线索，避免套话。',
      buildLanguageBlock(locale, 'physiognomy'),
    ].join('\n')
    const user = `Events JSON: ${JSON.stringify(events).slice(0, 2000)}
Hints: ${hints || '(none)'}

在读完后不久到约两个月内，写出值得点开的短提醒窗口。可用 kind：
- qi / observe → 日间 localHour 9
- rest → 晚间 localHour 21（养气/节奏，不是复拍催促）

输出 JSON：
{ "windows": [ { "fireOn": "YYYY-MM-DD", "localHour": 9|21, "kind": "qi"|"rest"|"observe", "priority": 0-100, "title": "…", "body": "…" } ] }
${buildLanguageReminder(locale)}`
    const text = await callWithFallback(c.env, system, user, {
      tier: 'standard',
      maxTokens: 1000,
      metricLabel: 'faceoracle-harvest-push',
      locale,
    })
    const jsonStr = extractJson(text)
    if (!jsonStr) return c.json({ windows: [] })
    const parsed = JSON.parse(jsonStr) as { windows?: unknown }
    return c.json({ windows: Array.isArray(parsed.windows) ? parsed.windows : [] })
  } catch (err) {
    console.error('[physiognomy/harvest-push]', err)
    return c.json({ windows: [] })
  }
})
