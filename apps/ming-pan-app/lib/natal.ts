/**
 * Client-side 八字 命盘 compute — fate-app is anonymous (Tier-3), so the chart is
 * computed locally with @zhop/astro-core instead of the user-gated server route.
 *
 * Mirrors svc-astro `generateNatalChart` (services/svc-astro/src/services/natal/natal.ts):
 *   getFourPillars → getFourPillarsShiShen → analyzeGeJu → getNaYin.
 * True-solar-time + southern-hemisphere correction are server-only (need lat/lng/tz);
 * this v1 uses the representative hour, matching the server's fallback when those are
 * absent. AI interpretation (the deep layer) is added later behind the K.4 LLM guard.
 */

import {
  analyzeGeJu,
  type FourPillars,
  type FourPillarsShiShen,
  type GeJuAnalysis,
  getFourPillars,
  getFourPillarsShiShen,
  getNaYin,
  type HeavenlyStem,
  STEM_WUXING,
} from '@zhop/astro-core'

export type FateGender = '男' | '女'

export interface FateBirthInput {
  /** Gregorian birth date, `YYYY-MM-DD`. */
  solarDate: string
  /** 时辰 index 0-12 (0 = 早子 00:00, 12 = 晚子 23:00). */
  timeIndex: number
  gender: FateGender
}

export interface FateNatalChart {
  pillars: FourPillars
  shishen: FourPillarsShiShen
  geju: GeJuAnalysis
  nayin: { year: string; month: string; day: string; hour: string }
  dayMaster: HeavenlyStem
  dayMasterWuXing: string
}

/** 时辰 index → representative hour (mirrors svc-astro generateNatalChart). */
function timeIndexToHour(timeIndex: number): number {
  if (timeIndex <= 0) return 0 // 早子时 00:00-01:00
  if (timeIndex >= 12) return 23 // 晚子时 23:00-24:00
  return timeIndex * 2 - 1 // 丑=1→1, 寅=2→3, ...
}

export function computeFateNatalChart(input: FateBirthInput): FateNatalChart {
  const parts = input.solarDate.split('-')
  const year = Number.parseInt(parts[0] ?? '', 10)
  const month = Number.parseInt(parts[1] ?? '', 10)
  const day = Number.parseInt(parts[2] ?? '', 10)
  const hour = timeIndexToHour(input.timeIndex)

  const pillars = getFourPillars({ year, month, day, hour })
  const shishen = getFourPillarsShiShen(pillars)
  const geju = analyzeGeJu(pillars, shishen)
  const dayMaster = pillars.day.stem as HeavenlyStem

  return {
    pillars,
    shishen,
    geju,
    nayin: {
      year: getNaYin(pillars.year),
      month: getNaYin(pillars.month),
      day: getNaYin(pillars.day),
      hour: getNaYin(pillars.hour),
    },
    dayMaster,
    dayMasterWuXing: STEM_WUXING[dayMaster],
  }
}
