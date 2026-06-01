/**
 * Reading-context builder — assembles the layered context bundle that Pro chat
 * feeds to svc-astro. Extracted from routes/chat.ts (Phase K · Chat plan CC.1).
 *
 * Layers:
 *   L1 — primary reading interpretation text (the reading being chatted about)
 *   L2 — user brief (name, locale, birth info, plan)               [CC.2]
 *   L3 — cross-reading heuristic joins (recent related readings)   [CC.3]
 *   L4 — portfolio-memory recall (same-app, or cross-app when opted in)
 *
 * The builder owns the user fetch + memory recall so routes/chat.ts stays thin
 * and svc-astro receives a structured bundle (CC.5) instead of flat strings.
 */

import { calculateDailyAlmanac } from '@zhop/astro-core'
import { STEM_WUXING } from '@zhop/astro-core/constants'
import { dayGanZhi } from '@zhop/astro-core/ganzhi'
import { and, desc, eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import {
  divinations,
  fengReports,
  pairReadings,
  physiognomyReadings,
  reportChapters,
  userCharts,
  users,
} from '../db/schema'
import type { AppDb, CloudflareBindings } from '../infra-types'
import { type PortfolioMemoryTargetApp, searchPortfolioReadingMemory } from './portfolio-memory'

export type ReadingType =
  | 'natal'
  | 'stellar'
  | 'yiching'
  | 'pair'
  | 'physiognomy'
  | 'report'
  | 'feng'
  | 'cycle'

export interface BirthBrief {
  year: number
  month: number
  day: number
  /** 0-23 representative hour mapped from the 时辰 index; null = unknown. */
  hour: number | null
  gender: 'male' | 'female' | 'other' | null
  city: string | null
}

export interface UserBrief {
  name: string | null
  locale: string
  birthInfo: BirthBrief | null
  plan: 'free' | 'monthly' | 'annual' | 'lifetime'
}

export interface RelatedReadingSummary {
  type: ReadingType
  summary: string
  ageDays: number
}

export interface ReadingContextBundle {
  user: UserBrief
  primary: { type: ReadingType; text: string }
  related: RelatedReadingSummary[]
  memory: { context: string; hitCount: number }
}

// ── L1 — primary reading interpretation text ─────────────────────────────────

/**
 * Fetch the reading interpretation text (AI snapshot, not raw coordinates) to
 * supply as the primary chat context. Throws 404 when the reading is not owned
 * by the user.
 */
export async function getPrimaryReadingText(
  db: AppDb,
  readingType: ReadingType,
  readingId: string,
  userId: string
): Promise<string> {
  switch (readingType) {
    case 'natal':
    case 'stellar': {
      const row = await db
        .select({
          interpretationFree: userCharts.interpretationFree,
          interpretationPro: userCharts.interpretationPro,
        })
        .from(userCharts)
        .where(and(eq(userCharts.id, readingId), eq(userCharts.userId, userId)))
        .get()
      if (!row) throw new HTTPException(404, { message: 'Reading not found' })
      const interp = row.interpretationPro ?? row.interpretationFree ?? ''
      return typeof interp === 'string' ? interp : JSON.stringify(interp)
    }
    case 'yiching': {
      const row = await db
        .select({ interpretation: divinations.interpretation, advice: divinations.advice })
        .from(divinations)
        .where(and(eq(divinations.id, readingId), eq(divinations.userId, userId)))
        .get()
      if (!row) throw new HTTPException(404, { message: 'Reading not found' })
      return `${row.interpretation ?? ''}\n\n${row.advice ?? ''}`
    }
    case 'pair': {
      const row = await db
        .select({ interpretation: pairReadings.interpretation })
        .from(pairReadings)
        .where(and(eq(pairReadings.id, readingId), eq(pairReadings.userId, userId)))
        .get()
      if (!row) throw new HTTPException(404, { message: 'Reading not found' })
      return row.interpretation
    }
    case 'physiognomy': {
      const row = await db
        .select({ interpretation: physiognomyReadings.interpretation })
        .from(physiognomyReadings)
        .where(and(eq(physiognomyReadings.id, readingId), eq(physiognomyReadings.userId, userId)))
        .get()
      if (!row) throw new HTTPException(404, { message: 'Reading not found' })
      return row.interpretation ?? ''
    }
    case 'report': {
      const sep = readingId.indexOf('-')
      if (sep <= 0) throw new HTTPException(400, { message: 'Invalid report reading id' })
      const ownerUserId = readingId.slice(0, sep)
      const chapter = readingId.slice(sep + 1)
      if (ownerUserId !== userId) throw new HTTPException(403, { message: 'Forbidden' })
      const row = await db
        .select({ contentJson: reportChapters.contentJson })
        .from(reportChapters)
        .where(
          and(
            eq(reportChapters.userId, userId),
            eq(reportChapters.chapter, chapter),
            eq(reportChapters.isCurrent, true)
          )
        )
        .get()
      if (!row) throw new HTTPException(404, { message: 'Reading not found' })
      return row.contentJson
    }
    case 'feng': {
      // fengReports.chapters is a JSON string of FengChapter[] (the 6-chapter
      // synthesis). Passed raw as context, mirroring the 'report' case.
      const row = await db
        .select({ chapters: fengReports.chapters })
        .from(fengReports)
        .where(and(eq(fengReports.id, readingId), eq(fengReports.userId, userId)))
        .get()
      if (!row) throw new HTTPException(404, { message: 'Reading not found' })
      return row.chapters
    }
    case 'cycle': {
      // Cycle "readings" aren't persisted — the readingId IS the date (YYYY-MM-DD),
      // so recompute the day's 黄历 deterministically to seed the chat. Public almanac
      // data, so no per-user ownership check (unlike the cases above).
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(readingId)
      if (!m) throw new HTTPException(400, { message: 'Invalid cycle date' })
      const a = calculateDailyAlmanac({
        year: Number(m[1]),
        month: Number(m[2]),
        day: Number(m[3]),
      })
      return [
        `黄历 ${readingId}：${a.todayGanZhi}日 · ${a.dayOfficer}日 · ${a.mansion.name}宿。`,
        `宜：${a.goodFor.join('、') || '—'}。忌：${a.avoid.join('、') || '—'}。`,
        `冲${a.clash.zodiac} 煞${a.evilDirection}。`,
      ].join('\n')
    }
  }
}

// ── L2 — user brief ──────────────────────────────────────────────────────────

function genderBrief(g: string | null): BirthBrief['gender'] {
  if (g === '男' || g === 'male') return 'male'
  if (g === '女' || g === 'female') return 'female'
  if (g === 'other') return 'other'
  return null
}

/**
 * Map the stored `birthTimeIndex` (a 时辰 index, 0-11 — NOT a 0-23 hour) to a
 * representative hour: 子(0)→0, 丑(1)→2, … 亥(11)→22. Returns null when unknown.
 */
function shichenIndexToHour(idx: number | null): number | null {
  if (typeof idx !== 'number' || idx < 0 || idx > 11) return null
  return (idx * 2) % 24
}

function buildBirthBrief(row: {
  birthSolarDate: string | null
  birthTimeIndex: number | null
  birthGender: string | null
  birthCity: string | null
}): BirthBrief | null {
  if (!row.birthSolarDate) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(row.birthSolarDate)
  if (!m) return null
  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: shichenIndexToHour(row.birthTimeIndex),
    gender: genderBrief(row.birthGender),
    city: row.birthCity,
  }
}

// ── L4 — memory target resolution (parity with the prior chat.ts mapping) ─────

function resolveMemoryTarget(targetApp: string): PortfolioMemoryTargetApp {
  return targetApp === 'coincast' || targetApp === 'dreamoracle' || targetApp === 'numerology'
    ? targetApp
    : 'hexastral'
}

// ── L3 — cross-reading heuristic joins ───────────────────────────────────────

/**
 * Which other readings enrich a chat about a given primary reading. Values are
 * only ever `natal` / `stellar` / `yiching` (the join targets).
 */
const RELATED_READINGS_RULES: Record<ReadingType, ReadingType[]> = {
  physiognomy: ['natal'],
  pair: ['natal'],
  report: ['natal', 'stellar'],
  yiching: [],
  feng: ['natal'],
  stellar: [],
  natal: ['yiching'],
  cycle: ['natal'],
}

const RECENCY_DAYS = 60
const MAX_RELATED = 2
const SUMMARY_MAX = 200

const ELEMENT_EN: Record<string, string> = {
  木: 'Wood',
  火: 'Fire',
  土: 'Earth',
  金: 'Metal',
  水: 'Water',
}

/** Code-point-safe truncation (never splits a surrogate pair / CJK char). */
function truncate(s: string, max: number): string {
  const arr = Array.from(s.trim())
  return arr.length <= max ? arr.join('') : `${arr.slice(0, max).join('')}…`
}

function ageDaysFrom(iso: string | null | undefined): number {
  if (!iso) return 0
  const t = Date.parse(iso)
  return Number.isNaN(t) ? 0 : Math.max(0, Math.floor((Date.now() - t) / 86_400_000))
}

/**
 * Natal is computed, not stored (post-Phase K) — recompute 日主 + 五行 from the
 * day pillar rather than querying a stored reading. (用神 needs full-chart
 * analysis and is intentionally not fabricated here.)
 */
function computeNatalSummary(birth: BirthBrief, zh: boolean): string {
  const gz = dayGanZhi(birth.year, birth.month, birth.day)
  const element = STEM_WUXING[gz.stem]
  return zh
    ? `命盘要点（据生辰推算）：日主 ${gz.stem}（${element}），日柱 ${gz.label}。`
    : `Natal basics (computed from birth date): day-master ${gz.stem} (${ELEMENT_EN[element] ?? element}), day pillar ${gz.label}.`
}

async function buildRelatedReadings(
  db: AppDb,
  primaryType: ReadingType,
  userId: string,
  user: UserBrief
): Promise<RelatedReadingSummary[]> {
  const rules = RELATED_READINGS_RULES[primaryType]
  if (rules.length === 0) return []

  const zh = user.locale.startsWith('zh')
  const out: RelatedReadingSummary[] = []

  for (const relType of rules) {
    if (out.length >= MAX_RELATED) break

    if (relType === 'natal') {
      if (user.birthInfo) {
        out.push({ type: 'natal', summary: computeNatalSummary(user.birthInfo, zh), ageDays: 0 })
      }
      continue
    }

    if (relType === 'stellar') {
      const row = await db
        .select({
          free: userCharts.interpretationFree,
          pro: userCharts.interpretationPro,
          createdAt: userCharts.createdAt,
        })
        .from(userCharts)
        .where(and(eq(userCharts.userId, userId), eq(userCharts.chartType, 'stellar')))
        .orderBy(desc(userCharts.createdAt))
        .get()
      const text = row?.pro ?? row?.free ?? ''
      const ageDays = ageDaysFrom(row?.createdAt)
      if (row && text && ageDays <= RECENCY_DAYS) {
        out.push({ type: 'stellar', summary: truncate(String(text), SUMMARY_MAX), ageDays })
      }
      continue
    }

    if (relType === 'yiching') {
      const row = await db
        .select({ interpretation: divinations.interpretation, createdAt: divinations.createdAt })
        .from(divinations)
        .where(eq(divinations.userId, userId))
        .orderBy(desc(divinations.createdAt))
        .get()
      const ageDays = ageDaysFrom(row?.createdAt)
      if (row?.interpretation && ageDays <= RECENCY_DAYS) {
        out.push({ type: 'yiching', summary: truncate(row.interpretation, SUMMARY_MAX), ageDays })
      }
    }
  }

  return out
}

// ── Builder ──────────────────────────────────────────────────────────────────

export async function buildReadingContext(input: {
  db: AppDb
  env: CloudflareBindings
  userId: string
  readingType: ReadingType
  readingId: string
  /** Latest user message — used for memory recall. */
  query: string
  targetApp: string
  /** Subscriber plan label for the user brief, derived from active entitlements by the caller. */
  subscriberPlan: UserBrief['plan']
  /** B-chat: tier gates L3/L4 + sizes the budget. Default 'pro' = pre-B-chat behavior. */
  tier?: ChatTier
}): Promise<ReadingContextBundle> {
  const {
    db,
    env,
    userId,
    readingType,
    readingId,
    query,
    targetApp,
    subscriberPlan,
    tier = 'pro',
  } = input
  const budget = CHAT_TIER_BUDGET[tier]

  // L2 — user brief (single SELECT; also gates L4 + carries locale).
  const userRow = await db
    .select({
      name: users.name,
      displayName: users.displayName,
      locale: users.locale,
      portfolioMemoryEnabled: users.portfolioMemoryEnabled,
      crossAppMemoryEnabled: users.crossAppMemoryEnabled,
      birthSolarDate: users.birthSolarDate,
      birthTimeIndex: users.birthTimeIndex,
      birthGender: users.birthGender,
      birthCity: users.birthCity,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get()

  const locale = userRow?.locale ?? 'zh'
  const user: UserBrief = {
    name: userRow?.displayName ?? userRow?.name ?? null,
    locale,
    birthInfo: userRow ? buildBirthBrief(userRow) : null,
    plan: subscriberPlan,
  }

  // L1 — primary reading text (throws 404 if not owned by user).
  const text = await getPrimaryReadingText(db, readingType, readingId, userId)

  // L4 — portfolio-memory recall. Same-app by default; cross-app when the user
  // has opted in. Memory runs if either flag is on (cross-app implies recall on).
  const crossApp = Boolean(userRow?.crossAppMemoryEnabled)
  let memory = { context: '', hitCount: 0 }
  if (budget.includeMemory && (userRow?.portfolioMemoryEnabled || crossApp)) {
    memory = await searchPortfolioReadingMemory(env, {
      userId,
      targetApp: resolveMemoryTarget(targetApp),
      query,
      locale,
      crossApp,
    })
  }

  // L3 — cross-reading heuristic joins (natal recomputed; others recent + bounded).
  const related = budget.includeRelated
    ? await buildRelatedReadings(db, readingType, userId, user)
    : []

  return { user, primary: { type: readingType, text }, related, memory }
}

// ── CC.6 — size guard + B-chat tier budgets ───────────────────────────────────

/**
 * B-chat (ADR-0012): multi-layer chat scales by tier on two axes —
 *   - 文本长度 (token/char budget) → maxContextChars + primaryTruncateChars
 *   - 时间长度 (history depth)     → includeRelated (L3) + includeMemory (L4)
 * 'pro' reproduces the pre-B-chat behavior (4000 / 1500 / full layers) so existing
 * callers + tests are unchanged. Cross-app memory stays governed by the user's
 * privacy opt-in (crossAppMemoryEnabled) — never overridden by tier.
 */
export type ChatTier = 'free' | 'pro' | 'universe'

interface ChatTierBudget {
  maxContextChars: number
  primaryTruncateChars: number
  includeRelated: boolean
  includeMemory: boolean
}

const CHAT_TIER_BUDGET: Record<ChatTier, ChatTierBudget> = {
  // Free taste — L1 + L2 only, short. (Active once free-taste chat ships; gate is still Pro-only today.)
  free: {
    maxContextChars: 1200,
    primaryTruncateChars: 800,
    includeRelated: false,
    includeMemory: false,
  },
  // Subscription (fate / yuán / cycle) — identical to pre-B-chat behavior.
  pro: {
    maxContextChars: 4000,
    primaryTruncateChars: 1500,
    includeRelated: true,
    includeMemory: true,
  },
  // Universe — fuller history kept (longer 文本/时间长度).
  universe: {
    maxContextChars: 6000,
    primaryTruncateChars: 2000,
    includeRelated: true,
    includeMemory: true,
  },
}

function estimateContextChars(b: ReadingContextBundle): number {
  let n = b.primary.text.length + b.memory.context.length
  for (const r of b.related) n += r.summary.length + r.type.length + 8
  n += (b.user.name?.length ?? 0) + 48 // user brief is small + fixed-ish
  return n
}

/**
 * Trim the bundle to a hard char budget. Priority drop order (L2 user brief is
 * always kept — small + critical):
 *   1. L4 memory  2. L3 related (oldest first)  3. truncate L1 primary.
 * Returns the trimmed bundle + the layers that were dropped (for observability).
 */
export function trimContextBundle(
  bundle: ReadingContextBundle,
  tier: ChatTier = 'pro'
): {
  bundle: ReadingContextBundle
  droppedLayers: string[]
} {
  const { maxContextChars, primaryTruncateChars } = CHAT_TIER_BUDGET[tier]
  let b = bundle
  const dropped: string[] = []

  if (estimateContextChars(b) > maxContextChars && b.memory.context.length > 0) {
    b = { ...b, memory: { context: '', hitCount: b.memory.hitCount } }
    dropped.push('l4-memory')
  }

  while (estimateContextChars(b) > maxContextChars && b.related.length > 0) {
    const related = [...b.related]
    let oldest = 0
    for (let i = 1; i < related.length; i++) {
      if ((related[i]?.ageDays ?? 0) > (related[oldest]?.ageDays ?? 0)) oldest = i
    }
    const [removed] = related.splice(oldest, 1)
    b = { ...b, related }
    if (removed) dropped.push(`l3-${removed.type}`)
  }

  if (estimateContextChars(b) > maxContextChars && b.primary.text.length > primaryTruncateChars) {
    b = {
      ...b,
      primary: {
        ...b.primary,
        text: Array.from(b.primary.text).slice(0, primaryTruncateChars).join(''),
      },
    }
    dropped.push('l1-truncated')
  }

  return { bundle: b, droppedLayers: dropped }
}
