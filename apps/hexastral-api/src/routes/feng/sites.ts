/**
 * /api/feng/sites — Fēng site CRUD.
 *
 *   POST   /api/feng/sites                create site (returns id)
 *   GET    /api/feng/sites                list current user's sites (no deletedAt)
 *   GET    /api/feng/sites/:id            get site + latest report (if any)
 *   PATCH  /api/feng/sites/:id            edit name / facing / build year
 *   DELETE /api/feng/sites/:id            soft-delete (deletedAt = now)
 *   POST   /api/feng/sites/:id/analyze    enqueue analysis → { jobId }
 *
 * All routes require HMAC v2 auth (mounted under `/api/feng/*` in index.ts).
 *
 * Phase F: migrated to shared response envelope (`jsonOk` / `jsonErr` from
 * `lib/api-response.ts`). Note one envelope change: list / detail responses
 * previously used `{ sites: [...] }` / `{ site: {...}, latestReport: ... }`
 * — now uniformly `{ ok: true, data: T }`. Client coordination:
 *   - feng-app's `useFengSiteList` / `useFengSite` hooks in
 *     `packages/scenario-feng/src/hooks/` must access `result.data.sites`
 *     vs `result.data.site` after `result.ok` check.
 *   - scenario-feng's hand-rolled `feng-api.ts` façade is the right place
 *     to absorb this shape change with a 1-line adapter.
 */

import { and, desc, eq, isNull, ne } from 'drizzle-orm'
import { Hono } from 'hono'
import { nanoid } from 'nanoid'
import { z } from 'zod/v4'
import { fengJobs, fengReports, fengSites } from '../../db/schema'
import type { AppEnv } from '../../infra-types'
import { checkReadingAccess } from '../../lib/access-check'
import { ApiErrorCode, jsonErr, jsonOk } from '../../lib/api-response'
import { requireUserId } from '../../lib/auth'
import { enqueueFengAnalyzeJob } from '../../lib/feng-analyze-queue'
import { deleteFloorplans } from '../../lib/feng-client'
import { collectFloorplanKeys } from '../../lib/feng-interior-compute'
import { MAX_FLOORPLAN_IMAGES, quoteFengAnalysis } from '../../lib/feng-pricing'

const facingDeg = z.number().gte(0).lt(360)

// 户型图 / 室内堪舆. `orientDeg` = the true-north bearing of the plans' top edge
// (from the north-align step). 1 image = apartment · N = villa/multi-floor.
const floorplanImageSchema = z.object({
  key: z.string().min(1).max(96),
  // RESERVED, currently ignored: the interior pipeline (parseSiteFloorplan +
  // vision) orients ALL floors by the single top-level `orientDeg` below — floors
  // of one building share a north. Do not rely on per-image orientation until the
  // vision prompt + compute actually thread a per-floor bearing.
  orientDeg: facingDeg.optional(),
  label: z.string().max(40).optional(),
})
const floorplanSchema = z.object({
  orientDeg: facingDeg,
  images: z.array(floorplanImageSchema).min(1).max(6),
})

const createSiteSchema = z.object({
  name: z.string().min(1).max(40),
  label: z.string().max(80).optional(),
  lat: z.number().gte(-85).lte(85),
  lng: z.number().gte(-180).lte(180),
  formattedAddress: z.string().min(1).max(240),
  facingDegTrue: facingDeg,
  magneticDeclination: z.number().gte(-30).lte(30),
  doorDegTrue: facingDeg.optional(),
  buildYear: z.int().gte(1800).lte(2100).optional(),
  buildYearAccuracy: z.enum(['exact', 'decade', 'moveIn', 'unknown']).default('unknown'),
  moveInYear: z.int().gte(1800).lte(2100).optional(),
  floor: z.int().gte(-10).lte(200).optional(),
  floorplanKey: z.string().min(1).max(96).optional(),
  floorplan: floorplanSchema.optional(),
})

const updateSiteSchema = createSiteSchema.partial()

function parseFloorplan(json: string | null): unknown {
  if (!json) return null
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

function serializeSite(row: typeof fengSites.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    label: row.label,
    lat: Number(row.lat),
    lng: Number(row.lng),
    formattedAddress: row.formattedAddress,
    facingDegTrue: Number(row.facingDegTrue),
    facingDegMagnetic: Number(row.facingDegMagnetic),
    magneticDeclination: Number(row.magneticDeclination),
    sitDegTrue: Number(row.sitDegTrue),
    doorDegTrue: row.doorDegTrue == null ? null : Number(row.doorDegTrue),
    buildYear: row.buildYear,
    buildYearAccuracy: row.buildYearAccuracy,
    moveInYear: row.moveInYear,
    floor: row.floor,
    floorplanKey: row.floorplanKey,
    floorplan: parseFloorplan(row.floorplanJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  }
}

export const fengSiteRoutes = new Hono<AppEnv>()
  // ── List ────────────────────────────────────────────────────────────
  .get('/', async (c) => {
    const userId = requireUserId(c)
    const db = c.get('db')
    const rows = await db
      .select()
      .from(fengSites)
      .where(and(eq(fengSites.userId, userId), isNull(fengSites.deletedAt)))
      .orderBy(desc(fengSites.updatedAt))
      .all()
    return jsonOk(c, { sites: rows.map(serializeSite) }, 200, { total: rows.length })
  })
  // ── Create ──────────────────────────────────────────────────────────
  .post('/', async (c) => {
    const userId = requireUserId(c)
    const body = await c.req.json().catch(() => ({}))
    const parsed = createSiteSchema.safeParse(body)
    if (!parsed.success) {
      return jsonErr(c, 400, ApiErrorCode.invalid_input, 'Invalid site input', {
        issues: parsed.error.issues,
      })
    }
    const input = parsed.data

    const id = nanoid()
    const now = new Date().toISOString()
    const sitDegTrue = (input.facingDegTrue + 180) % 360
    const facingDegMagnetic =
      (((input.facingDegTrue - input.magneticDeclination) % 360) + 360) % 360

    const db = c.get('db')
    await db.insert(fengSites).values({
      id,
      userId,
      name: input.name,
      label: input.label ?? null,
      lat: String(input.lat),
      lng: String(input.lng),
      formattedAddress: input.formattedAddress,
      facingDegTrue: String(input.facingDegTrue),
      facingDegMagnetic: String(facingDegMagnetic),
      magneticDeclination: String(input.magneticDeclination),
      sitDegTrue: String(sitDegTrue),
      doorDegTrue: input.doorDegTrue == null ? null : String(input.doorDegTrue),
      buildYear: input.buildYear ?? null,
      buildYearAccuracy: input.buildYearAccuracy,
      moveInYear: input.moveInYear ?? null,
      floor: input.floor ?? null,
      floorplanKey: input.floorplanKey ?? null,
      floorplanJson: input.floorplan ? JSON.stringify(input.floorplan) : null,
      createdAt: now,
      updatedAt: now,
    })

    const row = await db.select().from(fengSites).where(eq(fengSites.id, id)).get()
    if (!row) {
      return jsonErr(c, 500, ApiErrorCode.internal_error, 'Site create lost')
    }
    return jsonOk(c, { site: serializeSite(row) }, 201)
  })
  // ── Price estimate ──────────────────────────────────────────────────
  // Fair tiering by floor-plan image count (base + per-extra-image). Called
  // from the review screen BEFORE the site exists so the paywall shows the
  // right 客单价 (apartment vs villa/multi-floor).
  .post('/price', async (c) => {
    requireUserId(c)
    const body = await c.req.json().catch(() => ({}))
    const parsed = z.object({ images: z.int().gte(0).lte(20).optional() }).safeParse(body)
    const images = parsed.success ? (parsed.data.images ?? 1) : 1
    const quote = quoteFengAnalysis(images)
    // Signal when the requested count was clamped into the billable [1, MAX]
    // range, so the client can warn instead of silently under/over-quoting.
    return jsonOk(c, { quote, capped: images > MAX_FLOORPLAN_IMAGES })
  })
  // ── Read one + latest report ────────────────────────────────────────
  .get('/:id', async (c) => {
    const userId = requireUserId(c)
    const id = c.req.param('id')
    const db = c.get('db')

    const row = await db
      .select()
      .from(fengSites)
      .where(and(eq(fengSites.id, id), eq(fengSites.userId, userId), isNull(fengSites.deletedAt)))
      .get()
    if (!row) {
      return jsonErr(c, 404, ApiErrorCode.not_found, 'Site not found')
    }

    // Exclude two-phase SHELL rows (chapters='[]', still synthesizing). A shell
    // is surfaced ONLY on the live job.report channel during its own run; as the
    // persisted "latest report" it would render a permanent fake-loading state on
    // reopen. A finished report always has >=5 chapters, so '[]' uniquely = shell.
    const latestReport = await db
      .select()
      .from(fengReports)
      .where(and(eq(fengReports.siteId, id), ne(fengReports.chapters, '[]')))
      .orderBy(desc(fengReports.generatedAt))
      .limit(1)
      .get()

    let annotatedTiles: Array<'close' | 'mid' | 'wide'> = []
    if (latestReport?.annotatedMapKeys) {
      try {
        const parsed = JSON.parse(latestReport.annotatedMapKeys) as Record<string, unknown>
        annotatedTiles = (['close', 'mid', 'wide'] as const).filter(
          (t) => typeof parsed[t] === 'string' && (parsed[t] as string).length > 0
        )
      } catch {
        // ignore malformed JSON; treat as no tiles
      }
    }

    return jsonOk(c, {
      site: serializeSite(row),
      latestReport: latestReport
        ? {
            id: latestReport.id,
            fengYear: latestReport.fengYear,
            currentYuan: latestReport.currentYuan,
            chapters: JSON.parse(latestReport.chapters),
            compute: JSON.parse(latestReport.computeJson),
            dataQuality: JSON.parse(latestReport.dataQuality),
            modelVersions: JSON.parse(latestReport.modelVersions),
            annotatedTiles,
            generatedAt: latestReport.generatedAt,
          }
        : null,
    })
  })
  // ── Update ──────────────────────────────────────────────────────────
  .patch('/:id', async (c) => {
    const userId = requireUserId(c)
    const id = c.req.param('id')
    const body = await c.req.json().catch(() => ({}))
    const parsed = updateSiteSchema.safeParse(body)
    if (!parsed.success) {
      return jsonErr(c, 400, ApiErrorCode.invalid_input, 'Invalid site update', {
        issues: parsed.error.issues,
      })
    }
    const input = parsed.data
    const db = c.get('db')

    const existing = await db
      .select()
      .from(fengSites)
      .where(and(eq(fengSites.id, id), eq(fengSites.userId, userId), isNull(fengSites.deletedAt)))
      .get()
    if (!existing) {
      return jsonErr(c, 404, ApiErrorCode.not_found, 'Site not found')
    }

    const patch: Partial<typeof fengSites.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    }
    if (input.name !== undefined) patch.name = input.name
    if (input.label !== undefined) patch.label = input.label
    if (input.formattedAddress !== undefined) patch.formattedAddress = input.formattedAddress
    if (input.lat !== undefined) patch.lat = String(input.lat)
    if (input.lng !== undefined) patch.lng = String(input.lng)
    if (input.magneticDeclination !== undefined) {
      patch.magneticDeclination = String(input.magneticDeclination)
    }
    if (input.facingDegTrue !== undefined) {
      patch.facingDegTrue = String(input.facingDegTrue)
      patch.sitDegTrue = String((input.facingDegTrue + 180) % 360)
      const decl = input.magneticDeclination ?? Number(existing.magneticDeclination)
      patch.facingDegMagnetic = String((((input.facingDegTrue - decl) % 360) + 360) % 360)
    }
    if (input.doorDegTrue !== undefined) {
      patch.doorDegTrue = input.doorDegTrue == null ? null : String(input.doorDegTrue)
    }
    if (input.buildYear !== undefined) patch.buildYear = input.buildYear
    if (input.buildYearAccuracy !== undefined) patch.buildYearAccuracy = input.buildYearAccuracy
    if (input.moveInYear !== undefined) patch.moveInYear = input.moveInYear
    if (input.floor !== undefined) patch.floor = input.floor
    if (input.floorplanKey !== undefined) patch.floorplanKey = input.floorplanKey ?? null
    if (input.floorplan !== undefined) {
      patch.floorplanJson = input.floorplan ? JSON.stringify(input.floorplan) : null
    }

    await db.update(fengSites).set(patch).where(eq(fengSites.id, id))
    const row = await db.select().from(fengSites).where(eq(fengSites.id, id)).get()
    if (!row) {
      return jsonErr(c, 500, ApiErrorCode.internal_error, 'Site patch lost')
    }
    return jsonOk(c, { site: serializeSite(row) })
  })
  // ── Soft delete ─────────────────────────────────────────────────────
  .delete('/:id', async (c) => {
    const userId = requireUserId(c)
    const id = c.req.param('id')
    const db = c.get('db')

    const existing = await db
      .select()
      .from(fengSites)
      .where(and(eq(fengSites.id, id), eq(fengSites.userId, userId), isNull(fengSites.deletedAt)))
      .get()
    if (!existing) {
      return jsonErr(c, 404, ApiErrorCode.not_found, 'Site not found')
    }

    // Purge the site's floor-plan images from R2 (owned PII, no lifecycle GC).
    // The user deleted the site; there is no un-delete, so the raw images should
    // leave storage now (the report keeps its already-computed roomFindings).
    const fpKeys = collectFloorplanKeys(existing)
    if (fpKeys.length > 0) {
      c.executionCtx.waitUntil(
        deleteFloorplans(c.env.SVC_FENG, fpKeys).catch((err) => {
          console.error('feng.floorplan_purge_failed', { siteId: id, error: String(err) })
        })
      )
    }

    await db
      .update(fengSites)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(fengSites.id, id))
    return jsonOk(c, { deleted: true })
  })
  // ── Analyze (enqueue) ───────────────────────────────────────────────
  .post('/:id/analyze', async (c) => {
    const userId = requireUserId(c)
    const id = c.req.param('id')
    const db = c.get('db')

    const site = await db
      .select()
      .from(fengSites)
      .where(and(eq(fengSites.id, id), eq(fengSites.userId, userId), isNull(fengSites.deletedAt)))
      .get()
    if (!site) {
      return jsonErr(c, 404, ApiErrorCode.not_found, 'Site not found')
    }

    // DEV-Pro bypass: skip the paywall so analysis can be tested without IAP.
    // Two ways in, both server-gated (a stored client flag alone can't self-grant):
    //   1. `ALLOW_DEV_PRO=1` (one-time) → honor the client's `x-feng-dev-pro`
    //      header, so the in-app Settings DEV-Pro toggle is the only thing needed.
    //   2. `DEV_PRO_USER_IDS=<userId,…>` allowlist (no client toggle required).
    // Both empty/unset in prod ⇒ no bypass.
    const env = c.env as { DEV_PRO_USER_IDS?: string; ALLOW_DEV_PRO?: string }
    const headerDevPro = env.ALLOW_DEV_PRO === '1' && c.req.header('x-feng-dev-pro') === '1'
    const idDevPro =
      typeof env.DEV_PRO_USER_IDS === 'string' &&
      env.DEV_PRO_USER_IDS.split(',')
        .map((s) => s.trim())
        .includes(userId)
    const isDevPro = headerDevPro || idDevPro

    // Cost gate: each analysis runs Gemini Vision on 1–3 annotated satellite
    // tiles plus a synthesis LLM pass. Without this gate a free user could
    // burn unbounded VLM tokens by hitting /analyze repeatedly. Subscribers get
    // unlimited access; non-subscribers must hold a single-purchase entitlement
    // (`hexastral_feng_single`) — no free monthly quota for feng analyses.
    let accessVia = 'dev_pro'
    let purchaseId: string | undefined
    if (!isDevPro) {
      const access = await checkReadingAccess(db, userId, 'feng_analysis')
      if (!access.granted) {
        return jsonErr(
          c,
          403,
          ApiErrorCode.paywall_required,
          `A feng-shui report requires Pro or a one-time purchase (${access.price}).`,
          {
            iapProductId: access.iapProductId,
            price: access.price,
            reason: access.reason,
          }
        )
      }
      accessVia = access.via
      // Carry the single-purchase id so the queue consumer can consume it on
      // success. Subscribers (pro_quota) pass nothing — their analyses are free.
      purchaseId = access.via === 'single_purchase' ? access.purchaseId : undefined
    }

    const jobId = nanoid()
    await db.insert(fengJobs).values({
      id: jobId,
      siteId: id,
      userId,
      stage: 'maps',
      progress: 0,
      startedAt: new Date().toISOString(),
    })

    // Queue consumer runs the pipeline (not waitUntil — 30s cap after 202).
    await enqueueFengAnalyzeJob(c.env, jobId, id, purchaseId)

    return jsonOk(c, { jobId, siteId: id, stage: 'maps', progress: 0, accessVia }, 202)
  })
