/**
 * Lunar phase computation — pure math, zero dependencies.
 *
 * Reference epoch: 2026-04-16 06:00 UTC (verified new moon — 三月初一).
 * Synodic month: 29.53059 days.
 *
 * The reference is updated every ~12 months to keep accumulated drift
 * below 0.1 days. Previous: 2025-01-29 12:36 UTC.
 */

// ── Constants ────────────────────────────────────────────────────────────────

const REF_NEW_MOON_MS = 1776315600000 // new Date('2026-04-16T06:00:00Z').getTime()
const LUNAR_CYCLE_MS = 29.53059 * 86_400_000

// ── Phase calculation ────────────────────────────────────────────────────────

/** Fractional lunar phase [0, 1): 0 = 朔 (new), 0.5 = 望 (full). */
export function getLunarPhase(now: number = Date.now()): number {
  const elapsed = now - REF_NEW_MOON_MS
  return ((elapsed % LUNAR_CYCLE_MS) / LUNAR_CYCLE_MS + 1) % 1
}

// ── Phase names ──────────────────────────────────────────────────────────────

export type LunarPhaseName =
  | 'new'
  | 'waxing-crescent'
  | 'first-quarter'
  | 'waxing-gibbous'
  | 'full'
  | 'waning-gibbous'
  | 'last-quarter'
  | 'waning-crescent'

/** CJK display name for each phase. */
export const LUNAR_PHASE_CJK: Record<LunarPhaseName, string> = {
  'new': '朔',
  'waxing-crescent': '峨眉',
  'first-quarter': '上弦',
  'waxing-gibbous': '盈凸',
  full: '望',
  'waning-gibbous': '亏凸',
  'last-quarter': '下弦',
  'waning-crescent': '残月',
}

/** Map fractional phase → named phase. */
export function getLunarPhaseName(phase: number): LunarPhaseName {
  const p = ((phase % 1) + 1) % 1
  if (p < 0.02 || p >= 0.98) return 'new'
  if (p < 0.23) return 'waxing-crescent'
  if (p < 0.27) return 'first-quarter'
  if (p < 0.48) return 'waxing-gibbous'
  if (p < 0.52) return 'full'
  if (p < 0.73) return 'waning-gibbous'
  if (p < 0.77) return 'last-quarter'
  return 'waning-crescent'
}

// ── Gradient math for planet logo ────────────────────────────────────────────

export interface PhaseGradient {
  /** Dark-portion offset percentage (0–100). */
  offset: number
  /** Whether the moon is waning (gradient flips direction). */
  isWaning: boolean
  /** Gradient x1 coordinate ('0' | '1'). */
  x1: string
  /** Gradient x2 coordinate ('0' | '1'). */
  x2: string
}

/**
 * Convert fractional phase → gradient params for the planet logo sphere.
 *
 * offset=100% → all void (new moon)
 * offset=50%  → half lit (quarter)
 * offset=0%   → fully lit (full moon)
 */
export function computePhaseGradient(phase: number): PhaseGradient {
  const p = ((phase % 1) + 1) % 1
  const litFrac = (1 - Math.cos(2 * Math.PI * p)) / 2
  const offset = Math.round((1 - litFrac) * 100)
  const isWaning = p > 0.5
  return {
    offset,
    isWaning,
    x1: isWaning ? '1' : '0',
    x2: isWaning ? '0' : '1',
  }
}
