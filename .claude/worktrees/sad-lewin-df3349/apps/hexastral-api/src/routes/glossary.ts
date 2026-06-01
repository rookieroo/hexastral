/**
 * GET /api/glossary?keys=stem:甲,palace:命宫|major:紫微&lang=zh
 *
 * 命盘术语长释义查询 — 入门模式 (beginner) 下的「展开阅读」内容。
 *
 * - HMAC 鉴权 (iOS 客户端调用)
 * - 不消耗配额，对所有登录用户开放（含 Free）
 * - 返回每个 key 的命中条目（按 active=true 过滤）
 * - 客户端可一次请求多个 key（最多 16 个，避免滥用）
 *
 * @example
 *   GET /api/glossary?keys=stem%3A%E7%94%B2,geju%3A%E6%AD%A3%E5%AE%98%E6%A0%BC&lang=zh
 *   →
 *   {
 *     items: [
 *       { key: 'stem:甲', title: '甲木', bodyMd: '...', category: 'stem' },
 *       { key: 'geju:正官格', title: '正官格', bodyMd: '...', category: 'geju' },
 *     ]
 *   }
 */

import { and, eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import { chartGlossary } from '../db/schema'
import type { AppEnv } from '../infra-types'
import { requireUserId } from '../lib/auth'

export const glossaryRoutes = new Hono<AppEnv>()

const querySchema = z.object({
  keys: z
    .string()
    .min(1)
    .transform((s) => s.split(',').map((k) => k.trim()).filter(Boolean)),
  lang: z.enum(['zh', 'zh-Hant', 'en', 'ja']).default('zh'),
})

glossaryRoutes.get('/', async (c) => {
  // 鉴权 — 用户必须登录（HMAC 已校验过 nonce/sig，这里仅取 userId）
  requireUserId(c)

  const parsed = querySchema.safeParse({
    keys: c.req.query('keys') ?? '',
    lang: c.req.query('lang') ?? 'zh',
  })
  if (!parsed.success) {
    throw new HTTPException(400, { message: 'Invalid query: keys and lang required' })
  }

  const { keys, lang } = parsed.data
  if (keys.length === 0) return c.json({ items: [] })
  if (keys.length > 16) {
    throw new HTTPException(400, { message: 'Too many keys (max 16 per request)' })
  }

  const db = c.get('db')

  const rows = await db
    .select({
      key: chartGlossary.key,
      category: chartGlossary.category,
      title: chartGlossary.title,
      bodyMd: chartGlossary.bodyMd,
    })
    .from(chartGlossary)
    .where(
      and(
        inArray(chartGlossary.key, keys),
        eq(chartGlossary.lang, lang),
        eq(chartGlossary.active, true)
      )
    )
    .all()

  return c.json({ items: rows })
})
