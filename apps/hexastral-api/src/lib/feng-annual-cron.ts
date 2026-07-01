/**
 * Annual 立春 refresh — keeps every Fēng site's report current with the
 * latest 流年 (year-pillar transit).
 *
 * Approach:
 *   1. Compute the "feng year" — the year whose 立春 has already passed.
 *   2. Find feng_sites whose most-recent feng_report is from a prior feng year
 *      (i.e., haven't been re-synthesized for the new year).
 *   3. Enqueue a fresh analyze job for each, capped per run to avoid stampede.
 *
 * The query is naturally idempotent: once a site's new-year report lands, the
 * next cron run will not re-enqueue it. Brand-new sites with no prior reports
 * are excluded — their first analyze is triggered by the user, not the cron.
 *
 * Wired into the daily 04:00 UTC scheduled handler in `index.ts`.
 */

import { getJieQiDay } from '@zhop/astro-core/jieqi'
import { and, eq, inArray, isNull, lt, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { nanoid } from 'nanoid'
import * as schema from '../db/schema'
import { fengJobs, fengReports, fengSites } from '../db/schema'
import type { CloudflareBindings } from '../infra-types'
import { enqueueFengAnalyzeJob } from './feng-analyze-queue'

/** Index of 立春 in JIEQI_ORDER (小寒 = 0, 大寒 = 1, 立春 = 2, …) */
const LICHUN_JIEQI_INDEX = 2

/** Cap per cron run — prevents stampede on the first cron after a 立春 rollover. */
const MAX_SITES_PER_RUN = 25

/**
 * The current "feng year" is the Gregorian year whose 立春 has already passed.
 * Before 立春 (early January / early February), the feng year is still last year.
 * After 立春 (mid-February onward), the feng year advances.
 */
export function getCurrentFengYear(now: Date = new Date()): number {
  const year = now.getUTCFullYear()
  // 立春 is always in early February; computeJieQiDay returns the day of Feb.
  const lichunDay = getJieQiDay(year, LICHUN_JIEQI_INDEX)
  // Compare against 00:00 UTC on the lichun date.
  const lichunUTC = Date.UTC(year, 1, lichunDay)
  return now.getTime() >= lichunUTC ? year : year - 1
}

export interface AnnualRefreshResult {
  fengYear: number
  enqueued: number
  considered: number
}

/**
 * Find sites needing a refresh + enqueue analyze jobs for them.
 * Each site gets a queue message (same path as user-triggered analyze).
 */
export async function runAnnualFengRefresh(env: CloudflareBindings): Promise<AnnualRefreshResult> {
  const db = drizzle(env.DB, { schema })
  const fengYear = getCurrentFengYear()

  // Latest fengYear per site — sites with no reports drop out of the join.
  const latestYears = db
    .select({
      siteId: fengReports.siteId,
      maxYear: sql<number>`MAX(${fengReports.fengYear})`.as('max_year'),
    })
    .from(fengReports)
    .groupBy(fengReports.siteId)
    .as('latest_years')

  const rows = await db
    .select({ site: fengSites, maxYear: latestYears.maxYear })
    .from(fengSites)
    .innerJoin(latestYears, eq(latestYears.siteId, fengSites.id))
    .where(and(isNull(fengSites.deletedAt), sql`${latestYears.maxYear} < ${fengYear}`))
    .limit(MAX_SITES_PER_RUN)
    .all()

  for (const row of rows) {
    const jobId = nanoid()
    await db.insert(fengJobs).values({
      id: jobId,
      siteId: row.site.id,
      userId: row.site.userId,
      stage: 'maps',
      progress: 0,
      startedAt: new Date().toISOString(),
    })
    await enqueueFengAnalyzeJob(env, jobId, row.site.id)
  }

  return { fengYear, enqueued: rows.length, considered: rows.length }
}

/** Terminal (done/failed) jobs older than this are pruned by the daily cron. */
const JOB_RETENTION_DAYS = 30

/**
 * Delete terminal `feng_jobs` rows older than {@link JOB_RETENTION_DAYS}.
 *
 * Only `done` / `failed` rows are touched — in-flight jobs have a null
 * `finishedAt`, which `lt(...)` never matches, so they are always safe. The
 * report rows the client actually reads live in `feng_reports`; jobs are just
 * progress scratch space, so a 30-day window is generous.
 */
export async function pruneStaleFengJobs(
  env: CloudflareBindings
): Promise<{ deleted: number; shellsDeleted: number }> {
  const db = drizzle(env.DB, { schema })
  const cutoff = new Date(Date.now() - JOB_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const deleted = await db
    .delete(fengJobs)
    .where(and(inArray(fengJobs.stage, ['done', 'failed']), lt(fengJobs.finishedAt, cutoff)))
    .returning({ id: fengJobs.id })

  // Defense-in-depth: purge orphaned two-phase SHELL reports (chapters='[]') that
  // the failure-catch in runAnalyzeJob didn't clean — e.g. a worker crash between
  // the shell insert and the catch. Synthesis takes minutes, so a shell older than
  // a day is definitively orphaned; a live in-flight run's shell is always younger.
  const shellCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const shells = await db
    .delete(fengReports)
    .where(and(eq(fengReports.chapters, '[]'), lt(fengReports.generatedAt, shellCutoff)))
    .returning({ id: fengReports.id })

  return { deleted: deleted.length, shellsDeleted: shells.length }
}
