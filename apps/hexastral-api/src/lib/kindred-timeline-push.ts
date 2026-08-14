/**
 * Yuel relationship-timeline node push (server slot, Yuun month-node analogue).
 * Deterministic teasers from composeBondsTimeline notifications — no LLM at send.
 */
import type { ZiweiTimingSummary } from '@zhop/astro-core'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { kindredPushQueue, pairReadings, userBonds, users } from '../db/schema'
import type { AppDb } from '../infra-types'
import { userHasCapability } from './access/entitlement-access'
import {
  type BirthTriple,
  buildEgoTimeline,
  type PairReadingBirth,
  type ResolvedBond,
  resolveResonanceCounterpart,
  resolveResonanceZiwei,
} from './bonds-timeline'

export type KindredTimelinePushLabels = {
  title: string
  body: (kind: string, year: number, leadLabel: string) => string
}

const TIMELINE_PUSH_LABELS: Record<string, KindredTimelinePushLabels> = {
  zh: {
    title: '关系前瞻',
    body: (kind, year, lead) =>
      `${year}年 · ${kind}节点${lead ? ` · ${lead}` : ''}，点开看你们关系的转折。`,
  },
  'zh-Hant': {
    title: '關係前瞻',
    body: (kind, year, lead) =>
      `${year}年 · ${kind}節點${lead ? ` · ${lead}` : ''}，點開看你們關係的轉折。`,
  },
  ja: {
    title: '関係の予報',
    body: (kind, year, lead) =>
      `${year}年・${kind}の節目${lead ? `（${lead}）` : ''}。関係の転機を確認しましょう。`,
  },
  en: {
    title: 'Relationship ahead',
    body: (kind, year, lead) =>
      `${year} · a ${kind.toLowerCase()} turning point${lead ? ` ${lead}` : ''}. Tap to see what shifts.`,
  },
}

export function kindredTimelinePushLabels(locale: string): KindredTimelinePushLabels {
  if (locale.startsWith('zh-Hant') || locale.toLowerCase().includes('hant')) {
    return TIMELINE_PUSH_LABELS['zh-Hant'] ?? TIMELINE_PUSH_LABELS.en!
  }
  if (locale.startsWith('zh')) return TIMELINE_PUSH_LABELS.zh!
  if (locale.startsWith('ja')) return TIMELINE_PUSH_LABELS.ja!
  return TIMELINE_PUSH_LABELS.en!
}

/**
 * Pick the single strongest timeline notification whose fireDate is `date`
 * (YYYY-MM-DD). Returns null when none fire today.
 */
export async function pickKindredTimelineTeaserForUser(
  db: AppDb,
  userId: string,
  date: string
): Promise<{
  key: string
  year: number
  kind: string
  leadLabel: string
  significance: string
  locale: string
} | null> {
  if (!(await userHasCapability(db, userId, 'kindred'))) return null

  const ego = await db
    .select({
      birthSolarDate: users.birthSolarDate,
      birthTimeIndex: users.birthTimeIndex,
      birthGender: users.birthGender,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get()
  if (!ego?.birthSolarDate || ego.birthTimeIndex == null || !ego.birthGender) return null

  // Prefer locale from the user's latest harvest row (no users.language column).
  const localeRow = await db
    .select({ locale: kindredPushQueue.locale })
    .from(kindredPushQueue)
    .where(eq(kindredPushQueue.userId, userId))
    .orderBy(desc(kindredPushQueue.createdAt))
    .get()
  const locale = localeRow?.locale ?? 'zh'

  const egoBirth: BirthTriple = {
    solarDate: ego.birthSolarDate,
    timeIndex: ego.birthTimeIndex,
    gender: ego.birthGender as '男' | '女',
  }

  const rows = await db
    .select({
      id: userBonds.id,
      targetName: userBonds.targetName,
      relationshipLabel: userBonds.relationshipLabel,
      mode: userBonds.mode,
      hehunReadingId: userBonds.hehunReadingId,
      targetBirthSolarDate: userBonds.targetBirthSolarDate,
      targetBirthTimeIndex: userBonds.targetBirthTimeIndex,
      targetBirthGender: userBonds.targetBirthGender,
    })
    .from(userBonds)
    .where(and(eq(userBonds.ownerId, userId), eq(userBonds.status, 'active')))
    .orderBy(userBonds.createdAt)

  if (rows.length === 0) return null

  const resonanceReadingIds = rows
    .filter((r) => r.mode === 'resonance' && r.hehunReadingId)
    .map((r) => r.hehunReadingId as string)
  const readingMap = new Map<string, PairReadingBirth>()
  if (resonanceReadingIds.length > 0) {
    const readings = await db
      .select({
        id: pairReadings.id,
        personASolarDate: pairReadings.personASolarDate,
        personATimeIndex: pairReadings.personATimeIndex,
        personAGender: pairReadings.personAGender,
        personBSolarDate: pairReadings.personBSolarDate,
        personBTimeIndex: pairReadings.personBTimeIndex,
        personBGender: pairReadings.personBGender,
        ziweiSummaryA: pairReadings.ziweiSummaryA,
        ziweiSummaryB: pairReadings.ziweiSummaryB,
      })
      .from(pairReadings)
      .where(inArray(pairReadings.id, resonanceReadingIds))
    for (const r of readings) readingMap.set(r.id, r)
  }

  let egoZiwei: ZiweiTimingSummary | undefined
  const resolved: ResolvedBond[] = []
  for (const r of rows) {
    let counterpart: BirthTriple | null = null
    let counterpartZiwei: ZiweiTimingSummary | undefined
    if (r.mode === 'solo') {
      if (r.targetBirthSolarDate && r.targetBirthTimeIndex != null && r.targetBirthGender) {
        counterpart = {
          solarDate: r.targetBirthSolarDate,
          timeIndex: r.targetBirthTimeIndex,
          gender: r.targetBirthGender as '男' | '女',
        }
      }
    } else if (r.hehunReadingId) {
      const reading = readingMap.get(r.hehunReadingId)
      if (reading) {
        counterpart = resolveResonanceCounterpart(egoBirth, reading)
        const z = resolveResonanceZiwei(egoBirth, reading)
        counterpartZiwei = z.counterpartZiwei
        if (!egoZiwei && z.egoZiwei) egoZiwei = z.egoZiwei
      }
    }
    if (!counterpart) continue
    resolved.push({
      bondId: r.id,
      name: r.targetName,
      relationshipLabel: r.relationshipLabel ?? undefined,
      counterpart,
      counterpartZiwei,
    })
  }
  if (resolved.length === 0) return null

  const [yy] = date.split('-').map((n) => Number.parseInt(n, 10))
  const year = yy ?? new Date().getUTCFullYear()
  const timeline = buildEgoTimeline(egoBirth, resolved, {
    fromYear: year - 1,
    toYear: year + 10,
    keepRoutineYears: true,
    notifyFromDate: new Date(`${date}T00:00:00.000Z`),
    egoZiwei,
  })

  const today = timeline.notifications.filter((n) => n.fireDate === date)
  if (today.length === 0) return null

  const rank = (s: string) => (s === 'major' ? 3 : s === 'notable' ? 2 : 1)
  today.sort((a, b) => rank(b.significance) - rank(a.significance))
  const pick = today[0]!
  return {
    key: pick.key,
    year: pick.year,
    kind: pick.kind,
    leadLabel: pick.leadLabel,
    significance: pick.significance,
    locale,
  }
}
