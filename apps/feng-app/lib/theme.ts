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
// Zinc-neutral, dark-by-default (see FLAGSHIP_ACCENTS.feng in core-ui). 土黄/
// copper/朱砂 dropped as brand chrome — emphasis is carried by neutral
// brightness, not hue. Names kept for back-compat; values are now zinc.
export const FENG_PALETTE = {
  inkTeal: '#18181B', // zinc-900 — dark ground behind satellite tiles
  inkTealMid: '#3F3F46', // zinc-700
  copperGold: '#D4D4D8', // zinc-300 — the "accent" (was copper); bright neutral
  copperGoldMute: '#71717A', // zinc-500
  cinnabar: '#A1A1AA', // zinc-400 — decorative distinguisher (was red); NOT danger
  rice: '#F4F4F5', // zinc-100 — light text/marks on the dark shell
  riceWarm: '#E4E4E7', // zinc-200
  riceMute: '#71717A', // zinc-500
  black: '#09090B', // zinc-950
  /** Neutral near-black app shell (home / settings / stack ground). */
  night: '#09090B', // zinc-950
  nightRaised: '#18181B', // zinc-900
  hairline: 'rgba(228,228,231,0.10)', // neutral hairline
} as const

/**
 * Report document palette ("墨儀" — now a DARK zinc sheet, not cream 宣纸).
 * Fixed regardless of app light/dark; the report reads as one dark scroll.
 * `ink` is now the LIGHT text color (report ground is dark). Danger/煞 uses a
 * single restrained desaturated red (`danger`), not the old decorative 朱砂.
 */
export const FENG_PAPER = {
  bg: '#111113', // near-zinc-950 report ground
  sheet: '#1C1C1F', // chapter-card surface (lifts off the ground)
  ink: '#FAFAFA', // zinc-50 — body text (light on dark)
  inkSoft: 'rgba(250,250,250,0.68)',
  muted: 'rgba(250,250,250,0.42)',
  bronze: '#D4D4D8', // zinc-300 section accent (was 铜金)
  cinnabar: '#D4D4D8', // neutral emphasis for golden-line/peak (was 朱砂 red)
  danger: '#B4726E', // the ONLY red — desaturated, reserved for 煞/凶 semantics
  hair: 'rgba(250,250,250,0.12)', // hairline rules + card border
  hairSoft: 'rgba(250,250,250,0.06)',
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
