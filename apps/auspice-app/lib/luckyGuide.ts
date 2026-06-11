/**
 * 用神 → 吉色 / 吉方 / 吉时 — the actionable personal daily increments for the
 * home 对你而言 card (ADR-0020 personalization track).
 *
 * Deliberately ON-DEVICE and app-only: these increments are NEVER serialized into
 * the deterministic /day payload, the .ics export, or the push (which would harm
 * DAU + subscription value — the export stays a lean hook; depth lives in-app).
 *
 * Unlike the universal 黄历 `auspiciousColor/Direction` (which key off the DAY's
 * pillar — same for everyone), these key off the USER's 用神 (favorableElement),
 * so they actually differ per person. 用神 comes from the full chart via
 * `analyzeGeJu`, so it is precise when the 时辰 is known (falls back to 午时 when
 * not — the same convention the rest of the app uses).
 */

import {
  analyzeGeJu,
  getFourPillars,
  getFourPillarsShiShen,
  type HeavenlyStem,
  STEM_WUXING,
  type WuXing,
} from '@zhop/astro-core'
import type { AuspiceBirthInfo } from './birth'
import { resolveSolarInput } from './synastry-timeline'

/** One 吉时 window — the day's 时辰 whose 时干五行 matches the user's 用神. */
export interface LuckyHour {
  /** 地支 char (子/丑/…/亥) — formatted into a 时辰 name per locale. */
  branch: string
  startHour: number
  endHour: number
}

/** The resolved personal daily guide; `element` is the 用神 (drives swatch + labels). */
export interface LuckyGuide {
  element: WuXing
  hours: LuckyHour[]
}

/**
 * 用神 五行 from the user's full chart. Null when birth info is missing/unparseable
 * (then the card simply omits the increment row).
 */
export function favorableElementOf(birth: AuspiceBirthInfo | null): WuXing | null {
  const input = resolveSolarInput(birth)
  if (!input) return null
  try {
    const pillars = getFourPillars(input)
    return analyzeGeJu(pillars, getFourPillarsShiShen(pillars)).favorableElement
  } catch {
    return null
  }
}

/** Minimal hour shape (a subset of `AuspiceHour`) so this stays payload-agnostic. */
type HourLike = { branch: string; startHour: number; endHour: number; ganZhi: string }

/**
 * The day's 吉时 for this user: 时辰 whose 时干五行 equals 用神. Derives entirely from
 * the day payload's pre-computed 五鼠遁 hour pillars — no extra 排盘.
 */
export function luckyHoursFor(favEl: WuXing, hours: readonly HourLike[]): LuckyHour[] {
  return hours
    .filter((h) => STEM_WUXING[h.ganZhi[0] as HeavenlyStem] === favEl)
    .map((h) => ({ branch: h.branch, startHour: h.startHour, endHour: h.endHour }))
}

/** Build the full guide (用神 + today's 吉时), or null when 用神 is unknown. */
export function buildLuckyGuide(
  favEl: WuXing | null,
  hours: readonly HourLike[]
): LuckyGuide | null {
  if (!favEl) return null
  return { element: favEl, hours: luckyHoursFor(favEl, hours) }
}
