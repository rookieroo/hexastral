/**
 * Hook computation — Progressive Disclosure
 *
 * 1. computeInstantHook() — sync, local, uses @zhop/astro-core
 * 2. upgradeHookWithStar() — from fate reading API response
 */

import type { HeavenlyStem } from '@zhop/astro-core'
import { getFourPillars } from '@zhop/astro-core/ganzhi'
import type { BirthInfo } from '@/lib/domain/birthInfo'
import type { TranslationKeys } from '@/locales/zh'
import type { StarHook, StemHook } from './hookDictionary'
import { STAR_HOOKS, STEM_HOOKS } from './hookDictionary'

export interface InstantHookResult {
  stem: HeavenlyStem
  stemHook: StemHook
}

export interface FullHookResult extends InstantHookResult {
  starHook: StarHook | null
}

/** Time-index → approximate hour (mid-point of each 时辰) */
const TIME_INDEX_TO_HOUR: readonly number[] = [
  0, // 子时 23:00-00:59 → use 0 for computation
  2, // 丑时 01:00-02:59
  4, // 寅时 03:00-04:59
  6, // 卯时 05:00-06:59
  8, // 辰时 07:00-08:59
  10, // 巳时 09:00-10:59
  12, // 午时 11:00-12:59 (also default for unknown)
  14, // 未时 13:00-14:59
  16, // 申时 15:00-16:59
  18, // 酉时 17:00-18:59
  20, // 戌时 19:00-20:59
  22, // 亥时 21:00-22:59
]

/**
 * Compute instant hook from local birth info — no API, no cost, sync.
 *
 * Uses getFourPillars() from @zhop/astro-core/ganzhi to extract the
 * Day Master stem, then looks up the corresponding hook from the dictionary.
 *
 * @returns null if birth info is incomplete (no solarDate)
 */
export function computeInstantHook(birthInfo: BirthInfo): InstantHookResult | null {
  if (!birthInfo.solarDate) return null

  const parts = birthInfo.solarDate.split('-').map(Number)
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null

  const [year, month, day] = parts as [number, number, number]
  const hour = TIME_INDEX_TO_HOUR[birthInfo.timeIndex ?? 6] ?? 12

  const pillars = getFourPillars({ year, month, day, hour })
  const stem = pillars.day.stem

  const stemHook = STEM_HOOKS[stem]
  return { stem, stemHook }
}

/**
 * Upgrade hook with 命宫主星 from fate reading API response.
 *
 * @param soulPalaceStar - major star name from stellar chart meta, e.g. "破军"
 */
export function upgradeHookWithStar(
  instantHook: InstantHookResult,
  soulPalaceStar: string
): FullHookResult {
  const starHook = STAR_HOOKS[soulPalaceStar] ?? null
  return { ...instantHook, starHook }
}

/**
 * Format the complete hook display text.
 *
 * @param hook - The hook result (instant or full)
 * @param t - Translation function from useI18n()
 * @returns Formatted hook string for hero display
 */
export function formatHookDisplay(
  hook: InstantHookResult | FullHookResult,
  t: (key: TranslationKeys) => string
): { oneLiner: string; tag: string; starTag: string | null } {
  const oneLiner = t(hook.stemHook.oneLinerKey)
  const tag = t(hook.stemHook.personalityTagKey)
  const starTag = 'starHook' in hook && hook.starHook ? t(hook.starHook.starTagKey) : null

  return { oneLiner, tag, starTag }
}
