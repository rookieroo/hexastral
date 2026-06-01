/**
 * 落地页转化追踪端点 — 公开 API（Turnstile 验证 Web；iOS 透明穿透）
 *
 * POST /convert — 命格预设点击转化 +1
 *
 * 调用时机: 用户点击"下载 App"或"注册"按钮后，前端通过 sendBeacon 触发。
 * 使用 waitUntil 异步更新 D1，不阻塞响应（fire-and-forget）。
 */

import { zValidator } from '@hono/zod-validator'
import { and, eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { archetypePresets } from '../../db/schema'
import type { AppEnv } from '../../infra-types'
import { jsonOk } from '../../lib/api-response'

const app = new Hono<AppEnv>()

const inputSchema = z.object({
  dayStem: z.string().min(1).max(2),
  monthBranch: z.string().min(1).max(2),
  gender: z.enum(['男', '女']),
  lang: z.string().min(2).max(10),
})

/** POST /convert — increment conversions counter on the matched archetype preset row */
export const onboardingConvertRoutes = app.post('/', zValidator('json', inputSchema), async (c) => {
  const input = c.req.valid('json')
  const db = c.get('db')

  c.executionCtx.waitUntil(
    db
      .update(archetypePresets)
      .set({ conversions: sql`conversions + 1` })
      .where(
        and(
          eq(archetypePresets.dayStem, input.dayStem),
          eq(archetypePresets.monthBranch, input.monthBranch),
          eq(archetypePresets.gender, input.gender),
          eq(archetypePresets.lang, input.lang),
          eq(archetypePresets.active, true),
          eq(archetypePresets.variant, 'A')
        )
      )
      .catch(() => {})
  )

  return jsonOk(c, { tracked: true })
})
