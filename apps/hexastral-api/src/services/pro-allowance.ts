/**
 * Yuel Pro 月度额度 — the subscription's metered features.
 *
 * Pro is "更宽裕的额度", not "无限": LLM-cost features (追问/chat · 假如 explain ·
 * 换视角/reroll) and 合盘 unlock/recompute each have a monthly cap. Resets monthly
 * (new month = a fresh row). Soft cap: when exhausted the caller returns a graceful
 * signal (no LLM / no unlock), never a hard crash.
 */

import { and, eq, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { proMonthlyUsage } from '../db/schema'
import type { AppDb } from '../infra-types'

/** Monthly caps per Pro feature. Tuned to bound cost while feeling generous. */
export const PRO_MONTHLY_LIMITS = {
  /** 划词追问 (AI chat) */
  chat: 150,
  /** 时间线节点深解 (LLM 假如/timeline) — reserved; see Phase 3 notes, not yet wired. */
  explain: 30,
  /** 换视角 (chapter re-roll) */
  reroll: 5,
  /** 合盘全开 unlock 或按新生辰 recompute */
  synastry_unlock: 3,
} as const

export type ProFeature = keyof typeof PRO_MONTHLY_LIMITS

/** The drizzle column tracking each feature's monthly count (for WHERE + re-read). */
const FEATURE_COLUMN = {
  chat: proMonthlyUsage.chatUsed,
  explain: proMonthlyUsage.explainUsed,
  reroll: proMonthlyUsage.rerollUsed,
  synastry_unlock: proMonthlyUsage.synastryUnlockUsed,
} as const

/** Type-safe `.set()` increment per feature (Drizzle keys are TS property names). */
function incrementSet(feature: ProFeature) {
  const updatedAt = new Date().toISOString()
  switch (feature) {
    case 'chat':
      return { chatUsed: sql`${proMonthlyUsage.chatUsed} + 1`, updatedAt }
    case 'explain':
      return { explainUsed: sql`${proMonthlyUsage.explainUsed} + 1`, updatedAt }
    case 'reroll':
      return { rerollUsed: sql`${proMonthlyUsage.rerollUsed} + 1`, updatedAt }
    case 'synastry_unlock':
      return { synastryUnlockUsed: sql`${proMonthlyUsage.synastryUnlockUsed} + 1`, updatedAt }
  }
}

/** Current UTC month string YYYY-MM (mirrors quota.ts currentMonth). */
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

/** First day of the month AFTER `month` (YYYY-MM-DD UTC) — when the allowance resets. */
export function resetsOn(month: string = currentMonth()): string {
  const [y, m] = month.split('-').map((n) => Number.parseInt(n, 10))
  const year = m === 12 ? (y ?? 0) + 1 : (y ?? 0)
  const next = m === 12 ? 1 : (m ?? 0) + 1
  return `${year}-${String(next).padStart(2, '0')}-01`
}

export interface ProAllowanceResult {
  granted: boolean
  used: number
  limit: number
  remaining: number
  resetsOn: string
}

/**
 * Atomically check + consume one unit of a Pro feature's monthly allowance.
 * `granted: false` means the cap is reached — the caller should soft-block.
 */
export async function consumeProAllowance(
  db: AppDb,
  userId: string,
  feature: ProFeature
): Promise<ProAllowanceResult> {
  const month = currentMonth()
  const limit = PRO_MONTHLY_LIMITS[feature]
  const column = FEATURE_COLUMN[feature]

  await db.insert(proMonthlyUsage).values({ id: nanoid(), userId, month }).onConflictDoNothing()

  const result = await db
    .update(proMonthlyUsage)
    .set(incrementSet(feature))
    .where(
      and(
        eq(proMonthlyUsage.userId, userId),
        eq(proMonthlyUsage.month, month),
        sql`${column} < ${limit}`
      )
    )

  const changed = (result as unknown as { meta: { changes: number } }).meta.changes
  const granted = changed > 0
  const row = await db
    .select({ used: column })
    .from(proMonthlyUsage)
    .where(and(eq(proMonthlyUsage.userId, userId), eq(proMonthlyUsage.month, month)))
    .get()
  const used = row?.used ?? (granted ? 1 : limit)
  return { granted, used, limit, remaining: Math.max(0, limit - used), resetsOn: resetsOn(month) }
}

/** Read-only status for ALL Pro features this month (drives the client's remaining UI). */
export async function getProAllowanceStatus(
  db: AppDb,
  userId: string
): Promise<
  Record<ProFeature, { used: number; limit: number; remaining: number }> & { resetsOn: string }
> {
  const month = currentMonth()
  const row = await db
    .select({
      chat: proMonthlyUsage.chatUsed,
      explain: proMonthlyUsage.explainUsed,
      reroll: proMonthlyUsage.rerollUsed,
      synastryUnlock: proMonthlyUsage.synastryUnlockUsed,
    })
    .from(proMonthlyUsage)
    .where(and(eq(proMonthlyUsage.userId, userId), eq(proMonthlyUsage.month, month)))
    .get()

  const mk = (feature: ProFeature, used: number) => ({
    used,
    limit: PRO_MONTHLY_LIMITS[feature],
    remaining: Math.max(0, PRO_MONTHLY_LIMITS[feature] - used),
  })
  return {
    chat: mk('chat', row?.chat ?? 0),
    explain: mk('explain', row?.explain ?? 0),
    reroll: mk('reroll', row?.reroll ?? 0),
    synastry_unlock: mk('synastry_unlock', row?.synastryUnlock ?? 0),
    resetsOn: resetsOn(month),
  }
}
