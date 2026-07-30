/**
 * POST /api/auspice/watch/bootstrap — Yuun Watch almanac window sync.
 *
 * Authenticated via watch bearer (`w1.<id>.<secret>`). Returns a WidgetSyncPayload
 * envelope the watch extension can cache offline. No edge cache — private, no-store.
 */

import { zValidator } from '@hono/zod-validator'
import type { PersonalFit, YijiVocabularyMode } from '@zhop/astro-core'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import type { AppEnv } from '../infra-types'
import {
  compactVerbs,
  elementColorForGanZhi,
  moonPhaseForIsoDate,
  type WidgetLocale,
  widgetChrome,
  widgetLabels,
} from '../lib/yuun-widget-labels'
import { buildDay, fmtUtc, parseYmd, subjectFromBirthDate, ymdAdd, ymdToDate } from './auspice'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const bootstrapSchema = z.object({
  anchorDate: z.string().regex(DATE_RE),
  locale: z.enum(['zh-Hans', 'zh-Hant', 'ja', 'en']),
  days: z.number().int().min(1).max(14).optional().default(7),
  birthDate: z.string().regex(DATE_RE).optional(),
  /** Optional display mode; omit → traditional (old Watch clients). */
  yijiMode: z.enum(['modern', 'traditional']).optional(),
})

function verbBudget(locale: WidgetLocale, surface: 'short' | 'plain' | 'long'): number {
  if (surface === 'short') return 2
  if (surface === 'long') return locale === 'en' ? 6 : 6
  return locale === 'en' ? 4 : 5
}

function lunarMonthDay(
  locale: WidgetLocale,
  lunarDate: { monthName: string; dayName: string; month: number; day: number }
): string {
  if (locale === 'en') return `${lunarDate.month}/${lunarDate.day}`
  return `${lunarDate.monthName}${lunarDate.dayName}`
}

function mapWidgetDay(
  date: string,
  locale: WidgetLocale,
  birthDate: string | undefined,
  yijiMode: YijiVocabularyMode
) {
  const subject = birthDate ? subjectFromBirthDate(birthDate) : undefined
  const { day, personalization } = buildDay(parseYmd(date), subject, {
    seed: birthDate,
    locale,
  })

  const labels = widgetLabels(locale)
  const fit = personalization?.fit ?? null
  const en = locale === 'en'
  const ld = day.lunarDate

  return {
    date,
    ganZhi: day.ganZhi,
    ganZhiPinyin: null as string | null,
    elementColor: elementColorForGanZhi(day.ganZhi),
    lunar: ld ? lunarMonthDay(locale, ld) : '',
    solarTerm: day.solarTermToday?.name ?? '',
    yi: compactVerbs(day.goodFor, verbBudget(locale, 'plain'), locale, yijiMode),
    ji: compactVerbs(day.avoid, verbBudget(locale, 'plain'), locale, yijiMode),
    yiShort: compactVerbs(day.goodFor, verbBudget(locale, 'short'), locale, yijiMode),
    jiShort: compactVerbs(day.avoid, verbBudget(locale, 'short'), locale, yijiMode),
    yiLong: compactVerbs(day.goodFor, verbBudget(locale, 'long'), locale, yijiMode),
    jiLong: compactVerbs(day.avoid, verbBudget(locale, 'long'), locale, yijiMode),
    fit: fit ? labels.fit[fit as PersonalFit] : null,
    fitSummary: fit ? labels.summary[fit as PersonalFit] : null,
    dayTip: null,
    tipLabel: en ? null : labels.chrome.tip,
    moonPhase: moonPhaseForIsoDate(date),
    officer: en ? undefined : day.dayOfficer,
    mansion: en ? undefined : `${day.mansion.name}${day.mansion.luminary}${day.mansion.animal}`,
    clashShengxiao: en ? undefined : day.clash.clashAnimal,
    ganzhiYear: en ? null : `${day.yearGanZhi.stem}${day.yearGanZhi.branch}年`,
  }
}

export const auspiceWatchRoutes = new Hono<AppEnv>().post(
  '/bootstrap',
  zValidator('json', bootstrapSchema),
  async (c) => {
    const { anchorDate, locale, days, birthDate, yijiMode: modeOpt } = c.req.valid('json')
    // Old Watch clients omit yijiMode → traditional (rollback-safe).
    const yijiMode: YijiVocabularyMode = modeOpt ?? 'traditional'
    const anchor = parseYmd(anchorDate)

    const windowDays: ReturnType<typeof mapWidgetDay>[] = []
    for (let i = 0; i < days; i++) {
      const ymd = ymdAdd(anchor, i)
      const date = fmtUtc(ymdToDate(ymd))
      windowDays.push(mapWidgetDay(date, locale, birthDate, yijiMode))
    }

    const updatedAt = new Date().toISOString()
    const freshUntil = fmtUtc(ymdToDate(ymdAdd(anchor, days)))

    c.header('Cache-Control', 'private, no-store')

    return c.json({
      updatedAt,
      appSlug: 'yuun',
      locale,
      freshUntil,
      data: {
        chrome: widgetChrome(locale),
        days: windowDays,
      },
    })
  }
)
