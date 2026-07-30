/**
 * Hard-delete a portfolio user and all owned rows (Apple 5.1.1(v) / GDPR Art.17).
 *
 * Privacy policy: account data permanently deleted within 30 days of account
 * deletion. This helper runs the physical purge immediately on in-app DELETE.
 *
 * Child tables without ON DELETE CASCADE are deleted explicitly before `users`.
 * Device-scoped Auspice rows keyed as `user:<userId>` are cleared here; purely
 * anonymous `device:<id>` rows are left (no account link).
 */

import { eq, or } from 'drizzle-orm'
import {
  analyses,
  auspicePushSubs,
  birthdayReminders,
  bondInvitations,
  bondInviteCredits,
  chapterUnlockInvitations,
  contactHashes,
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

  const owner = userOwnerKey(userId)

  await db.batch([
    db
      .delete(chapterUnlockInvitations)
      .where(
        or(
          eq(chapterUnlockInvitations.inviterUserId, userId),
          eq(chapterUnlockInvitations.redeemedByUserId, userId)
        )
      ),
    db.delete(bondInvitations).where(eq(bondInvitations.inviterUserId, userId)),
    db.delete(bondInviteCredits).where(eq(bondInviteCredits.userId, userId)),
    db
      .delete(readingGifts)
      .where(or(eq(readingGifts.senderUserId, userId), eq(readingGifts.recipientUserId, userId))),
    db.delete(sharedReports).where(eq(sharedReports.userId, userId)),
    db.delete(reportChapters).where(eq(reportChapters.userId, userId)),
    db.delete(portfolioReadings).where(eq(portfolioReadings.userId, userId)),
    db.delete(dailySignals).where(eq(dailySignals.userId, userId)),
    db.delete(dailyAlmanac).where(eq(dailyAlmanac.userId, userId)),
    db.delete(dailyActivity).where(eq(dailyActivity.userId, userId)),
    db.delete(userPhysiognomyFeatures).where(eq(userPhysiognomyFeatures.userId, userId)),
    db.delete(physiognomyEvents).where(eq(physiognomyEvents.userId, userId)),
    db.delete(physiognomyReadings).where(eq(physiognomyReadings.userId, userId)),
    db.delete(pairReadings).where(eq(pairReadings.userId, userId)),
    db.delete(pairAnnualForecasts).where(eq(pairAnnualForecasts.userId, userId)),
    db.delete(pushTokens).where(eq(pushTokens.userId, userId)),
    db.delete(notificationAttributions).where(eq(notificationAttributions.userId, userId)),
    db.delete(contactHashes).where(eq(contactHashes.userId, userId)),
    db.delete(analyses).where(eq(analyses.userId, userId)),
    db.delete(divinations).where(eq(divinations.userId, userId)),
    db.delete(userCharts).where(eq(userCharts.userId, userId)),
    db.delete(conversations).where(eq(conversations.userId, userId)),
    db.delete(singlePurchases).where(eq(singlePurchases.userId, userId)),
    db.delete(freeMonthlyQuotas).where(eq(freeMonthlyQuotas.userId, userId)),
    db.delete(proMonthlyUsage).where(eq(proMonthlyUsage.userId, userId)),
    db.delete(userEntitlements).where(eq(userEntitlements.userId, userId)),
    db.delete(userCredits).where(eq(userCredits.userId, userId)),
    db.delete(lifeEvents).where(eq(lifeEvents.userId, userId)),
    db.delete(userBonds).where(eq(userBonds.ownerId, userId)),
    db.delete(userBonds).where(eq(userBonds.targetUserId, userId)),
    db.delete(kindredPushQueue).where(eq(kindredPushQueue.userId, userId)),
    db.delete(fengJobs).where(eq(fengJobs.userId, userId)),
    db.delete(fengReports).where(eq(fengReports.userId, userId)),
    db.delete(fengSites).where(eq(fengSites.userId, userId)),
    db.delete(faceoracleJobs).where(eq(faceoracleJobs.userId, userId)),
    db.delete(faceoraclePushQueue).where(eq(faceoraclePushQueue.userId, userId)),
    db.delete(faceoraclePushSubs).where(eq(faceoraclePushSubs.userId, userId)),
    db.delete(userGrowthAttributions).where(eq(userGrowthAttributions.userId, userId)),
    db.delete(watchCredentials).where(eq(watchCredentials.userId, userId)),
    db.delete(auspicePushSubs).where(eq(auspicePushSubs.portfolioUserId, userId)),
    db.delete(makeifForks).where(eq(makeifForks.owner, owner)),
    db.delete(timelineReadings).where(eq(timelineReadings.owner, owner)),
    db.delete(birthdayReminders).where(eq(birthdayReminders.owner, owner)),
  ])

  await db.delete(users).where(eq(users.id, userId))
}
