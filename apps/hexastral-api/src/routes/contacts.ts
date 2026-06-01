/**
 * /api/contacts — 通讯录隐私匹配
 *
 * iOS 端上传 SHA-256(E.164 phone) 哈希列表
 * 服务端比对 users.phoneHash → 返回已注册用户基本信息
 * 同时将哈希入库，用于未来新用户注册时反向通知
 */

import { eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import { contactHashes, users } from '../db/schema'
import type { AppDb, AppEnv } from '../infra-types'
import { requireUserId } from '../lib/auth'

export const contactRoutes = new Hono<AppEnv>()

const matchSchema = z.object({
  /** SHA-256 phone hashes from iOS device contacts */
  hashes: z.array(z.string().length(64)).max(5000),
})

/**
 * POST /match — 批量匹配通讯录哈希
 *
 * 隐私: 只传哈希，永远不传原始手机号
 * Returns matched users that are on HexAstral
 */
contactRoutes.post('/match', async (c) => {
  const userId = requireUserId(c)

  const body = await c.req.json()
  const { hashes } = matchSchema.parse(body)

  if (hashes.length === 0) {
    return c.json({ matches: [] })
  }

  const db = c.get('db')

  // ── 1. Match hashes against registered users' phone_hash ──
  // D1 SQLite IN clause has a limit of ~999 params; chunk if needed
  const CHUNK_SIZE = 500
  const matchedUsers: {
    id: string
    name: string | null
    avatarKey?: string | null
    phoneHash: string | null
  }[] = []

  for (let i = 0; i < hashes.length; i += CHUNK_SIZE) {
    const chunk = hashes.slice(i, i + CHUNK_SIZE)
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        avatarKey: users.avatarKey,
        phoneHash: users.phoneHash,
      })
      .from(users)
      .where(inArray(users.phoneHash, chunk))

    matchedUsers.push(...rows)
  }

  // Exclude self
  const matches = matchedUsers
    .filter((u) => u.id !== userId)
    .map((u) => ({
      userId: u.id,
      name: u.name,
      avatarKey: u.avatarKey,
    }))

  // ── 2. Persist uploaded hashes for future "notify on join" ──
  // Fire-and-forget: upsert in batches (ignore conflicts)
  c.executionCtx.waitUntil(persistContactHashes(db, userId, hashes))

  return c.json({ matches })
})

async function persistContactHashes(db: AppDb, userId: string, hashes: string[]): Promise<void> {
  try {
    const BATCH_SIZE = 100
    for (let i = 0; i < hashes.length; i += BATCH_SIZE) {
      const batch = hashes.slice(i, i + BATCH_SIZE)
      await db
        .insert(contactHashes)
        .values(batch.map((h) => ({ userId, phoneHash: h })))
        .onConflictDoNothing()
    }
  } catch (err) {
    console.error('[contacts] Failed to persist hashes:', err)
  }
}
