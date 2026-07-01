/**
 * /api/feng/jobs/:id — poll an analyze job.
 *
 * Client polls every 200ms until `stage` reaches `'done'` or `'failed'`.
 * When done, the response includes `reportId` so the client can navigate to
 * `/(report)/[siteId]` (which reads via `/api/feng/sites/:id`).
 *
 * Job rows are kept for the "last analyzed" timestamp + retry chain; the daily
 * cron (`pruneStaleFengJobs` in `feng-annual-cron.ts`) deletes terminal jobs
 * older than 30 days.
 *
 * Phase F: migrated to shared response envelope (`jsonOk` / `jsonErr`).
 */

import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { fengJobs, fengReports } from '../../db/schema'
import type { AppEnv } from '../../infra-types'
import { ApiErrorCode, jsonErr, jsonOk } from '../../lib/api-response'
import { requireUserId } from '../../lib/auth'

export const fengJobRoutes = new Hono<AppEnv>().get('/:id', async (c) => {
  const userId = requireUserId(c)
  const id = c.req.param('id')
  const db = c.get('db')

  const job = await db
    .select()
    .from(fengJobs)
    .where(and(eq(fengJobs.id, id), eq(fengJobs.userId, userId)))
    .get()
  if (!job) {
    return jsonErr(c, 404, ApiErrorCode.not_found, 'Job not found')
  }

  // Return the report as soon as `reportId` is set — the pipeline persists a
  // SHELL (排盘/八宅/形理/tiles, chapters=[]) before the slow LLM synthesis, so
  // the client renders the computed report during the wait and fills chapters
  // when they land (two-phase). `chaptersPending` distinguishes shell from final.
  let report = null
  if (job.reportId) {
    const row = await db.select().from(fengReports).where(eq(fengReports.id, job.reportId)).get()
    if (row) {
      let annotatedTiles: Array<'close' | 'mid' | 'wide'> = []
      if (row.annotatedMapKeys) {
        try {
          const parsed = JSON.parse(row.annotatedMapKeys) as Record<string, unknown>
          annotatedTiles = (['close', 'mid', 'wide'] as const).filter(
            (t) => typeof parsed[t] === 'string' && (parsed[t] as string).length > 0
          )
        } catch {
          // ignore malformed JSON; treat as no tiles
        }
      }
      // Guard the inline report parse: a single malformed column must NOT 500
      // the poller and make a DONE report read as a generation failure — the
      // client re-fetches the full report via /api/feng/sites/:id on navigate.
      try {
        const parsedChapters = JSON.parse(row.chapters) as unknown[]
        report = {
          id: row.id,
          fengYear: row.fengYear,
          currentYuan: row.currentYuan,
          chapters: parsedChapters,
          /** true while this is the shell (compute ready, chapters still generating). */
          chaptersPending: parsedChapters.length === 0,
          compute: JSON.parse(row.computeJson),
          dataQuality: JSON.parse(row.dataQuality),
          modelVersions: JSON.parse(row.modelVersions),
          annotatedTiles,
          generatedAt: row.generatedAt,
        }
      } catch {
        // leave report=null; job.stage stays 'done' so the client navigates
        // and hydrates from the sites endpoint instead of erroring here.
        report = null
      }
    }
  }

  return jsonOk(c, {
    id: job.id,
    siteId: job.siteId,
    stage: job.stage,
    progress: job.progress,
    reportId: job.reportId ?? null,
    errorMessage: job.errorMessage ?? null,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt ?? null,
    report,
  })
})
