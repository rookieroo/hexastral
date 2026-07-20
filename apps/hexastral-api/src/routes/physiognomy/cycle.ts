/**
 * POST /api/physiognomy/cycle/* — Xingqi Life axis + What-if facades (ADR-0028).
 * Shared compute from cycle-timeline; never expose /api/auspice to Xingqi clients.
 */

import { getFourPillars, timeIndexFromHour } from '@zhop/astro-core'
import { and, eq, gt } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import {
  lifeTimelineCache,
  makeifForks,
  portfolioReadings,
  TIMELINE_CACHE_VERSION,
  timelineReadings,
} from '../../db/schema'
import type { AppEnv } from '../../infra-types'
import { jsonOk } from '../../lib/api-response'
import { requireUserId } from '../../lib/auth'
import { astroClient } from '../../lib/service-clients'
import { hasActiveEntitlement } from '../../services/entitlements'
import {
  evaluateLlmGuard,
  type LlmGuardConfig,
  recordLlmGuardGrant,
  resolveLlmGuardSubject,
} from '../../services/shared/llm-guard'
import {
  applyZiweiToTimeline,
  buildTimelinePayload,
  computeContextKey,
  type TimelinePayload,
} from '../cycle-timeline'

export const physiognomyCycleRoutes = new Hono<AppEnv>()

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const timelineBody = z.object({
  birthDate: z.string().regex(DATE_RE),
  birthHour: z.number().int().min(-1).max(23),
  gender: z.enum(['M', 'F']),
  locale: z.string().min(2).max(16).optional(),
})

function normalizeLocale(locale: string | undefined): 'zh-Hans' | 'zh-Hant' | 'ja' | 'en' {
  if (!locale) return 'zh-Hans'
  if (locale.startsWith('zh-Hant') || locale === 'zh-TW' || locale === 'zh-HK') return 'zh-Hant'
  if (locale.startsWith('zh')) return 'zh-Hans'
  if (locale.startsWith('ja')) return 'ja'
  return 'en'
}

function faceoracleOwner(userId: string): string {
  return `user:faceoracle:${userId}`
}

async function requireFaceoraclePro(
  db: AppEnv['Variables']['db'],
  userId: string
): Promise<void> {
  const ok =
    (await hasActiveEntitlement(db, userId, 'faceoracle_pro')) ||
    (await hasActiveEntitlement(db, userId, 'universe_pro'))
  if (!ok) throw new HTTPException(402, { message: 'pro_required' })
}

// ── Reading-grounded context (ADR-0028) ─────────────────────────
// Load the user's latest/opened faceoracle reading and distill a compact
// digest so what-if / timeline narratives build on the ACTUAL report
// (loci, 用神, 大运带, events) instead of re-deriving generic 五行.

function digestStr(v: unknown, max = 0): string {
  if (typeof v !== 'string') return ''
  const t = v.replace(/\s+/g, ' ').trim()
  return max > 0 ? t.slice(0, max) : t
}

function digestFaceoracleReading(output: Record<string, unknown>): string | undefined {
  const lines: string[] = []

  const nf = (output.natalFacts && typeof output.natalFacts === 'object'
    ? (output.natalFacts as Record<string, unknown>)
    : {}) as Record<string, unknown>
  const nfParts = [
    digestStr(nf.dayMaster) && `日主${digestStr(nf.dayMaster)}`,
    digestStr(nf.dayPillar) && `日柱${digestStr(nf.dayPillar)}`,
    digestStr(nf.dayun) &&
      `当前大运${digestStr(nf.dayun)}${digestStr(nf.dayunYears) ? `(${digestStr(nf.dayunYears)})` : ''}`,
    digestStr(nf.dayunFuture, 160) && `未来大运带:${digestStr(nf.dayunFuture, 160)}`,
    digestStr(nf.liuNian) && `流年${digestStr(nf.liuNian)}`,
  ].filter(Boolean)
  if (nfParts.length) lines.push(`【八字】${nfParts.join('; ')}`)

  const chapters = Array.isArray(output.chapters) ? output.chapters : []
  const wantKinds = new Set(['overview', 'natal', 'period', 'advice'])
  const kindLabel: Record<string, string> = {
    overview: '总论',
    natal: '本命·未来大运',
    period: '近窗预告',
    advice: '行动建议',
  }
  const loci: string[] = []
  const cautions: string[] = []
  for (const ch of chapters) {
    if (!ch || typeof ch !== 'object') continue
    const c = ch as Record<string, unknown>
    const kind = digestStr(c.kind)
    if (wantKinds.has(kind)) {
      const gl = digestStr(c.goldenLine, 70)
      if (gl) lines.push(`${kindLabel[kind] ?? kind}:${gl}`)
      const reef = digestStr(c.reef, 60)
      if (reef && cautions.length < 3) cautions.push(reef)
    }
    const cites = Array.isArray(c.citations) ? c.citations : []
    for (const cite of cites) {
      if (loci.length >= 8) break
      if (!cite || typeof cite !== 'object') continue
      const cc = cite as Record<string, unknown>
      const locus = digestStr(cc.locus, 12)
      const note = digestStr(cc.note, 36)
      if (locus && note && !loci.some((l) => l.startsWith(`${locus}:`))) {
        loci.push(`${locus}:${note}`)
      }
    }
  }
  if (loci.length) lines.push(`【关键位】${loci.join(' / ')}`)
  if (cautions.length) lines.push(`【暗礁】${cautions.join(' / ')}`)

  const events = Array.isArray(output.events) ? output.events : []
  const evLines: string[] = []
  for (const ev of events) {
    if (evLines.length >= 6) break
    if (!ev || typeof ev !== 'object') continue
    const e = ev as Record<string, unknown>
    const axis = digestStr(e.axis)
    const sm = digestStr(e.startMonth)
    const em = digestStr(e.endMonth)
    const win = sm ? (em ? `${sm}~${em}` : sm) : ''
    const note = digestStr(e.note, 44) || digestStr(e.theme, 44)
    if (note) evLines.push(`${axis}${win ? `(${win})` : ''}:${note}`)
  }
  if (evLines.length) lines.push(`【事件轴】${evLines.join(' / ')}`)

  const digest = lines.join('\n').slice(0, 2000)
  return digest.length > 0 ? digest : undefined
}

async function loadFaceoracleReadingContext(
  db: AppEnv['Variables']['db'],
  userId: string,
  readingId: string | undefined
): Promise<string | undefined> {
  if (!readingId) return undefined
  const row = await db
    .select({ resultJson: portfolioReadings.resultJson })
    .from(portfolioReadings)
    .where(
      and(
        eq(portfolioReadings.id, readingId),
        eq(portfolioReadings.userId, userId),
        eq(portfolioReadings.targetApp, 'faceoracle')
      )
    )
    .limit(1)
    .get()
    .catch(() => null)
  if (!row?.resultJson) return undefined
  try {
    const parsed: unknown = JSON.parse(row.resultJson)
    if (!parsed || typeof parsed !== 'object') return undefined
    return digestFaceoracleReading(parsed as Record<string, unknown>)
  } catch {
    return undefined
  }
}

function hashIp(ip: string): string {
  let h = 2_166_136_261
  for (let i = 0; i < ip.length; i++) {
    h ^= ip.charCodeAt(i)
    h = Math.imul(h, 16_777_619)
  }
  return (h >>> 0).toString(36)
}

const EXPLAIN_GUARD = {
  app: 'faceoracle-timeline',
  dailyLimitAnon: 0,
  dailyLimitSigned: 8,
  lifetimePeakPass: 1,
  globalDailyBudget: 4000,
  noRollover: true,
  noPeriodicRefill: true,
} as const satisfies LlmGuardConfig

const MAKEIF_GUARD = {
  app: 'faceoracle-makeif',
  dailyLimitAnon: 0,
  dailyLimitSigned: 6,
  lifetimePeakPass: 1,
  globalDailyBudget: 3000,
  noRollover: true,
  noPeriodicRefill: true,
} as const satisfies LlmGuardConfig

// ── Timeline payload ─────────────────────────────────────────────

// Timeline payload is Free-readable (ghost preview). LLM explain / make-if / forks stay Pro.
physiognomyCycleRoutes.post('/timeline', async (c) => {
  requireUserId(c)
  const db = c.get('db')

  const parsed = timelineBody.safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) throw new HTTPException(400, { message: 'invalid timeline request body' })

  const body = {
    birthDate: parsed.data.birthDate,
    birthHour: parsed.data.birthHour,
    gender: parsed.data.gender,
    locale: normalizeLocale(parsed.data.locale),
  }
  const now = new Date()
  const contextKey = `faceoracle:${await computeContextKey(body)}`

  const cached = await db
    .select({ contentJson: lifeTimelineCache.contentJson })
    .from(lifeTimelineCache)
    .where(
      and(
        eq(lifeTimelineCache.contextKey, contextKey),
        gt(lifeTimelineCache.expiresAt, now.toISOString())
      )
    )
    .limit(1)
    .get()
    .catch(() => null)

  if (cached?.contentJson) {
    try {
      return jsonOk(c, JSON.parse(cached.contentJson) as TimelinePayload)
    } catch {
      // recompute
    }
  }

  let payload = buildTimelinePayload(body, now)
  if (body.birthHour >= 0) {
    try {
      const { summary } = await astroClient.post<{
        summary: { starToPalace: Record<string, string> } | null
      }>(c.env.SVC_ASTRO, '/stellar/ziwei-summary', {
        solarDate: body.birthDate,
        timeIndex: timeIndexFromHour(body.birthHour),
        gender: body.gender === 'M' ? '男' : '女',
      })
      if (summary?.starToPalace) payload = applyZiweiToTimeline(payload, summary)
    } catch (err) {
      console.warn('[physiognomy.cycle.timeline] ziwei fold skipped', err)
    }
  }

  const contentJson = JSON.stringify(payload)
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
  try {
    await db
      .insert(lifeTimelineCache)
      .values({
        id: crypto.randomUUID(),
        contextKey,
        contentJson,
        expiresAt,
        createdAt: now.toISOString(),
      })
      .onConflictDoUpdate({
        target: lifeTimelineCache.contextKey,
        set: { contentJson, expiresAt, createdAt: now.toISOString() },
      })
  } catch (err) {
    console.warn('[physiognomy.cycle.timeline] cache write failed', err)
  }

  return jsonOk(c, payload)
})

// ── Timeline explain ─────────────────────────────────────────────

const explainBody = z.object({
  birthDate: z.string().regex(DATE_RE),
  birthHour: z.number().int().min(-1).max(23),
  gender: z.enum(['M', 'F']),
  locale: z.string().max(16).default('en'),
  nodeType: z.enum(['dayun', 'liunian', 'liuyue']),
  year: z.number().int().min(1900).max(2200),
  month: z.number().int().min(0).max(12).optional(),
  dayunIndex: z.number().int().min(0).max(20).optional(),
  readingId: z.string().min(1).max(64).optional(),
})

physiognomyCycleRoutes.post('/timeline/explain', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')
  await requireFaceoraclePro(db, userId)

  const body = explainBody.parse(await c.req.json().catch(() => ({})))
  const locale = normalizeLocale(body.locale)
  const payload = buildTimelinePayload(
    {
      birthDate: body.birthDate,
      birthHour: body.birthHour,
      gender: body.gender,
      locale,
    },
    new Date()
  )

  let ganZhi = ''
  let element = ''
  let fit: '吉' | '平' | '凶' = '平'
  let reasons: string[] = []
  let nodeTypeZh: '大运' | '流年' | '流月' = '流年'

  if (body.nodeType === 'dayun') {
    nodeTypeZh = '大运'
    const row =
      typeof body.dayunIndex === 'number'
        ? payload.dayun.find((d) => d.index === body.dayunIndex)
        : payload.dayun.find((d) => body.year >= d.startYear && body.year <= d.endYear)
    if (!row) return jsonOk(c, { reading: null, source: 'none' })
    ganZhi = `${row.pillar.stem}${row.pillar.branch}`
    element = row.pillar.element
    fit = row.fit
    reasons = row.reasons
  } else if (body.nodeType === 'liuyue') {
    nodeTypeZh = '流月'
    const month = body.month ?? 1
    const row = payload.liuyue.find((r) => r.year === body.year && r.month === month)
    if (!row) return jsonOk(c, { reading: null, source: 'none' })
    ganZhi = `${row.pillar.stem}${row.pillar.branch}`
    element = row.pillar.element
    fit = row.fit
    reasons = row.reasons
  } else {
    nodeTypeZh = '流年'
    const row =
      payload.dayun.flatMap((d) => d.liunian).find((r) => r.year === body.year) ??
      payload.liunian.find((r) => r.year === body.year)
    if (!row) return jsonOk(c, { reading: null, source: 'none' })
    ganZhi = `${row.pillar.stem}${row.pillar.branch}`
    element = row.pillar.element
    fit = row.fit
    reasons = row.reasons
  }

  const owner = faceoracleOwner(userId)
  const groundTag = body.readingId ? `:r${body.readingId.slice(0, 12)}` : ''
  const cacheId = `${nodeTypeZh}:${body.year}:${body.month ?? 0}:${locale}:${TIMELINE_CACHE_VERSION}${groundTag}`

  const hit = await db
    .select()
    .from(timelineReadings)
    .where(
      and(
        eq(timelineReadings.owner, owner),
        eq(timelineReadings.id, cacheId),
        eq(timelineReadings.birthDate, body.birthDate),
        eq(timelineReadings.birthHour, body.birthHour),
        eq(timelineReadings.gender, body.gender)
      )
    )
    .limit(1)
    .get()
    .catch(() => null)
  if (hit?.reading) return jsonOk(c, { reading: hit.reading, source: 'cache' })

  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const subject = resolveLlmGuardSubject({ userId, ipHash: hashIp(ip) })
  if (!subject) return jsonOk(c, { reading: null, source: 'template' })
  const guard = await evaluateLlmGuard(c.env, { subject, config: EXPLAIN_GUARD })
  if (guard.decision !== 'allow_llm') {
    return jsonOk(c, { reading: null, source: 'template', upsell: guard.upsellAfterExhaust })
  }

  const readingContext = await loadFaceoracleReadingContext(db, userId, body.readingId)

  try {
    const resp = await astroClient.post<{ explanation: string }>(
      c.env.SVC_ASTRO,
      '/timeline/explain',
      {
        nodeType: nodeTypeZh,
        year: body.year,
        month: body.month ?? 0,
        ganZhi,
        element,
        fit,
        reasons,
        locale,
        isPro: true,
        readingContext,
      }
    )
    const reading = (resp.explanation ?? '').trim()
    if (!reading) return jsonOk(c, { reading: null, source: 'template' })
    await recordLlmGuardGrant(c.env, {
      subject,
      config: EXPLAIN_GUARD,
      consumesPeakPass: guard.consumesPeakPass,
    })
    try {
      await db
        .insert(timelineReadings)
        .values({
          owner,
          id: cacheId,
          birthDate: body.birthDate,
          birthHour: body.birthHour,
          gender: body.gender,
          nodeType: nodeTypeZh,
          year: body.year,
          month: body.month ?? 0,
          reading,
          tier: 'deep',
          locale,
          createdAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: [timelineReadings.owner, timelineReadings.id],
          set: { reading, tier: 'deep' },
        })
    } catch (err) {
      console.warn('[physiognomy.cycle.explain] persist failed', err)
    }
    return jsonOk(c, { reading, source: 'llm' })
  } catch (err) {
    console.warn('[physiognomy.cycle.explain] llm failed', err)
    return jsonOk(c, { reading: null, source: 'template' })
  }
})

// ── Make-if narrate ──────────────────────────────────────────────

const makeifSchema = z.object({
  birthDate: z.string().regex(DATE_RE),
  birthHour: z.number().int().min(-1).max(23).default(-1),
  gender: z.enum(['M', 'F']),
  locale: z.string().max(16).default('en'),
  readingId: z.string().min(1).max(64).optional(),
  branches: z
    .array(
      z.object({
        id: z.string().max(64),
        label: z.string().max(40),
        divergeAtAge: z.number().int().min(0).max(120),
        mergeAtAge: z.number().int().min(0).max(120).nullable(),
        isPast: z.boolean().optional(),
        realPillar: z.string().max(8).optional(),
      })
    )
    .min(1)
    .max(5),
})

physiognomyCycleRoutes.post('/makeif', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')
  await requireFaceoraclePro(db, userId)

  const body = makeifSchema.parse(await c.req.json().catch(() => ({})))
  const locale = normalizeLocale(body.locale)
  const [y, m, d] = body.birthDate.split('-').map((n) => Number.parseInt(n, 10))
  const hour = body.birthHour < 0 ? 12 : body.birthHour
  const pillars = getFourPillars({ year: y!, month: m!, day: d!, hour })

  const shapeSig = body.branches
    .map((b) => `${b.id}:${b.label}:${b.divergeAtAge}:${b.mergeAtAge}:${b.isPast}:${b.realPillar}`)
    .join(',')
  const groundTag = body.readingId ? `:r${body.readingId.slice(0, 12)}` : ''
  const cacheKey = `faceoracle:makeif:v1:${body.birthDate}:${body.birthHour}:${body.gender}:${locale}${groundTag}:${hashIp(shapeSig)}`
  const cached = await c.env.GUARD_KV.get(cacheKey)
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as {
        narratives: Record<string, string>
        summaries?: Record<string, string>
      }
      return jsonOk(c, {
        narratives: parsed.narratives ?? {},
        summaries: parsed.summaries ?? {},
        source: 'cache',
      })
    } catch {
      // regenerate
    }
  }

  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const subject = resolveLlmGuardSubject({ userId, ipHash: hashIp(ip) })
  if (!subject) return jsonOk(c, { narratives: {}, summaries: {}, source: 'template' })
  const guard = await evaluateLlmGuard(c.env, { subject, config: MAKEIF_GUARD })
  if (guard.decision !== 'allow_llm') {
    return jsonOk(c, {
      narratives: {},
      summaries: {},
      source: 'template',
      upsell: guard.upsellAfterExhaust,
    })
  }

  const currentAge = new Date().getUTCFullYear() - y!
  const readingContext = await loadFaceoracleReadingContext(db, userId, body.readingId)

  try {
    const resp = await astroClient.post<{
      narratives: Record<string, string>
      summaries?: Record<string, string>
    }>(c.env.SVC_ASTRO, '/cycle/makeif-narrate', {
      dayMaster: pillars.day.stem,
      dayPillar: `${pillars.day.stem}${pillars.day.branch}`,
      yearPillar: `${pillars.year.stem}${pillars.year.branch}`,
      gender: body.gender,
      currentAge,
      locale,
      branches: body.branches,
      readingContext,
    })
    const narratives = resp.narratives ?? {}
    const summaries = resp.summaries ?? {}
    await recordLlmGuardGrant(c.env, {
      subject,
      config: MAKEIF_GUARD,
      consumesPeakPass: guard.consumesPeakPass,
    })
    await c.env.GUARD_KV.put(
      cacheKey,
      JSON.stringify({ narratives, summaries }),
      { expirationTtl: 30 * 24 * 60 * 60 }
    )
    return jsonOk(c, { narratives, summaries, source: 'llm' })
  } catch (err) {
    console.warn('[physiognomy.cycle.makeif] llm failed', err)
    return jsonOk(c, { narratives: {}, summaries: {}, source: 'template' })
  }
})

const makeifNodeSchema = z.object({
  birthDate: z.string().regex(DATE_RE),
  birthHour: z.number().int().min(-1).max(23).default(-1),
  gender: z.enum(['M', 'F']),
  locale: z.string().max(16).default('en'),
  readingId: z.string().min(1).max(64).optional(),
  branch: z.object({
    id: z.string().max(64),
    label: z.string().max(40),
    divergeAtAge: z.number().int().min(0).max(120),
    mergeAtAge: z.number().int().min(0).max(120).nullable(),
    isPast: z.boolean().optional(),
    realPillar: z.string().max(8).optional(),
  }),
  focusAge: z.number().int().min(0).max(120),
  focusRealPillar: z.string().max(8).optional(),
  focusRealFit: z.enum(['吉', '平', '凶']).optional(),
  focusAltFit: z.enum(['吉', '平', '凶']).optional(),
})

physiognomyCycleRoutes.post('/makeif/node', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')
  await requireFaceoraclePro(db, userId)

  const body = makeifNodeSchema.parse(await c.req.json().catch(() => ({})))
  const locale = normalizeLocale(body.locale)
  const [y, m, d] = body.birthDate.split('-').map((n) => Number.parseInt(n, 10))
  const hour = body.birthHour < 0 ? 12 : body.birthHour
  const pillars = getFourPillars({ year: y!, month: m!, day: d!, hour })

  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const subject = resolveLlmGuardSubject({ userId, ipHash: hashIp(ip) })
  if (!subject) return jsonOk(c, { narrative: '', source: 'template' })
  const guard = await evaluateLlmGuard(c.env, { subject, config: MAKEIF_GUARD })
  if (guard.decision !== 'allow_llm') {
    return jsonOk(c, { narrative: '', source: 'template', upsell: guard.upsellAfterExhaust })
  }

  const readingContext = await loadFaceoracleReadingContext(db, userId, body.readingId)

  try {
    const resp = await astroClient.post<{ narrative: string }>(
      c.env.SVC_ASTRO,
      '/cycle/makeif-node-narrate',
      {
        dayMaster: pillars.day.stem,
        dayPillar: `${pillars.day.stem}${pillars.day.branch}`,
        locale,
        branch: body.branch,
        focusAge: body.focusAge,
        focusRealPillar: body.focusRealPillar,
        focusRealFit: body.focusRealFit,
        focusAltFit: body.focusAltFit,
        readingContext,
      }
    )
    const narrative = (resp.narrative ?? '').trim()
    if (narrative)
      await recordLlmGuardGrant(c.env, {
        subject,
        config: MAKEIF_GUARD,
        consumesPeakPass: guard.consumesPeakPass,
      })
    return jsonOk(c, { narrative, source: narrative ? 'llm' : 'template' })
  } catch (err) {
    console.warn('[physiognomy.cycle.makeif.node] llm failed', err)
    return jsonOk(c, { narrative: '', source: 'template' })
  }
})

// ── Forks CRUD (owner = user:faceoracle:{userId}) ────────────────

const forkSchema = z.object({
  birthDate: z.string().regex(DATE_RE),
  birthHour: z.number().int().min(-1).max(23),
  gender: z.enum(['M', 'F']),
  id: z.string().min(1).max(64),
  label: z.string().max(40),
  event: z.string().max(200),
  divergeAtAge: z.number().int().min(0).max(120),
  mergeAtAge: z.number().int().min(0).max(120).nullable(),
  isPast: z.boolean().default(false),
  realPillar: z.string().max(8).optional(),
  narrative: z.string().max(2000),
  locale: z.string().max(16).default('en'),
})

physiognomyCycleRoutes.post('/makeif/forks', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')
  await requireFaceoraclePro(db, userId)
  const body = forkSchema.parse(await c.req.json())
  const owner = faceoracleOwner(userId)
  await db
    .insert(makeifForks)
    .values({
      owner,
      id: body.id,
      birthDate: body.birthDate,
      birthHour: body.birthHour,
      gender: body.gender,
      event: body.event,
      label: body.label,
      divergeAtAge: body.divergeAtAge,
      mergeAtAge: body.mergeAtAge,
      isPast: body.isPast,
      realPillar: body.realPillar,
      narrative: body.narrative,
      locale: normalizeLocale(body.locale),
      createdAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: [makeifForks.owner, makeifForks.id],
      set: {
        narrative: body.narrative,
        label: body.label,
        event: body.event,
        locale: normalizeLocale(body.locale),
      },
    })
  return jsonOk(c, { saved: true })
})

physiognomyCycleRoutes.get('/makeif/forks', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')
  await requireFaceoraclePro(db, userId)
  const birthDate = c.req.query('birthDate')
  const birthHour = Number.parseInt(c.req.query('birthHour') ?? '', 10)
  const gender = c.req.query('gender')
  if (!birthDate || Number.isNaN(birthHour) || (gender !== 'M' && gender !== 'F')) {
    throw new HTTPException(400, { message: 'birthDate/birthHour/gender required' })
  }
  const rows = await db
    .select()
    .from(makeifForks)
    .where(
      and(
        eq(makeifForks.owner, faceoracleOwner(userId)),
        eq(makeifForks.birthDate, birthDate),
        eq(makeifForks.birthHour, birthHour),
        eq(makeifForks.gender, gender)
      )
    )
    .orderBy(makeifForks.createdAt)
  return jsonOk(c, { forks: rows })
})

physiognomyCycleRoutes.delete('/makeif/forks/:id', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')
  await requireFaceoraclePro(db, userId)
  const id = c.req.param('id')
  await db
    .delete(makeifForks)
    .where(and(eq(makeifForks.owner, faceoracleOwner(userId)), eq(makeifForks.id, id)))
  return jsonOk(c, { deleted: true })
})
