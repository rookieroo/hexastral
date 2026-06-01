/**
 * Fēng analyze jobs — Cloudflare Queue consumer.
 *
 * `POST /analyze` returns 202 immediately; the pipeline runs here so it is not
 * capped by the ~30s `waitUntil` budget after the client disconnects.
 *
 * Create the queue once per account:
 *   cd apps/hexastral-api && bunx wrangler queues create feng-analyze
 */

import { and, eq, isNull } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import type { MessageBatch } from '@cloudflare/workers-types/2023-07-01'
import * as schema from '../db/schema'
import { fengSites } from '../db/schema'
import type { CloudflareBindings } from '../infra-types'
import { runAnalyzeJob } from './feng-analyze'
import { fengLogger } from './logger'

export type FengAnalyzeQueueMessage = {
  jobId: string
  siteId: string
}

export async function enqueueFengAnalyzeJob(
  env: CloudflareBindings,
  jobId: string,
  siteId: string
): Promise<void> {
  const queue = env.FENG_ANALYZE_QUEUE
  if (!queue) {
    fengLogger.error('queue.binding_missing', {
      hint: 'bunx wrangler queues create feng-analyze',
    })
    throw new Error('feng_analyze_queue_unavailable')
  }
  await queue.send({ jobId, siteId } satisfies FengAnalyzeQueueMessage)
  fengLogger.info('queue.enqueued', { jobId, siteId })
}

export async function processFengAnalyzeQueueBatch(
  batch: MessageBatch<FengAnalyzeQueueMessage>,
  env: CloudflareBindings
): Promise<void> {
  const db = drizzle(env.DB, { schema })

  fengLogger.info('queue.batch.start', { size: batch.messages.length })

  for (const msg of batch.messages) {
    const { jobId, siteId } = msg.body
    const started = Date.now()
    try {
      const site = await db
        .select()
        .from(fengSites)
        .where(and(eq(fengSites.id, siteId), isNull(fengSites.deletedAt)))
        .get()

      if (!site) {
        fengLogger.warn('queue.site_missing', { jobId, siteId })
        msg.ack()
        continue
      }

      await runAnalyzeJob(env, db, jobId, site)
      fengLogger.info('queue.batch.message.done', {
        jobId,
        siteId,
        durationMs: Date.now() - started,
      })
      msg.ack()
    } catch (err) {
      fengLogger.error('queue.batch.message.error', {
        jobId,
        siteId,
        durationMs: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
      })
      msg.retry()
    }
  }
}
