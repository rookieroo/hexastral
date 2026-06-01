/**
 * 报告分享路由
 *
 * POST   /api/share           — 创建分享快照，返回分享 URL
 * GET    /api/share/:shareId  — 查询分享内容（供 hexastral-web 渲染）
 * DELETE /api/share/:shareId  — 撤销分享（设 expiresAt 为过去时间）
 *
 * 注意：分享的是 AI 文字报告（命理/占卜/风水），不是结构化命盘数据。
 * 命盘结构数据走 chartPublic + /api/user/by-username/:username。
 */

import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import { sharedReports } from '../db/schema'
import type { AppEnv } from '../infra-types'
import { requireUserId } from '../lib/auth'
import { logEvent } from '../lib/event-log'

const createShareSchema = z.object({
  userId: z.string().min(1),
  reportType: z.enum([
    'stellar',
    'natal',
    'yiching',
    'fate',
    'physiognomy',
    'pair',
    'numerology',
  ]),
  reportId: z.string().min(1),
  titleHint: z.string().max(100).optional(),
  /** Full report content snapshot — JSON-encoded string */
  contentJson: z.string().min(2).max(64_000),
  /** Optional ISO 8601 expiry. If omitted, link never expires. */
  expiresAt: z.string().optional(),
})

/** Generate a 12-char URL-safe alphanumeric slug */
function generateShareId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const array = new Uint8Array(22)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => chars[b % 62] ?? 'a').join('')
}

export const shareRoutes = new Hono<AppEnv>()
  /** POST /api/share — create a shareable report snapshot */
  .post('/', async (c) => {
    const body = await c.req.json()
    const input = createShareSchema.parse(body)
    input.userId = requireUserId(c)
    const db = c.get('db')

    const shareId = generateShareId()

    await db.insert(sharedReports).values({
      id: shareId,
      userId: input.userId,
      reportType: input.reportType,
      reportId: input.reportId,
      titleHint: input.titleHint ?? null,
      contentJson: input.contentJson,
      expiresAt: input.expiresAt ?? null,
      createdAt: new Date().toISOString(),
    })

    const baseUrl =
      c.env.ENVIRONMENT === 'production' ? 'https://hexastral.com' : 'http://localhost:3000'

    c.executionCtx.waitUntil(
      logEvent(db, input.userId, 'share_create', { shareId, reportType: input.reportType })
    )

    return c.json({ shareId, url: `${baseUrl}/report/${shareId}` }, 201)
  })
  /** GET /api/share/:shareId — fetch shared report (public, no auth required) */
  .get('/:shareId', async (c) => {
    const shareId = c.req.param('shareId')

    // Reject obviously invalid IDs early (12 = legacy, 22 = new)
    if (!/^[a-zA-Z0-9]{12,22}$/.test(shareId)) {
      throw new HTTPException(404, { message: 'Not found' })
    }

    const db = c.get('db')
    const share = await db.select().from(sharedReports).where(eq(sharedReports.id, shareId)).get()

    if (!share) {
      throw new HTTPException(404, { message: 'Share not found' })
    }

    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      throw new HTTPException(410, { message: 'This share link has expired' })
    }

    // Increment view count asynchronously — don't block response
    c.executionCtx.waitUntil(
      db
        .update(sharedReports)
        .set({ viewCount: (share.viewCount ?? 0) + 1 })
        .where(eq(sharedReports.id, shareId))
    )

    return c.json({ data: share })
  })
  /**
   * GET /api/share/yuan/:shareId — Yuán-specific single-chapter share view.
   *
   * Renders the chapter as expected by [apps/hexastral-web/app/[locale]/yuan/report/[shareId]/page.tsx].
   * Public — no auth. The shareId is a normal `sharedReports.id` but the
   * `contentJson` is expected to follow the SynastryChapter + names shape.
   *
   * Difference from generic GET /api/share/:shareId:
   *   - This endpoint validates that reportType === 'pair' and the content has
   *     `chapter` + `selfName` + `otherName` keys.
   *   - Returns a typed `data: SharedChapterData` matching the type re-exported
   *     by @zhop/scenario-yuan.
   */
  .get('/yuan/:shareId', async (c) => {
    const shareId = c.req.param('shareId')

    if (!/^[a-zA-Z0-9]{12,22}$/.test(shareId)) {
      throw new HTTPException(404, { message: 'Not found' })
    }

    const db = c.get('db')
    const share = await db
      .select()
      .from(sharedReports)
      .where(eq(sharedReports.id, shareId))
      .get()

    if (!share) {
      throw new HTTPException(404, { message: 'Share not found' })
    }
    if (share.reportType !== 'pair') {
      throw new HTTPException(400, { message: 'Not a Yuán share' })
    }
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      throw new HTTPException(410, { message: 'This share link has expired' })
    }

    let parsed: {
      chapter?: unknown
      selfName?: string
      otherName?: string
    } = {}
    try {
      parsed = JSON.parse(share.contentJson) as typeof parsed
    } catch {
      throw new HTTPException(500, { message: 'Malformed share content' })
    }

    if (!parsed.chapter || !parsed.selfName || !parsed.otherName) {
      throw new HTTPException(400, { message: 'Share content missing chapter or names' })
    }

    c.executionCtx.waitUntil(
      db
        .update(sharedReports)
        .set({ viewCount: (share.viewCount ?? 0) + 1 })
        .where(eq(sharedReports.id, shareId))
    )

    return c.json({
      data: {
        chapter: parsed.chapter,
        selfName: parsed.selfName,
        otherName: parsed.otherName,
        expiresAt: share.expiresAt,
      },
    })
  })
  /** DELETE /api/share/:shareId — revoke a shared report */
  .delete('/:shareId', async (c) => {
    const shareId = c.req.param('shareId')

    if (!/^[a-zA-Z0-9]{12,22}$/.test(shareId)) {
      throw new HTTPException(404, { message: 'Not found' })
    }

    const userId = requireUserId(c)

    const db = c.get('db')
    const share = await db.select().from(sharedReports).where(eq(sharedReports.id, shareId)).get()

    if (!share) {
      throw new HTTPException(404, { message: 'Share not found' })
    }

    if (share.userId !== userId) {
      throw new HTTPException(403, { message: 'Forbidden' })
    }

    // Set expiresAt to past so existing links return 410
    await db
      .update(sharedReports)
      .set({ expiresAt: new Date(0).toISOString() })
      .where(eq(sharedReports.id, shareId))

    c.executionCtx.waitUntil(logEvent(db, userId, 'share_revoke', { shareId }))

    return c.json({ success: true })
  })
