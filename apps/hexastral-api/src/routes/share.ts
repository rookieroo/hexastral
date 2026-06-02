/**
 * 报告分享路由
 *
 * POST   /api/share           — 创建分享快照，返回分享 URL
 * GET    /api/share/:shareId  — 查询分享内容（供 hexastral-web 渲染，公开无鉴权）
 * GET    /api/share/yuan/:shareId — Kindred-specific single-chapter share view (公开)
 * DELETE /api/share/:shareId  — 撤销分享（设 expiresAt 为过去时间）
 *
 * 注意：分享的是 AI 文字报告（命理/占卜/风水），不是结构化命盘数据。
 * 命盘结构数据走 chartPublic + /api/user/by-username/:username。
 *
 * Phase F: migrated to shared response envelope (`jsonOk` / `jsonErr` from
 * `lib/api-response.ts`). Public reads (GET) return `{ ok: true, data: ... }`;
 * errors return `{ ok: false, error: { code, message } }`.
 *
 * Client coordination: hexastral-web's `/report/[shareId]/page.tsx` +
 * `/yuan/report/[shareId]/page.tsx` must access `result.data` after checking
 * `result.ok === true` (was `result.data` before — same field, but the `ok`
 * gate is new). hexastral-app + yuan-app share consumers similarly. Update
 * in the same PR.
 */

import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { sharedReports } from '../db/schema'
import type { AppEnv } from '../infra-types'
import { ApiErrorCode, jsonErr, jsonOk } from '../lib/api-response'
import { requireUserId } from '../lib/auth'
import { logEvent } from '../lib/event-log'
import { shareIdSchema } from '../lib/schemas'

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
    'feng',
    'cycle',
  ]),
  reportId: z.string().min(1),
  titleHint: z.string().max(100).optional(),
  /** Full report content snapshot — JSON-encoded string */
  contentJson: z.string().min(2).max(64_000),
  /** Optional ISO 8601 expiry. If omitted, link never expires. */
  expiresAt: z.string().optional(),
})

/** Generate a 22-char URL-safe alphanumeric slug */
function generateShareId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const array = new Uint8Array(22)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => chars[b % 62] ?? 'a').join('')
}

export const shareRoutes = new Hono<AppEnv>()
  /** POST /api/share — create a shareable report snapshot */
  .post('/', async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = createShareSchema.safeParse(body)
    if (!parsed.success) {
      return jsonErr(c, 400, ApiErrorCode.invalid_input, 'Invalid share input', {
        issues: parsed.error.issues,
      })
    }
    const input = parsed.data
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

    return jsonOk(c, { shareId, url: `${baseUrl}/report/${shareId}` }, 201)
  })
  /** GET /api/share/:shareId — fetch shared report (public, no auth required) */
  .get('/:shareId', async (c) => {
    const shareId = c.req.param('shareId')

    if (!shareIdSchema.safeParse(shareId).success) {
      return jsonErr(c, 404, ApiErrorCode.not_found, 'Share not found')
    }

    const db = c.get('db')
    const share = await db.select().from(sharedReports).where(eq(sharedReports.id, shareId)).get()

    if (!share) {
      return jsonErr(c, 404, ApiErrorCode.not_found, 'Share not found')
    }

    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return jsonErr(c, 410, ApiErrorCode.gone, 'This share link has expired')
    }

    // Increment view count asynchronously — don't block response
    c.executionCtx.waitUntil(
      db
        .update(sharedReports)
        .set({ viewCount: (share.viewCount ?? 0) + 1 })
        .where(eq(sharedReports.id, shareId))
    )

    return jsonOk(c, share)
  })
  /**
   * GET /api/share/yuan/:shareId — Kindred-specific single-chapter share view.
   *
   * Renders the chapter as expected by [apps/hexastral-web/app/[locale]/yuan/report/[shareId]/page.tsx].
   * Public — no auth. The shareId is a normal `sharedReports.id` but the
   * `contentJson` is expected to follow the SynastryChapter + names shape.
   *
   * Validates reportType === 'pair' and that the content has `chapter` +
   * `selfName` + `otherName` keys before returning.
   */
  .get('/yuan/:shareId', async (c) => {
    const shareId = c.req.param('shareId')

    if (!shareIdSchema.safeParse(shareId).success) {
      return jsonErr(c, 404, ApiErrorCode.not_found, 'Share not found')
    }

    const db = c.get('db')
    const share = await db.select().from(sharedReports).where(eq(sharedReports.id, shareId)).get()

    if (!share) {
      return jsonErr(c, 404, ApiErrorCode.not_found, 'Share not found')
    }
    if (share.reportType !== 'pair') {
      return jsonErr(c, 400, ApiErrorCode.invalid_input, 'Not a Kindred share')
    }
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return jsonErr(c, 410, ApiErrorCode.gone, 'This share link has expired')
    }

    let parsed: {
      chapter?: unknown
      selfName?: string
      otherName?: string
    } = {}
    try {
      parsed = JSON.parse(share.contentJson) as typeof parsed
    } catch {
      return jsonErr(c, 500, ApiErrorCode.internal_error, 'Malformed share content')
    }

    if (!parsed.chapter || !parsed.selfName || !parsed.otherName) {
      return jsonErr(c, 400, ApiErrorCode.invalid_input, 'Share content missing chapter or names')
    }

    c.executionCtx.waitUntil(
      db
        .update(sharedReports)
        .set({ viewCount: (share.viewCount ?? 0) + 1 })
        .where(eq(sharedReports.id, shareId))
    )

    return jsonOk(c, {
      chapter: parsed.chapter,
      selfName: parsed.selfName,
      otherName: parsed.otherName,
      expiresAt: share.expiresAt,
    })
  })
  /** DELETE /api/share/:shareId — revoke a shared report */
  .delete('/:shareId', async (c) => {
    const shareId = c.req.param('shareId')

    if (!shareIdSchema.safeParse(shareId).success) {
      return jsonErr(c, 404, ApiErrorCode.not_found, 'Share not found')
    }

    const userId = requireUserId(c)

    const db = c.get('db')
    const share = await db.select().from(sharedReports).where(eq(sharedReports.id, shareId)).get()

    if (!share) {
      return jsonErr(c, 404, ApiErrorCode.not_found, 'Share not found')
    }

    if (share.userId !== userId) {
      return jsonErr(c, 403, ApiErrorCode.forbidden, 'Forbidden')
    }

    // Set expiresAt to past so existing links return 410
    await db
      .update(sharedReports)
      .set({ expiresAt: new Date(0).toISOString() })
      .where(eq(sharedReports.id, shareId))

    c.executionCtx.waitUntil(logEvent(db, userId, 'share_revoke', { shareId }))

    return jsonOk(c, { revoked: true })
  })
