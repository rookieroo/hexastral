/**
 * FaceOracle / Xingqi async reading jobs — enqueue + poll.
 * POST returns 202; queue consumer runs extract (if ephemeral) then interpretation.
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
  type FaceoracleFeatureTriple,
  featuresUnchangedPayload,
  parseReadingFeatureIds,
  sameFaceoracleFeatures,
} from '../../lib/faceoracle-job-dedupe'
import {
  deleteEphemeralObjects,
  ephemeralKeyList,
  ephemeralKeyOwnedByUser,
  ephemeralKeysSchema,
  parseEphemeralKeysJson,
} from '../../lib/faceoracle-ephemeral-keys'
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

const ACTIVE_STAGES = ['extracting', 'queued', 'interpreting'] as const

const createJobSchema = z
  .object({
    faceFeatureId: z.string().min(1).optional(),
    palmLeftFeatureId: z.string().min(1).optional(),
    palmRightFeatureId: z.string().min(1).optional(),
    ephemeralKeys: ephemeralKeysSchema.optional(),
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
  .superRefine((body, ctx) => {
    const ek = body.ephemeralKeys
    const hasFace = Boolean(body.faceFeatureId || ek?.face)
    const hasL = Boolean(body.palmLeftFeatureId || ek?.palm_l)
    const hasR = Boolean(body.palmRightFeatureId || ek?.palm_r)
    if (!hasFace || !hasL || !hasR) {
      ctx.addIssue({
        code: 'custom',
        message: 'features_or_ephemeral_incomplete',
      })
    }
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

function maybeTriple(body: {
  faceFeatureId?: string
  palmLeftFeatureId?: string
  palmRightFeatureId?: string
}): FaceoracleFeatureTriple | null {
  if (!body.faceFeatureId || !body.palmLeftFeatureId || !body.palmRightFeatureId) return null
  return {
    faceFeatureId: body.faceFeatureId,
    palmLeftFeatureId: body.palmLeftFeatureId,
    palmRightFeatureId: body.palmRightFeatureId,
  }
}

export const physiognomyJobsRoutes = new Hono<AppEnv>()

/**
 * Active (extracting|queued|interpreting) job for the signed-in user — used to restore
 * progress after app quit.
 */
physiognomyJobsRoutes.get('/active', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')
  await sweepStaleFaceoracleJobs(db, userId, c.env)
  const job = await db
    .select()
    .from(faceoracleJobs)
    .where(
      and(eq(faceoracleJobs.userId, userId), inArray(faceoracleJobs.stage, [...ACTIVE_STAGES]))
    )
    .orderBy(desc(faceoracleJobs.createdAt))
    .get()
  if (!job) return jsonOk(c, { job: null })

  // Same stuck-queue recovery as GET /:id.
  if (job.stage === 'queued' || job.stage === 'extracting') {
    const started = Date.parse(job.startedAt || job.createdAt)
    if (Number.isFinite(started) && Date.now() - started > 90_000) {
      try {
        await enqueueFaceoracleReadingJob(c.env, job.id)
        console.info('[faceoracle.job] re-enqueued stuck active', {
          jobId: job.id,
          stage: job.stage,
        })
      } catch (err) {
        console.error('[faceoracle.job] re-enqueue failed', job.id, err)
      }
    }
  }

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

  const ephemeralKeys = body.ephemeralKeys ?? null
  if (ephemeralKeys) {
    for (const key of ephemeralKeyList(ephemeralKeys)) {
      if (!ephemeralKeyOwnedByUser(key, userId)) {
        throw new HTTPException(400, { message: 'invalid_ephemeral_key' })
      }
    }
  }

  await sweepStaleFaceoracleJobs(db, userId, c.env)

  const incoming = maybeTriple(body)

  // Dedup — same features return existing; different features replace stale active.
  const existing = await db
    .select()
    .from(faceoracleJobs)
    .where(
      and(eq(faceoracleJobs.userId, userId), inArray(faceoracleJobs.stage, [...ACTIVE_STAGES]))
    )
    .get()
  if (existing) {
    const existingTriple =
      existing.faceFeatureId && existing.palmLeftFeatureId && existing.palmRightFeatureId
        ? {
            faceFeatureId: existing.faceFeatureId,
            palmLeftFeatureId: existing.palmLeftFeatureId,
            palmRightFeatureId: existing.palmRightFeatureId,
          }
        : null
    if (incoming && existingTriple && sameFaceoracleFeatures(incoming, existingTriple)) {
      console.info('[faceoracle.job] deduped', { userId, jobId: existing.id })
      if (existing.stage === 'queued' || existing.stage === 'extracting') {
        const started = Date.parse(existing.startedAt || existing.createdAt)
        if (Number.isFinite(started) && Date.now() - started > 90_000) {
          try {
            await enqueueFaceoracleReadingJob(c.env, existing.id)
            console.info('[faceoracle.job] re-enqueued stuck (dedupe)', {
              jobId: existing.id,
            })
          } catch (err) {
            console.error('[faceoracle.job] re-enqueue failed', existing.id, err)
          }
        }
      }
      return jsonOk(c, { ...jobToClient(existing), deduped: true }, 202)
    }
    // New photos while another job is in flight — cancel + refund the old one.
    const oldKeys = parseEphemeralKeysJson(existing.ephemeralKeysJson)
    if (oldKeys && c.env.FACE_EPHEMERAL_BUCKET) {
      await deleteEphemeralObjects(c.env.FACE_EPHEMERAL_BUCKET, ephemeralKeyList(oldKeys))
    }
    await refundFaceoracleJobAccess(db, existing)
    await db
      .update(faceoracleJobs)
      .set({
        stage: 'failed',
        progress: 100,
        errorMessage: 'replaced_by_new_features',
        finishedAt: new Date().toISOString(),
        ephemeralKeysJson: null,
      })
      .where(eq(faceoracleJobs.id, existing.id))
  }

  // Reject re-read only while a portfolio reading with the same feature triple
  // still exists — unless this is an explicit Pro report regen (new locale/body).
  // Ephemeral-only jobs skip this check (IDs unknown until extract).
  const recentReadings = await db
    .select({ id: portfolioReadings.id, inputJson: portfolioReadings.inputJson })
    .from(portfolioReadings)
    .where(and(eq(portfolioReadings.userId, userId), eq(portfolioReadings.targetApp, 'faceoracle')))
    .orderBy(desc(portfolioReadings.createdAt))
    .limit(20)
  const conflicting =
    incoming != null
      ? recentReadings.find((row) => {
          const feats = parseReadingFeatureIds(row.inputJson)
          return feats != null && sameFaceoracleFeatures(incoming, feats)
        })
      : undefined
  // DEV (ALLOW_DEV_PRO + x-xingqi-dev-quota): allow same-photo re-read as regen
  // without requiring the client to set regen=true (home CTA otherwise 409s).
  const envAllow = (c.env as { ALLOW_DEV_PRO?: string }).ALLOW_DEV_PRO
  const devQuotaBypass = envAllow === '1' && c.req.header('x-xingqi-dev-quota') === '1'
  if (conflicting && !body.regen && !devQuotaBypass) {
    return c.json(featuresUnchangedPayload(conflicting.id), 409)
  }

  const isFacePro =
    (await hasActiveEntitlement(db, userId, 'faceoracle_pro')) ||
    (await hasActiveEntitlement(db, userId, 'universe_pro')) ||
    devQuotaBypass

  let accessVia: string | null = null
  let creditSource: string | null = null
  let slotsCharged = 0
  const isReportRegen = Boolean((body.regen || devQuotaBypass) && conflicting)

  // Resolve partial vs full photo billing (period carry).
  let effectiveUpdateKind: 'full' | 'partial' = body.updateKind === 'partial' ? 'partial' : 'full'
  let effectivePartialParts: Array<'face' | 'palm_l' | 'palm_r'> | null = null
  if (!isReportRegen && effectiveUpdateKind === 'partial') {
    const raw = body.partialParts ?? []
    let uniq = [...new Set(raw)].filter(
      (p): p is 'face' | 'palm_l' | 'palm_r' => p === 'face' || p === 'palm_l' || p === 'palm_r'
    )
    // Drop parts whose featureId matches the latest reading (same extract / content hash).
    // Ephemeral parts always count as changed.
    const lastFeats = recentReadings[0] ? parseReadingFeatureIds(recentReadings[0].inputJson) : null
    if (lastFeats) {
      uniq = uniq.filter((p) => {
        if (p === 'face') {
          if (ephemeralKeys?.face) return true
          return body.faceFeatureId !== lastFeats.faceFeatureId
        }
        if (p === 'palm_l') {
          if (ephemeralKeys?.palm_l) return true
          return body.palmLeftFeatureId !== lastFeats.palmLeftFeatureId
        }
        if (ephemeralKeys?.palm_r) return true
        return body.palmRightFeatureId !== lastFeats.palmRightFeatureId
      })
    }
    if (uniq.length === 0) {
      const fallbackId = conflicting?.id ?? recentReadings[0]?.id
      if (fallbackId) return c.json(featuresUnchangedPayload(fallbackId), 409)
      throw new HTTPException(400, { message: 'partial_parts_required' })
    }
    if (uniq.length >= 3) {
      effectiveUpdateKind = 'full'
      effectivePartialParts = null
    } else {
      effectivePartialParts = uniq
    }
  }

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
    const slots =
      effectiveUpdateKind === 'partial' && effectivePartialParts
        ? Math.max(1, effectivePartialParts.length)
        : 3
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
    // Stash partial meta for the queue consumer (no dedicated columns yet).
    if (effectiveUpdateKind === 'partial' && effectivePartialParts) {
      creditSource = `partial:${effectivePartialParts.join(',')}`
    }
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

  const needsExtract = Boolean(ephemeralKeys && ephemeralKeyList(ephemeralKeys).length > 0)
  const jobId = nanoid()
  const now = new Date().toISOString()
  const inserted: JobRow = {
    id: jobId,
    userId,
    stage: needsExtract ? 'extracting' : 'queued',
    progress: needsExtract ? 5 : 10,
    locale: body.locale,
    outputKind: body.outputKind,
    horizonMonths: body.horizonMonths,
    faceFeatureId: body.faceFeatureId ?? null,
    palmLeftFeatureId: body.palmLeftFeatureId ?? null,
    palmRightFeatureId: body.palmRightFeatureId ?? null,
    ephemeralKeysJson: ephemeralKeys ? JSON.stringify(ephemeralKeys) : null,
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
    if (ephemeralKeys && c.env.FACE_EPHEMERAL_BUCKET) {
      await deleteEphemeralObjects(c.env.FACE_EPHEMERAL_BUCKET, ephemeralKeyList(ephemeralKeys))
    }
    await refundFaceoracleJobAccess(db, inserted)
    await db
      .update(faceoracleJobs)
      .set({
        stage: 'failed',
        progress: 100,
        errorMessage: 'queue_unavailable',
        finishedAt: new Date().toISOString(),
        refunded: true,
        ephemeralKeysJson: null,
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

  // Queue message can be dropped / delayed — re-send if still queued/extracting after 90s.
  if (job.stage === 'queued' || job.stage === 'extracting') {
    const started = Date.parse(job.startedAt || job.createdAt)
    if (Number.isFinite(started) && Date.now() - started > 90_000) {
      try {
        await enqueueFaceoracleReadingJob(c.env, job.id)
        console.info('[faceoracle.job] re-enqueued stuck', { jobId: job.id, stage: job.stage })
      } catch (err) {
        console.error('[faceoracle.job] re-enqueue failed', job.id, err)
      }
    }
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
