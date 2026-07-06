import { resolveBirthHour } from '@zhop/astro-core'
import { getFourPillars } from '@zhop/astro-core/ganzhi'
import { eq } from 'drizzle-orm'
import { users } from '../db/schema'
import type { AppDb } from '../infra-types'
import { getActiveEntitlements } from '../services/entitlements'

export interface CoincastBirthRow {
  birthSolarDate: string | null
  birthTimeIndex: number | null
  birthGender: string | null
  birthClockMinutes?: number | null
  birthSolarCalibrate?: boolean | null
  birthLongitude?: string | null
  birthTimezoneId?: string | null
  birthCity?: string | null
}

const STEM_WUXING: Record<string, string> = {
  甲: 'wood',
  乙: 'wood',
  丙: 'fire',
  丁: 'fire',
  戊: 'earth',
  己: 'earth',
  庚: 'metal',
  辛: 'metal',
  壬: 'water',
  癸: 'water',
}

function timeIndexToHour(timeIndex: number): number {
  if (timeIndex === 0) return 0
  if (timeIndex === 12) return 23
  return timeIndex * 2 - 1
}

export function hasCoincastBirthInfo(row: CoincastBirthRow): boolean {
  return (
    typeof row.birthSolarDate === 'string' &&
    row.birthSolarDate.length > 0 &&
    typeof row.birthTimeIndex === 'number' &&
    row.birthTimeIndex >= 0 &&
    row.birthTimeIndex <= 12
  )
}

function pillarLabel(stem: string, branch: string): string {
  return `${stem}${branch}`
}

/** Short Markdown block for svc-astro memoryContext — does not alter cast facts. */
export function buildCoincastBirthContext(row: CoincastBirthRow): string {
  if (!hasCoincastBirthInfo(row)) return ''

  const [yearStr, monthStr, dayStr] = row.birthSolarDate!.split('-')
  const year = Number.parseInt(yearStr ?? '2000', 10)
  const month = Number.parseInt(monthStr ?? '1', 10)
  const day = Number.parseInt(dayStr ?? '1', 10)
  if (!year || !month || !day) return ''

  const timeIndex = row.birthTimeIndex ?? 0
  let hour = timeIndexToHour(timeIndex)

  if (row.birthClockMinutes != null) {
    const lng = row.birthLongitude ? Number(row.birthLongitude) : undefined
    const resolved = resolveBirthHour({
      year,
      month,
      day,
      clockMinutes: row.birthClockMinutes,
      calibrate: row.birthSolarCalibrate ?? undefined,
      longitude: Number.isFinite(lng) ? lng : undefined,
      timezoneId: row.birthTimezoneId ?? undefined,
      city: row.birthCity ?? undefined,
    })
    hour = resolved.hour
  }

  const pillars = getFourPillars({ year, month, day, hour })
  const dayMasterStem = pillars.day.stem
  const dayMasterElement = STEM_WUXING[dayMasterStem] ?? 'unknown'
  const gender =
    row.birthGender === '女' ? 'female' : row.birthGender === '男' ? 'male' : 'unspecified'

  const four = [
    pillarLabel(pillars.year.stem, pillars.year.branch),
    pillarLabel(pillars.month.stem, pillars.month.branch),
    pillarLabel(pillars.day.stem, pillars.day.branch),
    pillarLabel(pillars.hour.stem, pillars.hour.branch),
  ].join(' · ')

  return [
    '## Birth chart context (optional)',
    `- Four pillars: ${four}`,
    `- Day master (${dayMasterStem}): ${dayMasterElement} tendency`,
    `- Gender marker: ${gender}`,
    '- Use only as tone and life-context; never override hexagram lines or changing yao facts.',
  ].join('\n')
}

export function coincastBirthPillarsSummary(row: CoincastBirthRow): string | undefined {
  if (!hasCoincastBirthInfo(row)) return undefined
  const ctx = buildCoincastBirthContext(row)
  const match = ctx.match(/Four pillars: (.+)/)
  return match?.[1]
}

export async function userHasCoincastPro(db: AppDb, userId: string): Promise<boolean> {
  const ents = (await getActiveEntitlements(db, userId)).map((e) => e.key)
  if (ents.includes('coincast_pro') || ents.includes('universe_pro')) return true
  const row = await db
    .select({ proUntil: users.coincastProExpiresAt })
    .from(users)
    .where(eq(users.id, userId))
    .get()
  const now = new Date().toISOString()
  return Boolean(row?.proUntil && row.proUntil > now)
}
