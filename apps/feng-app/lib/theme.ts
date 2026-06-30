/**
 * Fēng app theme — Phase F back-compat shim.
 *
 * Phase E shipped a local FENG_PALETTE + useFengTheme. Phase F moves the
 * source of truth into `@zhop/core-ui` (brand="feng"). This file now:
 *
 *   1. Re-exports FENG_PALETTE for raw color access (BootSplash, BaguaCompassOverlay arrows).
 *   2. Re-exports `spacing` constants for back-compat (apps still use spacing.lg etc.).
 *   3. Provides `useFengTheme()` as a thin adapter over `useTheme()` from core-ui,
 *      so existing screens that destructure `{ colors }` keep working unmodified.
 *
 * New code should import directly from `@zhop/core-ui`:
 *
 *   import { useTheme } from '@zhop/core-ui'
 *   const { colors, spacing, getElevation } = useTheme()
 *
 * Once all Fēng screens migrate, this file can be deleted.
 */

import { useTheme } from '@zhop/core-ui'

// Raw palette — needed for BootSplash (pre-provider) and for SVG components
// (BaguaCompassOverlay arrow colors) where the brand colors are visualization
// semantics, not theme chrome.
export const FENG_PALETTE = {
  inkTeal: '#0F1E26',
  inkTealMid: '#2E4756',
  copperGold: '#B08D5B',
  copperGoldMute: '#7A6240',
  cinnabar: '#9B2226',
  rice: '#F5EFE3',
  riceWarm: '#EAE3D0',
  riceMute: '#A89F8E',
  black: '#020608',
  /**
   * Yuel-aligned night shell — a deep near-black 墨 with only a whisper of teal
   * (kindred's ground is a warm near-black; feng keeps its 墨青 identity but at
   * this depth so it no longer reads as a flat mid-teal). Use for the app shell
   * (home / settings / stack ground); keep `inkTeal` for accents + satellite art.
   */
  night: '#0A1316',
  nightRaised: '#101D21',
  hairline: 'rgba(176,141,91,0.16)',
} as const

/**
 * 宣纸 document palette for the report ("墨儀" ink-on-paper look, à la kindred's
 * kindredPaper but in Fēng's own 墨青/铜金/朱砂 brand). Fixed regardless of
 * light/dark mode — the report reads as an unrolled scroll.
 */
export const FENG_PAPER = {
  bg: '#F3ECDD', // warm 宣纸 ground
  sheet: '#F8F2E6', // chapter-card surface (lifts off the ground)
  ink: '#1A2A30', // 墨 body text (warm dark, legible on cream)
  inkSoft: 'rgba(26,42,48,0.70)',
  muted: 'rgba(26,42,48,0.45)',
  bronze: '#8A6D3B', // 铜金 section accent (darkened for contrast on cream)
  cinnabar: '#9B2226', // 朱砂 — peak / golden-line / inauspicious
  hair: 'rgba(26,42,48,0.14)', // hairline rules + card border
  hairSoft: 'rgba(26,42,48,0.07)',
} as const

export interface FengColors {
  bg: string
  surface: string
  surfaceMute: string
  text: string
  textMute: string
  accent: string
  accentMute: string
  border: string
  warning: string
  success: string
  /** Visualization-specific: face-direction arrow on satellite overlays. */
  arrowFace: string
  /** Visualization-specific: sit-direction arrow on satellite overlays. */
  arrowSit: string
}

/**
 * @deprecated New code should call `useTheme()` from `@zhop/core-ui` directly.
 *             This shim maps the core-ui theme onto the legacy FengColors shape
 *             so existing screens keep working during the Phase F migration.
 */
export function useFengTheme(): { isDark: boolean; colors: FengColors } {
  const theme = useTheme()
  const c = theme.colors
  return {
    isDark: theme.isDark,
    colors: {
      bg: c.bg,
      surface: c.card,
      surfaceMute: c.cardElevated,
      text: c.text,
      textMute: c.secondary,
      accent: c.accent,
      accentMute: c.accentGhost,
      border: c.separator,
      warning: c.warning,
      success: c.success,
      // Visualization-specific arrow colors stay brand-fixed regardless of mode.
      arrowFace: FENG_PALETTE.copperGold,
      arrowSit: FENG_PALETTE.cinnabar,
    },
  }
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const
