/**
 * Shared fate-reading utilities used by:
 *   - app/detail/fate/[id].tsx
 *   - app/(tabs)/index.tsx
 *   - @/components/bazi NatalPillarGrid / NatalGejuCard
 */

import { wuxingColors } from '@/lib/theme'

// ── Consensus insights ───────────────────────────────────────────────────────

export type Insight = {
  dimension: string
  direction: string
  confidence: string
  summary: string
}

export function toInsights(raw: unknown): Insight[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (v): v is Insight => typeof v === 'object' && v !== null && 'dimension' in v && 'summary' in v
  )
}

// ── Heavenly stem → five-element key ────────────────────────────────────────

/** Maps a Heavenly Stem character to a wuxingColors key. */
export const STEM_WUXING: Record<string, keyof typeof wuxingColors> = {
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

/** Maps a Chinese five-element character (木火土金水) to a wuxingColors key. */
export const WUXING_CHAR: Record<string, keyof typeof wuxingColors> = {
  木: 'wood',
  火: 'fire',
  土: 'earth',
  金: 'metal',
  水: 'water',
}

/** Resolve the wuxingColors accent for a given Heavenly Stem, with fallback. */
export function stemAccent(stem: string, fallback: string): string {
  const key = STEM_WUXING[stem]
  return key ? wuxingColors[key].accent : fallback
}

/** Resolve the wuxingColors accent for a Chinese element character (木火土金水), with fallback. */
export function elementAccent(char: string, fallback: string): string {
  // Try direct element char first (木火土金水), then treat as stem
  const byChar = WUXING_CHAR[char]
  if (byChar) return wuxingColors[byChar].accent
  const byStem = STEM_WUXING[char]
  return byStem ? wuxingColors[byStem].accent : fallback
}

// ── Direction → left-border accent ──────────────────────────────────────────

export function directionAccent(direction: string): string {
  if (direction === '同向顺') return wuxingColors.wood.accent
  if (direction === '同向逆') return wuxingColors.fire.accent
  return wuxingColors.earth.accent
}
