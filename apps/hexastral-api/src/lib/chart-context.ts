/**
 * Chart + context fingerprinting for the versioned report layer.
 *
 * `chartHash` — sha256 of the inputs that uniquely identify a chart at birth
 * (already stored on user_charts.input_hash). Stable for life.
 *
 * `contextHash` — sha256 of (chartHash + currentLiunian + currentDayun +
 * promptVersion + modelId). Static chapters omit liunian/dayun. Lazy-regen on
 * read compares the request-time contextHash to the row's stored value.
 */

import { calculateDaYun, getJieQiDay, yearGanZhi } from '@zhop/astro-core'
import { eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { userCharts } from '../db/schema'
import type { AppDb } from '../infra-types'

/** Chapter slug enum — keep in sync with the report chapter route registry. */
export const CHAPTER_SLUGS = [
  'ch1_personality',
  'ch2_dimensions_static',
  'ch2_dimensions_dynamic',
  'ch3_stellar',
  'ch4_timeline',
  'ch5_hidden',
  'ch6_action',
] as const
export type ChapterSlug = (typeof CHAPTER_SLUGS)[number]

/** Static chapters omit time-bound terms from contextHash. */
export const STATIC_CHAPTERS: ReadonlySet<ChapterSlug> = new Set([
  'ch1_personality',
  'ch2_dimensions_static',
  'ch3_stellar',
])

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  const bytes = new Uint8Array(buf)
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += (bytes[i] as number).toString(16).padStart(2, '0')
  }
  return out
}

/**
 * Resolve the user's primary chart (natal preferred, fallback to stellar) and
 * return the inputHash to use as `chartHash`. Throws 404 if the user has no
 * chart yet — caller should route them through onboarding.
 */
export async function resolveChartHash(db: AppDb, userId: string): Promise<string> {
  const rows = await db
    .select({ chartType: userCharts.chartType, inputHash: userCharts.inputHash })
    .from(userCharts)
    .where(eq(userCharts.userId, userId))
  if (rows.length === 0) {
    throw new HTTPException(404, { message: 'No chart on file — complete onboarding first' })
  }
  // Prefer natal (Ba Zi) inputHash since it carries the four-pillar fingerprint.
  const natal = rows.find((r) => r.chartType === 'natal')
  return (natal ?? rows[0])?.inputHash as string
}

export interface ChartContextSnapshot {
  chartHash: string
  /** Stem-branch label of the current 流年 (e.g. "丙午"), boundary at 立春 */
  currentLiunian: string
  /** Stem-branch label of the user's current 大运 step, or 'pre-luck' if before startAge */
  currentDayun: string
}

/**
 * Load the natal chart row and derive (chartHash, currentLiunian, currentDayun)
 * for `today`. Used by the report chapter route's lazy-regen contextHash check.
 *
 * Falls back to a stellar-only chart if no natal exists, in which case dayun
 * cannot be computed — returns 'unknown' for currentDayun. (Static chapters
 * don't include dayun in their hash, so this only affects time-bound chapters.)
 */
export async function loadChartContext(
  db: AppDb,
  userId: string,
  today: Date = new Date()
): Promise<ChartContextSnapshot> {
  const rows = await db
    .select({
      chartType: userCharts.chartType,
      inputHash: userCharts.inputHash,
      solarDate: userCharts.solarDate,
      gender: userCharts.gender,
    })
    .from(userCharts)
    .where(eq(userCharts.userId, userId))
  if (rows.length === 0) {
    throw new HTTPException(404, { message: 'No chart on file — complete onboarding first' })
  }
  const natal = rows.find((r) => r.chartType === 'natal') ?? rows[0]
  if (!natal) throw new HTTPException(404, { message: 'No chart on file' })

  const currentLiunian = currentLiunianFor(today)
  const currentDayun =
    natal.chartType === 'natal'
      ? computeCurrentDayun(natal.solarDate, natal.gender, today)
      : 'unknown'

  return { chartHash: natal.inputHash, currentLiunian, currentDayun }
}

/**
 * Compute the user's current 大运 step label for `today`.
 *
 * `solarDate` is YYYY-MM-DD in the user's local-tz (already true-solar adjusted
 * upstream by the onboarding chart route). `gender` is '男' | '女'.
 */
function computeCurrentDayun(solarDate: string, gender: string, today: Date): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(solarDate)
  if (!m) return 'unknown'
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const g = gender === '男' || gender === '女' ? gender : '男'
  const result = calculateDaYun({ year, month, day, hour: 12 }, g)
  const todayYear = today.getUTCFullYear()
  const step = result.steps.find((s) => todayYear >= s.startYear && todayYear <= s.endYear)
  return step ? step.ganZhi.label : 'pre-luck'
}

/**
 * Compute the current 流年 stem-branch label, honoring 立春 boundary.
 * Before 立春 of `year`, the prior year's ganzhi still applies.
 */
export function currentLiunianFor(date: Date = new Date()): string {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  // 立春 = jieqiIndex 2. getJieQiDay returns the day-of-month within Feb.
  const lichunDay = getJieQiDay(year, 2)
  const beforeLichun = month < 2 || (month === 2 && day < lichunDay)
  const ganzhiYear = beforeLichun ? year - 1 : year
  return yearGanZhi(ganzhiYear).label
}

export interface ContextHashInput {
  chartHash: string
  slug: ChapterSlug
  promptVersion: string
  model: string
  /** Current 流年 (e.g. '2026' or stem-branch like '甲辰'). Required for time-bound chapters. */
  currentLiunian?: string
  /** Current 大运 step token. Required for time-bound chapters. */
  currentDayun?: string
  /** Optional perspective seed for Pro re-roll — when set, every reroll yields a unique hash. */
  perspectiveSeed?: string
}

export async function computeContextHash(input: ContextHashInput): Promise<string> {
  const isStatic = STATIC_CHAPTERS.has(input.slug)
  const parts = isStatic
    ? [input.chartHash, input.slug, input.promptVersion, input.model]
    : [
        input.chartHash,
        input.slug,
        input.promptVersion,
        input.model,
        input.currentLiunian ?? '',
        input.currentDayun ?? '',
      ]
  if (input.perspectiveSeed) parts.push(input.perspectiveSeed)
  return sha256Hex(parts.join('|'))
}
