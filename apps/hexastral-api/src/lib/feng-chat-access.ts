/**
 * Fēng report chat access — bundled with a purchased / subscribed analyze.
 *
 * Chat is unlimited for a report when:
 *   - analyze finished (non-empty chapters), AND
 *   - user has any active subscription OR a consumed single purchase linked
 *     to this report id OR DEV-Pro bypass.
 */

import { and, eq } from 'drizzle-orm'
import { fengReports, singlePurchases } from '../db/schema'
import type { AppDb } from '../infra-types'
import { userHasAnySubscription } from './access/entitlement-access'

export type FengChatAccessCode =
  | 'FENG_ANALYZE_PENDING'
  | 'FENG_CHAT_REQUIRES_PURCHASE'
  | 'not_found'

export type FengChatAccessResult =
  | { granted: true; analyzeComplete: true }
  | { granted: false; analyzeComplete: boolean; code: FengChatAccessCode }

function parseChapterCount(chaptersJson: string): number {
  try {
    const parsed: unknown = JSON.parse(chaptersJson)
    return Array.isArray(parsed) ? parsed.length : 0
  } catch {
    return 0
  }
}

export async function checkFengChatAccess(
  db: AppDb,
  userId: string,
  reportId: string,
  opts: { devPro?: boolean } = {}
): Promise<FengChatAccessResult> {
  if (opts.devPro) {
    return { granted: true, analyzeComplete: true }
  }

  const report = await db
    .select({ chapters: fengReports.chapters })
    .from(fengReports)
    .where(and(eq(fengReports.id, reportId), eq(fengReports.userId, userId)))
    .get()

  if (!report) {
    return { granted: false, analyzeComplete: false, code: 'not_found' }
  }

  const chapterCount = parseChapterCount(report.chapters)
  if (chapterCount === 0) {
    return { granted: false, analyzeComplete: false, code: 'FENG_ANALYZE_PENDING' }
  }

  if (await userHasAnySubscription(db, userId)) {
    return { granted: true, analyzeComplete: true }
  }

  const consumed = await db
    .select({ id: singlePurchases.id })
    .from(singlePurchases)
    .where(
      and(
        eq(singlePurchases.userId, userId),
        eq(singlePurchases.skuId, 'feng_analysis'),
        eq(singlePurchases.status, 'consumed'),
        eq(singlePurchases.readingId, reportId)
      )
    )
    .get()

  if (consumed) {
    return { granted: true, analyzeComplete: true }
  }

  return { granted: false, analyzeComplete: true, code: 'FENG_CHAT_REQUIRES_PURCHASE' }
}

export function isFengDevProBypass(
  env: { ALLOW_DEV_PRO?: string; DEV_PRO_USER_IDS?: string },
  userId: string,
  headerDevPro: string | undefined
): boolean {
  const headerOk = env.ALLOW_DEV_PRO === '1' && headerDevPro === '1'
  const idOk =
    typeof env.DEV_PRO_USER_IDS === 'string' &&
    env.DEV_PRO_USER_IDS.split(',')
      .map((s) => s.trim())
      .includes(userId)
  return headerOk || idOk
}
