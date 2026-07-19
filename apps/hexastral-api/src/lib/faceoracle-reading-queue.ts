/**
 * FaceOracle / Xingqi reading queue — enqueue + consumer.
 *
 * Create once:
 *   cd apps/hexastral-api && bunx wrangler queues create faceoracle-reading
 */

import type { MessageBatch } from '@cloudflare/workers-types/2023-07-01'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../db/schema'
import { faceoracleJobs } from '../db/schema'
import type { CloudflareBindings } from '../infra-types'
import { markFaceoracleJobFailed, runFaceoracleReadingJob } from './faceoracle-reading-job'

export type FaceoracleReadingQueueMessage = {
  jobId: string
}

export async function enqueueFaceoracleReadingJob(
  env: CloudflareBindings,
  jobId: string
): Promise<void> {
  const queue = env.FACEORACLE_READING_QUEUE
  if (!queue) {
    console.error('[faceoracle-queue] binding missing — create faceoracle-reading queue')
    throw new Error('faceoracle_reading_queue_unavailable')
  }
  await queue.send({ jobId } satisfies FaceoracleReadingQueueMessage)
}

export async function processFaceoracleReadingQueueBatch(
  batch: MessageBatch<FaceoracleReadingQueueMessage>,
  env: CloudflareBindings
): Promise<void> {
  const db = drizzle(env.DB, { schema })

  for (const msg of batch.messages) {
    const { jobId } = msg.body
    const started = Date.now()
    try {
      const job = await db.select().from(faceoracleJobs).where(eq(faceoracleJobs.id, jobId)).get()
      if (!job) {
        msg.ack()
        continue
      }
      if (job.stage === 'done' || job.stage === 'failed') {
        msg.ack()
        continue
      }
      await runFaceoracleReadingJob(env, db, jobId)
      console.info('[faceoracle-queue] done', { jobId, durationMs: Date.now() - started })
      msg.ack()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[faceoracle-queue] error', {
        jobId,
        message,
        durationMs: Date.now() - started,
      })
      // max_retries: 2 → up to 3 deliveries (attempts 1..3). Mark failed on last try.
      const maxAttempts = 3
      if (msg.attempts >= maxAttempts) {
        try {
          await markFaceoracleJobFailed(db, jobId, message)
        } catch (markErr) {
          console.error('[faceoracle-queue] markFailed', markErr)
        }
        msg.ack()
      } else {
        msg.retry()
      }
    }
  }
}
