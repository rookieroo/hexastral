/**
 * Pro 订阅月度配额服务
 *
 * 设计原则:
 *   - Pro 月度订阅: pairLimit=30, divinationLimit=300, divinationDailyLimit=10
 *   - Pro 年度订阅: pairLimit=360, divinationLimit=3600, divinationDailyLimit=10
 *   - 每个 Pro 用户每个自然月（月度）或自然年（年度）一条 subscription_quotas 记录
 *   - 首次访问配额时自动创建（getOrCreateQuota），幂等
 *   - consumeProPairQuota / consumeProDivinationQuota 使用 SQL 条件更新防并发超扣
 *   - 命格/星宫 基础推演不计入配额（缓存命中率高，成本可忽略）
 *   - 每次阅读前 5 条 chat 对话免费，不占 chatPool 配额
 *
 * 配额上限（按订阅计划区分）:
 *   月度 Pro: pair=30次/月, divination=300次/月, divinationDaily=10次/天
 *   年度 Pro: pair=360次/年, divination=3600次/年, divinationDaily=10次/天
 *   chatPool: 150条/月（两种计划相同）
 *
 * 溢出定价:
 *   - 铜钱体系已废弃，回归纯粹的单次产品买断 (Consumable IAP)。
 *   - 配额耗尽后，前端在底层走 `single_purchase` 进行单次买断 (例如 $9.99/次)。
 *   - 考虑到较高的单次溢出价格，配额设置必须足够慷慨，让用户充分信任 AI 价值后再拦截。
 */

import { and, eq, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import {
  bondInviteCredits,
  dailyActivity,
  freeMonthlyQuotas,
  subscriptionQuotas,
  users,
} from '../db/schema'
import type { AppDb } from '../infra-types'

// ── 计划配额上限 ───────────────────────────────────────────────────────────

export type SubscriptionPlan = 'monthly' | 'annual'

export const PLAN_QUOTA_LIMITS: Record<
  SubscriptionPlan,
  {
    pairLimit: number
    divinationLimit: number
    divinationDailyLimit: number
    chatPool: number
    chatFreePerReading: number
  }
> = {
  monthly: {
    pairLimit: 30,
    divinationLimit: 300,
    divinationDailyLimit: 10,
    chatPool: 200,
    chatFreePerReading: 10,
  },
  annual: {
    pairLimit: 360,
    divinationLimit: 3600,
    divinationDailyLimit: 10,
    chatPool: 200,
    chatFreePerReading: 10,
  },
}

/** 向后兼容 — 默认月度计划限额 */
export const QUOTA_LIMITS = PLAN_QUOTA_LIMITS.monthly

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

export type QuotaType = 'pair' | 'divination' | 'chatPool'

// ── 月份/年份工具 ──────────────────────────────────────────────────────────

/** 当前 UTC 月份字符串 YYYY-MM */
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

/** 当前 UTC 年份字符串 YYYY（用于年度订阅配额 key） */
export function currentYear(): string {
  return new Date().getUTCFullYear().toString()
}

/** 当前 UTC 日期字符串 YYYY-MM-DD */
export function currentDate(): string {
  return new Date().toISOString().slice(0, 10)
}

/** 根据订阅计划返回配额 period key
 * 两种计划均使用 YYYY-MM：月度订阅按自然月重置，
 * 年度订阅也按展示月重置 chatPool（保证年度用户每月都有充足的 pool）。
 * divinationLimit 和 pairLimit 在 PLAN_QUOTA_LIMITS 中已按年度倚数，所以年度订阅每月内的占卜体验不受影响。
 */
export function quotaPeriod(plan: SubscriptionPlan | null | undefined): string {
  // Both plans use YYYY-MM so chatPool resets monthly for annual subscribers too
  return currentMonth()
}

// ── 核心函数 ───────────────────────────────────────────────────────────────

/**
 * 获取或创建配额记录（幂等）。
 * 月度计划: period = 'YYYY-MM'; 年度计划: period = 'YYYY'
 */
export async function getOrCreateQuota(
  db: AppDb,
  userId: string,
  period: string
): Promise<typeof subscriptionQuotas.$inferSelect> {
  await db
    .insert(subscriptionQuotas)
    .values({
      id: nanoid(),
      userId,
      month: period,
      pairUsed: 0,
      divinationUsed: 0,
      divinationDailyUsed: 0,
      divinationDailyDate: null,
      chatPoolUsed: 0,
    })
    .onConflictDoNothing()

  const row = await db
    .select()
    .from(subscriptionQuotas)
    .where(and(eq(subscriptionQuotas.userId, userId), eq(subscriptionQuotas.month, period)))
    .get()

  if (!row) throw new Error(`quota row missing after upsert for userId=${userId} period=${period}`)
  return row
}

/** Backward-compat wrapper */
export async function getOrCreateMonthlyQuota(
  db: AppDb,
  userId: string,
  period = currentMonth()
): Promise<typeof subscriptionQuotas.$inferSelect> {
  return getOrCreateQuota(db, userId, period)
}

/**
 * 初始化订阅配额记录（由 webhook 在订阅开始/续费时调用，幂等）。
 */
export async function createInitialQuota(
  db: AppDb,
  userId: string,
  plan: SubscriptionPlan
): Promise<void> {
  const period = quotaPeriod(plan)
  await db
    .insert(subscriptionQuotas)
    .values({
      id: nanoid(),
      userId,
      month: period,
      pairUsed: 0,
      divinationUsed: 0,
      divinationDailyUsed: 0,
      divinationDailyDate: null,
      chatPoolUsed: 0,
    })
    .onConflictDoNothing()
}

/**
 * 到期时将当前配额全部清零（EXPIRATION webhook 调用）。
 */
export async function zeroCurrentQuota(db: AppDb, userId: string): Promise<void> {
  await db
    .update(subscriptionQuotas)
    .set({
      pairUsed: 0,
      divinationUsed: 0,
      divinationDailyUsed: 0,
      chatPoolUsed: 0,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(subscriptionQuotas.userId, userId))
}

// ── 状态查询 ───────────────────────────────────────────────────────────────

export type QuotaStatus = {
  period: string
  plan: SubscriptionPlan
  pair: { used: number; limit: number; remaining: number }
  divination: { used: number; limit: number; remaining: number }
  divinationToday: { used: number; dailyLimit: number; remaining: number }
  chatPool: { used: number; limit: number; remaining: number }
}

/**
 * 返回 Pro 用户当前配额状态（用于 iOS UI 展示）。
 */
export async function getQuotaStatus(
  db: AppDb,
  userId: string,
  plan: SubscriptionPlan = 'monthly'
): Promise<QuotaStatus> {
  const period = quotaPeriod(plan)
  const limits = PLAN_QUOTA_LIMITS[plan]
  const row = await getOrCreateQuota(db, userId, period)
  const today = currentDate()
  
  // 查询今日实际占卜总次数
  const activity = await db
    .select({ divinationCount: dailyActivity.divinationCount })
    .from(dailyActivity)
    .where(and(eq(dailyActivity.userId, userId), eq(dailyActivity.date, today)))
    .get()
  
  const dailyUsed = activity?.divinationCount ?? 0

  return {
    period,
    plan,
    pair: {
      used: row.pairUsed,
      limit: limits.pairLimit,
      remaining: Math.max(0, limits.pairLimit - row.pairUsed),
    },
    divination: {
      used: row.divinationUsed,
      limit: limits.divinationLimit,
      remaining: Math.max(0, limits.divinationLimit - row.divinationUsed),
    },
    divinationToday: {
      used: dailyUsed,
      dailyLimit: limits.divinationDailyLimit,
      remaining: Math.max(0, limits.divinationDailyLimit - dailyUsed),
    },
    chatPool: {
      used: row.chatPoolUsed,
      limit: limits.chatPool,
      remaining: Math.max(0, limits.chatPool - row.chatPoolUsed),
    },
  }
}

// ── 计费决策 ───────────────────────────────────────────────────────────────

/**
 * 为 Pro 用户消耗一次合盘配额。
 */
export async function consumeProPairQuota(
  db: AppDb,
  userId: string,
  plan: SubscriptionPlan = 'monthly'
): Promise<{ decided: 'free' | 'overflow' }> {
  const period = quotaPeriod(plan)
  const limits = PLAN_QUOTA_LIMITS[plan]
  await getOrCreateQuota(db, userId, period)

  const result = await db
    .update(subscriptionQuotas)
    .set({
      pairUsed: sql`${subscriptionQuotas.pairUsed} + 1`,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(subscriptionQuotas.userId, userId),
        eq(subscriptionQuotas.month, period),
        sql`${subscriptionQuotas.pairUsed} < ${limits.pairLimit}`
      )
    )

  const changed = (result as unknown as { meta: { changes: number } }).meta.changes
  return { decided: changed > 0 ? 'free' : 'overflow' }
}

/** @deprecated Use consumeProPairQuota or consumeProDivinationQuota directly */
export async function consumeProQuota(
  db: AppDb,
  userId: string,
  type: 'pair' | 'divination',
  plan?: SubscriptionPlan
): Promise<{ decided: 'free' | 'overflow' }> {
  if (type === 'pair') return consumeProPairQuota(db, userId, plan)
  return consumeProDivinationQuota(db, userId, plan)
}

/**
 * 为 Pro 用户消耗一次易经占卜配额（月度累计 + 每日上限双重检查）。
 * 每日计数使用 divinationDailyUsed + divinationDailyDate 实现跨日自动重置。
 */
export async function consumeProDivinationQuota(
  db: AppDb,
  userId: string,
  plan: SubscriptionPlan = 'monthly'
): Promise<{ decided: 'free' | 'overflow'; reason?: 'monthly_limit' | 'daily_limit' }> {
  const period = quotaPeriod(plan)
  const limits = PLAN_QUOTA_LIMITS[plan]
  const today = currentDate()
  await getOrCreateQuota(db, userId, period)

  const row = await db
    .select()
    .from(subscriptionQuotas)
    .where(and(eq(subscriptionQuotas.userId, userId), eq(subscriptionQuotas.month, period)))
    .get()

  if (!row) return { decided: 'overflow', reason: 'monthly_limit' }

  if (row.divinationUsed >= limits.divinationLimit) {
    return { decided: 'overflow', reason: 'monthly_limit' }
  }

  const dailyUsed = row.divinationDailyDate === today ? row.divinationDailyUsed : 0
  if (dailyUsed >= limits.divinationDailyLimit) {
    return { decided: 'overflow', reason: 'daily_limit' }
  }

  const result = await db
    .update(subscriptionQuotas)
    .set({
      divinationUsed: sql`${subscriptionQuotas.divinationUsed} + 1`,
      divinationDailyUsed: sql`CASE WHEN ${subscriptionQuotas.divinationDailyDate} = ${today} THEN ${subscriptionQuotas.divinationDailyUsed} + 1 ELSE 1 END`,
      divinationDailyDate: today,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(subscriptionQuotas.userId, userId),
        eq(subscriptionQuotas.month, period),
        sql`${subscriptionQuotas.divinationUsed} < ${limits.divinationLimit}`,
        sql`CASE WHEN ${subscriptionQuotas.divinationDailyDate} = ${today} THEN ${subscriptionQuotas.divinationDailyUsed} ELSE 0 END < ${limits.divinationDailyLimit}`
      )
    )

  const changed = (result as unknown as { meta: { changes: number } }).meta.changes
  return { decided: changed > 0 ? 'free' : 'overflow' }
}

/**
 * 为 Pro 用户消耗 chat 月度配额池中的一条消息。
 */
export async function consumeProChatPool(
  db: AppDb,
  userId: string,
  plan: SubscriptionPlan = 'monthly'
): Promise<{ decided: 'free' | 'overflow' }> {
  const period = quotaPeriod(plan)
  const limits = PLAN_QUOTA_LIMITS[plan]
  await getOrCreateQuota(db, userId, period)

  const result = await db
    .update(subscriptionQuotas)
    .set({
      chatPoolUsed: sql`${subscriptionQuotas.chatPoolUsed} + 1`,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(subscriptionQuotas.userId, userId),
        eq(subscriptionQuotas.month, period),
        sql`${subscriptionQuotas.chatPoolUsed} < ${limits.chatPool}`
      )
    )

  const changed = (result as unknown as { meta: { changes: number } }).meta.changes
  return { decided: changed > 0 ? 'free' : 'overflow' }
}

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

// ── 月度赠送铜钱 ───────────────────────────────────────────────────────────

// (monthly bonus credits removed — replaced by hexastral_chat_5 IAP)

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
