/**
 * FaceOracle / Xingqi async reading jobs — enqueue + poll.
 * POST returns 202; queue consumer runs interpretation.
 */

import { and, desc, eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { nanoid } from 'nanoid'
import { z } from 'zod/v4'
import { faceoracleJobs, portfolioReadings, users } from '../../db/schema'
import type { AppEnv } from '../../infra-types'
import { resolveEpisodicAccess } from '../../lib/access/episodic'
import { jsonOk } from '../../lib/api-response'
import { requireUserId } from '../../lib/auth'
import { BIOMETRIC_CONSENT_VERSION, hasBiometricConsent } from '../../lib/biometric-consent'
import {
  featuresUnchangedPayload,
  parseReadingFeatureIds,
  sameFaceoracleFeatures,
  type FaceoracleFeatureTriple,
} from '../../lib/faceoracle-job-dedupe'
import {
  refundFaceoracleJobAccess,
  sweepStaleFaceoracleJobs,
} from '../../lib/faceoracle-reading-job'
import { enqueueFaceoracleReadingJob } from '../../lib/faceoracle-reading-queue'
import { hasActiveEntitlement } from '../../services/entitlements'
import {
  checkAndConsumeFaceoraclePhotoSlots,
  checkAndConsumeFaceoracleReportRegen,
} from '../../services/quota'

const createJobSchema = z.object({
  faceFeatureId: z.string().min(1),
  palmLeftFeatureId: z.string().min(1),
  palmRightFeatureId: z.string().min(1),
  solarDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeIndex: z.number().int().min(0).max(12),
  gender: z.enum(['男', '女']),
  city: z.string().max(128).optional(),
  locale: z.string().max(16).min(1),
  outputKind: z.enum(['oneshot', 'period_brief', 'deep']).default('oneshot'),
  horizonMonths: z.union([z.literal(3), z.literal(6)]).default(3),
  updateKind: z.enum(['full', 'partial']).default('full'),
  partialParts: z.array(z.enum(['face', 'palm_l', 'palm_r'])).optional(),
  notifyOnComplete: z.boolean().default(true),
  /** Same feature triple; new body/locale — consumes report regen, not photo slots. */
  regen: z.boolean().default(false),
})

type JobRow = typeof faceoracleJobs.$inferSelect

function jobToClient(job: JobRow, resultPayload: string | null = null) {
  return {
    jobId: job.id,
    stage: job.stage,
    progress: job.progress,
    readingId: job.readingId,
    errorMessage: job.errorMessage,
    resultPayload,
    finishedAt: job.finishedAt,
    createdAt: job.createdAt,
    faceFeatureId: job.faceFeatureId,
    palmLeftFeatureId: job.palmLeftFeatureId,
    palmRightFeatureId: job.palmRightFeatureId,
    outputKind: job.outputKind,
  }
}

export const physiognomyJobsRoutes = new Hono<AppEnv>()

/**
 * Active (queued|interpreting) job for the signed-in user — used to restore
 * progress after app quit.
 */
physiognomyJobsRoutes.get('/active', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')
  await sweepStaleFaceoracleJobs(db, userId)
  const job = await db
    .select()
    .from(faceoracleJobs)
    .where(
      and(
        eq(faceoracleJobs.userId, userId),
        inArray(faceoracleJobs.stage, ['queued', 'interpreting'])
      )
    )
    .orderBy(desc(faceoracleJobs.createdAt))
    .get()
  if (!job) return jsonOk(c, { job: null })
  return jsonOk(c, { job: jobToClient(job) })
})

physiognomyJobsRoutes.post('/', async (c) => {
  const userId = requireUserId(c)
  const body = createJobSchema.parse(await c.req.json())
  const db = c.get('db')

  const user = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).get()
  if (!user) throw new HTTPException(404, { message: 'User not found' })

  if (!(await hasBiometricConsent(db, userId))) {
    return c.json(
      { error: 'biometric_consent_required', consentVersion: BIOMETRIC_CONSENT_VERSION },
      403
    )
  }

  await sweepStaleFaceoracleJobs(db, userId)

  const incoming: FaceoracleFeatureTriple = {
    faceFeatureId: body.faceFeatureId,
    palmLeftFeatureId: body.palmLeftFeatureId,
    palmRightFeatureId: body.palmRightFeatureId,
  }

  // Dedup — same features return existing; different features replace stale active.
  const existing = await db
    .select()
    .from(faceoracleJobs)
    .where(
      and(
        eq(faceoracleJobs.userId, userId),
        inArray(faceoracleJobs.stage, ['queued', 'interpreting'])
      )
    )
    .get()
  if (existing) {
    if (sameFaceoracleFeatures(incoming, existing)) {
      console.info('[faceoracle.job] deduped', { userId, jobId: existing.id })
      return jsonOk(c, { ...jobToClient(existing), deduped: true }, 202)
    }
    // New photos while another job is in flight — cancel + refund the old one.
    await refundFaceoracleJobAccess(db, existing)
    await db
      .update(faceoracleJobs)
      .set({
        stage: 'failed',
        progress: 100,
        errorMessage: 'replaced_by_new_features',
        finishedAt: new Date().toISOString(),
      })
      .where(eq(faceoracleJobs.id, existing.id))
  }

  // Reject re-read only while a portfolio reading with the same feature triple
  // still exists — unless this is an explicit Pro report regen (new locale/body).
  const recentReadings = await db
    .select({ id: portfolioReadings.id, inputJson: portfolioReadings.inputJson })
    .from(portfolioReadings)
    .where(and(eq(portfolioReadings.userId, userId), eq(portfolioReadings.targetApp, 'faceoracle')))
    .orderBy(desc(portfolioReadings.createdAt))
    .limit(20)
  const conflicting = recentReadings.find((row) => {
    const feats = parseReadingFeatureIds(row.inputJson)
    return feats != null && sameFaceoracleFeatures(incoming, feats)
  })
  if (conflicting && !body.regen) {
    return c.json(featuresUnchangedPayload(conflicting.id), 409)
  }

  const isFacePro =
    (await hasActiveEntitlement(db, userId, 'faceoracle_pro')) ||
    (await hasActiveEntitlement(db, userId, 'universe_pro'))

  // DEV client (__DEV__) sends x-xingqi-dev-quota when ALLOW_DEV_PRO=1 — skip monthly meters.
  const envAllow = (c.env as { ALLOW_DEV_PRO?: string }).ALLOW_DEV_PRO
  const devQuotaBypass = envAllow === '1' && c.req.header('x-xingqi-dev-quota') === '1'

  let accessVia: string | null = null
  let creditSource: string | null = null
  let slotsCharged = 0
  const isReportRegen = Boolean(body.regen && conflicting)

  if (isReportRegen) {
    if (!isFacePro) {
      return c.json(
        {
          error: 'purchase_required',
          capability: 'face',
          upsell: 'faceoracle_pro',
        },
        402
      )
    }
    if (!devQuotaBypass) {
      const regen = await checkAndConsumeFaceoracleReportRegen(db, userId)
      if (!regen.granted) {
        return c.json(
          {
            error: 'report_regen_exhausted',
            used: regen.used,
            limit: regen.limit,
            upsell: 'faceoracle_pro',
          },
          402
        )
      }
    }
    accessVia = 'pro_report_regen'
    slotsCharged = 0
  } else if (isFacePro) {
    const slots = 3
    if (!devQuotaBypass) {
      const slot = await checkAndConsumeFaceoraclePhotoSlots(db, userId, slots)
      if (!slot.granted) {
        return c.json(
          {
            error: 'photo_slot_exhausted',
            used: slot.used,
            limit: slot.limit,
            upsell: 'faceoracle_reading',
          },
          402
        )
      }
      slotsCharged = slots
    } else {
      slotsCharged = 0
    }
    accessVia = 'pro_slots'
  } else {
    const access = await resolveEpisodicAccess(db, userId, 'face')
    if (!access.granted) {
      return c.json(
        {
          error: 'purchase_required',
          capability: 'face',
          upsell: access.upsellProductId,
        },
        402
      )
    }
    accessVia = 'face_credit'
    creditSource = access.via
  }

  const jobId = nanoid()
  const now = new Date().toISOString()
  const inserted: JobRow = {
    id: jobId,
    userId,
    stage: 'queued',
    progress: 0,
    locale: body.locale,
    outputKind: body.outputKind,
    horizonMonths: body.horizonMonths,
    faceFeatureId: body.faceFeatureId,
    palmLeftFeatureId: body.palmLeftFeatureId,
    palmRightFeatureId: body.palmRightFeatureId,
    solarDate: body.solarDate,
    timeIndex: body.timeIndex,
    gender: body.gender,
    city: body.city ?? null,
    readingId: null,
    errorMessage: null,
    notifyOnComplete: body.notifyOnComplete,
    accessVia,
    creditSource,
    slotsCharged,
    refunded: false,
    startedAt: now,
    finishedAt: null,
    createdAt: now,
  }
  await db.insert(faceoracleJobs).values(inserted)

  try {
    await enqueueFaceoracleReadingJob(c.env, jobId)
  } catch (err) {
    await refundFaceoracleJobAccess(db, inserted)
    await db
      .update(faceoracleJobs)
      .set({
        stage: 'failed',
        progress: 100,
        errorMessage: 'queue_unavailable',
        finishedAt: new Date().toISOString(),
        refunded: true,
      })
      .where(eq(faceoracleJobs.id, jobId))
    throw err instanceof HTTPException
      ? err
      : new HTTPException(503, { message: 'queue_unavailable' })
  }

  return jsonOk(c, { ...jobToClient(inserted), deduped: false }, 202)
})

physiognomyJobsRoutes.get('/:id', async (c) => {
  const userId = requireUserId(c)
  const id = c.req.param('id')
  const db = c.get('db')

  const job = await db.select().from(faceoracleJobs).where(eq(faceoracleJobs.id, id)).get()
  if (!job || job.userId !== userId) {
    throw new HTTPException(404, { message: 'Job not found' })
  }

  let resultPayload: string | null = null
  if (job.stage === 'done' && job.readingId) {
    const reading = await db
      .select({ resultJson: portfolioReadings.resultJson })
      .from(portfolioReadings)
      .where(eq(portfolioReadings.id, job.readingId))
      .get()
    resultPayload = reading?.resultJson ?? null
  }

  return jsonOk(c, jobToClient(job, resultPayload))
})
