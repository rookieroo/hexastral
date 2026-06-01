/**
 * Free-tier quota & consumable-credit service.
 *
 * Subscribers get unlimited access (gated by `user_entitlements`, abuse-capped by
 * the K.4 daily guard) — there is no metered subscription pool. This module owns
 * the NON-subscription metering:
 *   - Free monthly divination quota (3/month) + physiognomy upload cap (2/month)
 *   - Pre-paid consumable credits (hexastral_chat_5 / hexastral_divination_3)
 *   - Bond-invite credits (one free compatibility reading per accepted invite)
 *
 * Overflow pricing: credits exhausted → the client falls through to a single
 * `single_purchase` IAP buy-out (see lib/access-check.ts).
 */

import { and, eq, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { bondInviteCredits, freeMonthlyQuotas, users } from '../db/schema'
import type { AppDb } from '../infra-types'

// ── Free 用户月度配额上限 ──────────────────────────────────────────────────────────

/**
 * Free 用户每月免费配额上限。
 * 各功能的 Free 配额设计为 “够业务体验、不足以完全替代 Pro” 以推动转化。
 */
export const FREE_QUOTA_LIMITS = {
  /** Free 用户每月免费3次占卜（每10天一次的节奏） */
  divinationMonthly: 3,
  /** Free 用户每月面相/手相上传次数（Pro 不限） */
  physiognomyMonthly: 2,
} as const

// ── 月份工具 ──────────────────────────────────────────────────────────────────

/** 当前 UTC 月份字符串 YYYY-MM */
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

// ── 预购消费品 ──────────────────────────────────────────────────────────────

/**
 * Atomically consume one pre-paid chat credit from users.chatCreditsRemaining (hexastral_chat_5 IAP).
 * Returns { success: true } if a credit was available and deducted; { success: false } if balance is 0.
 */
export async function consumeChatCredit(db: AppDb, userId: string): Promise<{ success: boolean }> {
  const result = await db
    .update(users)
    .set({
      chatCreditsRemaining: sql`${users.chatCreditsRemaining} - 1`,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(users.id, userId), sql`${users.chatCreditsRemaining} > 0`))
  const changed = (result as unknown as { meta: { changes: number } }).meta.changes
  return { success: changed > 0 }
}

// ── Free 用户月度配额函数 ──────────────────────────────────────────────────

/**
 * 检查并消耗 Free 用户当月庍免费占卜配额。
 *
 * 采用懒初始化模式：首次调用时创建当月记录（INSERT OR IGNORE），
 * 旧月分记录永远不会在新月被查询（自然失效）。
 *
 * Returns { granted: true } 若配额未耗尽并已原子扶减；{ granted: false } 若已达上限。
 */
export async function checkAndConsumeFreeMonthlyDivination(
  db: AppDb,
  userId: string
): Promise<{ granted: boolean }> {
  const month = currentMonth()

  // Lazy-initialize: insert row for this month if absent (idempotent)
  await db
    .insert(freeMonthlyQuotas)
    .values({
      id: nanoid(),
      userId,
      month,
      divinationUsed: 0,
    })
    .onConflictDoNothing()

  // Atomically increment if below limit
  const result = await db
    .update(freeMonthlyQuotas)
    .set({
      divinationUsed: sql`${freeMonthlyQuotas.divinationUsed} + 1`,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(freeMonthlyQuotas.userId, userId),
        eq(freeMonthlyQuotas.month, month),
        sql`${freeMonthlyQuotas.divinationUsed} < ${FREE_QUOTA_LIMITS.divinationMonthly}`
      )
    )

  const changed = (result as unknown as { meta: { changes: number } }).meta.changes
  return { granted: changed > 0 }
}

/**
 * 获取 Free 用户当月占卜配额状态（不消耗，仅查询）。
 */
export async function getFreeMonthlyDivinationStatus(
  db: AppDb,
  userId: string
): Promise<{ used: number; limit: number; remaining: number }> {
  const month = currentMonth()
  const row = await db
    .select({ divinationUsed: freeMonthlyQuotas.divinationUsed })
    .from(freeMonthlyQuotas)
    .where(and(eq(freeMonthlyQuotas.userId, userId), eq(freeMonthlyQuotas.month, month)))
    .get()

  const used = row?.divinationUsed ?? 0
  return {
    used,
    limit: FREE_QUOTA_LIMITS.divinationMonthly,
    remaining: Math.max(0, FREE_QUOTA_LIMITS.divinationMonthly - used),
  }
}

/**
 * 为 Free 用户消耗一次预购占卜次数（hexastral_divination_3 IAP）。
 * 原子操作，占卜次数为 0 时拒绝。
 * Returns { success: true } 若成功扣减；{ success: false } 若余额为 0。
 */
export async function consumeDivinationCredit(
  db: AppDb,
  userId: string
): Promise<{ success: boolean }> {
  const result = await db
    .update(users)
    .set({
      divinationCreditsRemaining: sql`${users.divinationCreditsRemaining} - 1`,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(users.id, userId), sql`${users.divinationCreditsRemaining} > 0`))
  const changed = (result as unknown as { meta: { changes: number } }).meta.changes
  return { success: changed > 0 }
}

export async function consumeBondInviteCredit(
  db: AppDb,
  userId: string,
  readingId?: string
): Promise<{ success: boolean; creditId?: string }> {
  const available = await db
    .select({ id: bondInviteCredits.id })
    .from(bondInviteCredits)
    .where(and(eq(bondInviteCredits.userId, userId), eq(bondInviteCredits.consumed, false)))
    .limit(1)
    .get()
  if (!available) return { success: false }
  const result = await db
    .update(bondInviteCredits)
    .set({
      consumed: true,
      consumedAt: new Date().toISOString(),
      consumedReadingId: readingId ?? null,
    })
    .where(and(eq(bondInviteCredits.id, available.id), eq(bondInviteCredits.consumed, false)))
  const changed = (result as unknown as { meta: { changes: number } }).meta.changes
  return changed > 0 ? { success: true, creditId: available.id } : { success: false }
}

export async function getBondInviteCreditStatus(
  db: AppDb,
  userId: string
): Promise<{ available: number; lifetime: number }> {
  const [availableRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(bondInviteCredits)
    .where(and(eq(bondInviteCredits.userId, userId), eq(bondInviteCredits.consumed, false)))
  const [lifetimeRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(bondInviteCredits)
    .where(eq(bondInviteCredits.userId, userId))
  return {
    available: availableRow?.count ?? 0,
    lifetime: lifetimeRow?.count ?? 0,
  }
}

/**
 * 检查并消耗 Free 用户当月面相/手相上传配额。
 * Pro 用户跳过配额检查（调用方负责判断）。
 * Returns { granted: true } 若本次上传允许；{ granted: false } 若已达月限。
 */
export async function checkAndConsumePhysiognomyUpload(
  db: AppDb,
  userId: string
): Promise<{ granted: boolean }> {
  const month = currentMonth()

  // Lazy-initialize: insert row for this month if absent
  await db
    .insert(freeMonthlyQuotas)
    .values({ id: nanoid(), userId, month, divinationUsed: 0, physiognomyUploads: 0 })
    .onConflictDoNothing()

  // Atomically increment if below limit
  const result = await db
    .update(freeMonthlyQuotas)
    .set({
      physiognomyUploads: sql`${freeMonthlyQuotas.physiognomyUploads} + 1`,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(freeMonthlyQuotas.userId, userId),
        eq(freeMonthlyQuotas.month, month),
        sql`${freeMonthlyQuotas.physiognomyUploads} < ${FREE_QUOTA_LIMITS.physiognomyMonthly}`
      )
    )

  const changed = (result as unknown as { meta: { changes: number } }).meta.changes
  return { granted: changed > 0 }
}
