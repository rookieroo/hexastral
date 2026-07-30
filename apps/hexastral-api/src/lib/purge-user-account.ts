/**
 * Hard-delete a portfolio user and all owned rows (Apple 5.1.1(v) / GDPR Art.17).
 *
 * Privacy policy: account data permanently deleted within 30 days of account
 * deletion. This helper runs the physical purge immediately on in-app DELETE.
 *
 * D1 enforces foreign keys and every FK in this schema is `ON DELETE no action`
 * (RESTRICT), so the whole purge lives in ONE ordered plan: `PURGE_STEPS` runs
 * children strictly before their parents, ending with `users`. A single D1
 * `batch()` wraps it in one transaction — either the account is gone or nothing
 * changed. Adding a table to the schema without adding it here is caught by
 * `purge-user-account.test.ts`, which walks the real FK graph.
 *
 * Rows owned by OTHER users that point at rows we drop must go too, otherwise
 * the transaction rolls back on a dangling reference:
 *   - `bond_invitations.bond_id` → bonds where the deleted user is the target
 *   - `bond_invite_credits.invite_id` → invites the deleted user sent
 *
 * Device-scoped Auspice rows keyed as `user:<userId>` are cleared here. Rows
 * keyed as `device:<deviceId>` that were linked via
 * `auspice_push_subs.portfolio_user_id` are also purged so account deletion
 * does not leave 亲友 birthdays / make-if / timeline behind.
 */

import { eq, inArray, or, type SQL } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import type { SQLiteTable } from 'drizzle-orm/sqlite-core'
import {
  analyses,
  auspicePushSubs,
  birthdayReminders,
  bondInvitations,
  bondInviteCredits,
  chapterUnlockInvitations,
  contactHashes,
  conversationMessages,
  conversations,
  dailyActivity,
  dailyAlmanac,
  dailySignals,
  divinations,
  faceoracleJobs,
  faceoraclePushQueue,
  faceoraclePushSubs,
  fengJobs,
  fengReports,
  fengSites,
  freeMonthlyQuotas,
  kindredPushQueue,
  lifeEvents,
  makeifForks,
  notificationAttributions,
  pairAnnualForecasts,
  pairReadings,
  physiognomyEvents,
  physiognomyReadings,
  portfolioReadings,
  proMonthlyUsage,
  pushTokens,
  readingGifts,
  reportChapters,
  sharedReports,
  singlePurchases,
  timelineReadings,
  userBonds,
  userCharts,
  userCredits,
  userEntitlements,
  userGrowthAttributions,
  userPhysiognomyFeatures,
  users,
  watchCredentials,
} from '../db/schema'
import type { AppDb, CloudflareBindings } from '../infra-types'
import { deleteFloorplans } from './feng-client'
import { collectFloorplanKeys } from './feng-interior-compute'

const userOwnerKey = (userId: string) => `user:${userId}`

/** Ids resolved before the batch so every step is a plain, ordered DELETE. */
export type PurgeScope = {
  userId: string
  /** `user:<id>` plus every `device:<id>` linked to this account. */
  auspiceOwners: string[]
  conversationIds: string[]
  /** Bonds owned by, or pointing at, the deleted user. */
  bondIds: string[]
  /** Invites sent by the deleted user, plus any invite on a bond we drop. */
  bondInvitationIds: string[]
  pairReadingIds: string[]
}

type PurgeStep = {
  table: SQLiteTable
  where: (scope: PurgeScope) => SQL | undefined
}

/**
 * Ordered delete plan — child tables first, `users` last. Order is load-bearing:
 * D1 checks foreign keys per statement, so reversing two entries breaks account
 * deletion for any user who has the referenced rows.
 */
export const PURGE_STEPS: readonly PurgeStep[] = [
  // Chat: messages reference conversations.
  {
    table: conversationMessages,
    where: (s) => inArray(conversationMessages.conversationId, s.conversationIds),
  },
  { table: conversations, where: (s) => eq(conversations.userId, s.userId) },

  // Bonds: credits → invitations → bonds → pair readings.
  {
    table: bondInviteCredits,
    where: (s) =>
      or(
        eq(bondInviteCredits.userId, s.userId),
        inArray(bondInviteCredits.inviteId, s.bondInvitationIds)
      ),
  },
  { table: bondInvitations, where: (s) => inArray(bondInvitations.id, s.bondInvitationIds) },
  { table: kindredPushQueue, where: (s) => eq(kindredPushQueue.userId, s.userId) },
  {
    table: pairAnnualForecasts,
    where: (s) =>
      or(
        eq(pairAnnualForecasts.userId, s.userId),
        inArray(pairAnnualForecasts.pairReadingId, s.pairReadingIds)
      ),
  },
  { table: userBonds, where: (s) => inArray(userBonds.id, s.bondIds) },
  { table: pairReadings, where: (s) => eq(pairReadings.userId, s.userId) },

  // Feng: jobs → reports → sites.
  { table: fengJobs, where: (s) => eq(fengJobs.userId, s.userId) },
  { table: fengReports, where: (s) => eq(fengReports.userId, s.userId) },
  { table: fengSites, where: (s) => eq(fengSites.userId, s.userId) },

  // Flat, dependency-free owned rows.
  {
    table: chapterUnlockInvitations,
    where: (s) =>
      or(
        eq(chapterUnlockInvitations.inviterUserId, s.userId),
        eq(chapterUnlockInvitations.redeemedByUserId, s.userId)
      ),
  },
  {
    table: readingGifts,
    where: (s) =>
      or(eq(readingGifts.senderUserId, s.userId), eq(readingGifts.recipientUserId, s.userId)),
  },
  { table: sharedReports, where: (s) => eq(sharedReports.userId, s.userId) },
  { table: reportChapters, where: (s) => eq(reportChapters.userId, s.userId) },
  { table: portfolioReadings, where: (s) => eq(portfolioReadings.userId, s.userId) },
  { table: dailySignals, where: (s) => eq(dailySignals.userId, s.userId) },
  { table: dailyAlmanac, where: (s) => eq(dailyAlmanac.userId, s.userId) },
  { table: dailyActivity, where: (s) => eq(dailyActivity.userId, s.userId) },
  { table: userPhysiognomyFeatures, where: (s) => eq(userPhysiognomyFeatures.userId, s.userId) },
  { table: physiognomyEvents, where: (s) => eq(physiognomyEvents.userId, s.userId) },
  { table: physiognomyReadings, where: (s) => eq(physiognomyReadings.userId, s.userId) },
  { table: pushTokens, where: (s) => eq(pushTokens.userId, s.userId) },
  { table: notificationAttributions, where: (s) => eq(notificationAttributions.userId, s.userId) },
  { table: contactHashes, where: (s) => eq(contactHashes.userId, s.userId) },
  { table: analyses, where: (s) => eq(analyses.userId, s.userId) },
  { table: divinations, where: (s) => eq(divinations.userId, s.userId) },
  { table: userCharts, where: (s) => eq(userCharts.userId, s.userId) },
  { table: singlePurchases, where: (s) => eq(singlePurchases.userId, s.userId) },
  { table: freeMonthlyQuotas, where: (s) => eq(freeMonthlyQuotas.userId, s.userId) },
  { table: proMonthlyUsage, where: (s) => eq(proMonthlyUsage.userId, s.userId) },
  { table: userEntitlements, where: (s) => eq(userEntitlements.userId, s.userId) },
  { table: userCredits, where: (s) => eq(userCredits.userId, s.userId) },
  { table: lifeEvents, where: (s) => eq(lifeEvents.userId, s.userId) },
  { table: faceoracleJobs, where: (s) => eq(faceoracleJobs.userId, s.userId) },
  { table: faceoraclePushQueue, where: (s) => eq(faceoraclePushQueue.userId, s.userId) },
  { table: faceoraclePushSubs, where: (s) => eq(faceoraclePushSubs.userId, s.userId) },
  { table: userGrowthAttributions, where: (s) => eq(userGrowthAttributions.userId, s.userId) },
  { table: watchCredentials, where: (s) => eq(watchCredentials.userId, s.userId) },
  { table: auspicePushSubs, where: (s) => eq(auspicePushSubs.portfolioUserId, s.userId) },
  { table: makeifForks, where: (s) => inArray(makeifForks.owner, s.auspiceOwners) },
  { table: timelineReadings, where: (s) => inArray(timelineReadings.owner, s.auspiceOwners) },
  { table: birthdayReminders, where: (s) => inArray(birthdayReminders.owner, s.auspiceOwners) },

  { table: users, where: (s) => eq(users.id, s.userId) },
]

async function resolvePurgeScope(db: AppDb, userId: string): Promise<PurgeScope> {
  const [linkedSubs, convRows, bondRows, pairRows] = await Promise.all([
    db
      .select({ deviceId: auspicePushSubs.deviceId })
      .from(auspicePushSubs)
      .where(eq(auspicePushSubs.portfolioUserId, userId))
      .all(),
    db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .all(),
    db
      .select({ id: userBonds.id })
      .from(userBonds)
      .where(or(eq(userBonds.ownerId, userId), eq(userBonds.targetUserId, userId)))
      .all(),
    db
      .select({ id: pairReadings.id })
      .from(pairReadings)
      .where(eq(pairReadings.userId, userId))
      .all(),
  ])

  const bondIds = bondRows.map((r) => r.id)
  const inviteRows = await db
    .select({ id: bondInvitations.id })
    .from(bondInvitations)
    .where(or(eq(bondInvitations.inviterUserId, userId), inArray(bondInvitations.bondId, bondIds)))
    .all()

  return {
    userId,
    auspiceOwners: [userOwnerKey(userId), ...linkedSubs.map((s) => `device:${s.deviceId}`)],
    conversationIds: convRows.map((r) => r.id),
    bondIds,
    bondInvitationIds: inviteRows.map((r) => r.id),
    pairReadingIds: pairRows.map((r) => r.id),
  }
}

export async function purgeUserAccount(
  db: AppDb,
  env: CloudflareBindings,
  userId: string,
  waitUntil: (p: Promise<unknown>) => void
): Promise<void> {
  const user = await db.select().from(users).where(eq(users.id, userId)).get()
  if (!user) return

  // R2 avatar
  if (user.avatarKey?.startsWith(`avatars/${userId}/`)) {
    waitUntil(env.MEDIA_BUCKET.delete(user.avatarKey))
  }

  // Feng floorplans must leave R2 before site rows drop (no lifecycle GC).
  const fpRows = await db
    .select({ floorplanKey: fengSites.floorplanKey, floorplanJson: fengSites.floorplanJson })
    .from(fengSites)
    .where(eq(fengSites.userId, userId))
    .all()
  const fpKeys = [...new Set(fpRows.flatMap(collectFloorplanKeys))]
  if (fpKeys.length > 0) {
    waitUntil(
      deleteFloorplans(env.SVC_FENG, fpKeys).catch((err) => {
        console.error('feng.floorplan_purge_failed', { userId, error: String(err) })
      })
    )
  }

  // Best-effort AI Search memory: delete indexed readings for this user.
  const memoryInst = env.PORTFOLIO_MEMORY_AI_SEARCH
  if (memoryInst) {
    waitUntil(
      (async () => {
        try {
          const readings = await db
            .select({ id: portfolioReadings.id })
            .from(portfolioReadings)
            .where(eq(portfolioReadings.userId, userId))
            .all()
          for (const r of readings) {
            try {
              const list = await memoryInst.items.list({ search: r.id, per_page: 30 })
              const needle = `_${userId}_${r.id}`
              for (const item of list.result ?? []) {
                if (typeof item.key === 'string' && item.key.includes(needle) && item.id) {
                  await memoryInst.items.delete(item.id)
                }
              }
            } catch (err) {
              console.error('portfolio_memory_purge_item_failed', {
                userId,
                readingId: r.id,
                error: String(err),
              })
            }
          }
        } catch (err) {
          console.error('portfolio_memory_purge_failed', { userId, error: String(err) })
        }
      })()
    )
  }

  const scope = await resolvePurgeScope(db, userId)
  const statements: BatchItem<'sqlite'>[] = PURGE_STEPS.map((step) => {
    const predicate = step.where(scope)
    // An unfiltered DELETE would wipe the table for every user — refuse instead.
    if (!predicate) throw new Error('purge step resolved to an unscoped delete')
    return db.delete(step.table).where(predicate)
  })
  const [head, ...tail] = statements
  if (!head) return
  await db.batch([head, ...tail])
}
