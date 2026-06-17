/**
 * Client-side 八字 命盘 compute — the solo reading is anonymous (client compute,
 * no user-gated server route), so the chart is computed locally with
 * @zhop/astro-core. Ported from ming-pan-app/lib/natal.ts per ADR-0021 K1 /
 * ADR-0022 (kindred rebuilt on the ming-pan frame).
 *
 * Mirrors svc-astro `generateNatalChart` (services/svc-astro/src/services/natal/natal.ts):
 *   resolveBirthHour → getFourPillars → getFourPillarsShiShen → analyzeGeJu → getNaYin.
 * The hour is resolved through the SAME shared `resolveBirthHour` the server uses, so
 * solo and 合盘 can never disagree on the 时柱: 时辰 mode uses the 时辰 midpoint (never
 * corrected), precise mode (clockMinutes) applies 真太阳时 calibration. 南半球月令置换
 * stays server-only (needs latitude + the heavier engine). AI interpretation (the deep
 * layer) is added on top via reading-cache.
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
  resolveBirthHour,
  STEM_WUXING,
} from '@zhop/astro-core'

export type FateGender = '男' | '女'

export interface FateBirthInput {
  /** Gregorian birth date, `YYYY-MM-DD`. */
  solarDate: string
  /** 时辰 index 0-12 (0 = 早子 00:00, 12 = 晚子 23:00). Ignored when clockMinutes set. */
  timeIndex: number
  /** Precise birth clock, minutes since midnight 0..1439. Present = precise mode. */
  clockMinutes?: number
  /** 真太阳时 calibration toggle (precise mode only); default on. */
  calibrate?: boolean
  /** Birth-city geo — only consumed in precise mode for 真太阳时 calibration. */
  longitude?: number
  timezoneId?: string
  city?: string
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

export function computeFateNatalChart(input: FateBirthInput): FateNatalChart {
  const parts = input.solarDate.split('-')
  const year = Number.parseInt(parts[0] ?? '', 10)
  const month = Number.parseInt(parts[1] ?? '', 10)
  const day = Number.parseInt(parts[2] ?? '', 10)

  // Same resolver the server uses → identical 时柱 in solo and 合盘.
  const resolved = resolveBirthHour({
    year,
    month,
    day,
    timeIndex: input.timeIndex,
    clockMinutes: input.clockMinutes,
    calibrate: input.calibrate,
    longitude: input.longitude,
    timezoneId: input.timezoneId,
    city: input.city,
  })

  const pillars = getFourPillars({
    year: resolved.year,
    month: resolved.month,
    day: resolved.day,
    hour: resolved.hour,
  })
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
