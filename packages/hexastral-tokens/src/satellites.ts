/**
 * Satellite brand-color palettes — one per satellite app, distinct from each
 * other so the apps don't blur together in App Store grids or cross-app
 * navigation.
 *
 * Per phase-f-plan §1, brand-color assignment is LOCKED. No two satellites
 * share a color family. Adjust here, never in app-local theme files.
 *
 * Each satellite palette exposes the same shape as `ModeTokens` so the
 * `<Button>` / `<Card>` primitives in `@zhop/core-ui` can theme-switch with
 * a single context value.
 */

import type { ModeTokens } from './palette'

// ── Compass / Fēng — shares the flagship Fēng palette ──────────────────────

/** 墨青 + 铜金 (shared with Fēng flagship). */
export const compassPalette = {
  inkTeal: '#0F1E26',
  inkTealMute: '#2E4756',
  copperGold: '#B08D5B',
  copperGoldMute: 'rgba(176,141,91,0.4)',
  copperGoldGhost: 'rgba(176,141,91,0.08)',
} as const

// ── Coin Cast — amber + wood-grain (the ritual moment) ─────────────────────

/** 铜钱琥珀 — bronze coin amber over wood. */
export const coinCastPalette = {
  amber: '#B8741F',
  amberBright: '#D4892B',
  amberMute: 'rgba(184,116,31,0.45)',
  amberGhost: 'rgba(184,116,31,0.08)',
  wood: '#3A2415',
  woodGrain: 'rgba(58,36,21,0.06)',
  parchment: '#F2E5C8', // light-mode wood-table surface
} as const

/** Coin Cast 3D ritual scene — bronze materials, vessel, casting backdrop (R3F). */
export const coinCastSceneColors = {
  coinYang: '#c6ab86',
  coinYin: '#52402e',
  coinEdge: '#8f7658',
  vesselRim: '#2c2824',
  vesselBowl: '#1f1c19',
  castingBackdropDark: '#2a231c',
  castingBackdropLight: '#2e261d',
  hemisphereKey: '#d8cfc4',
  yaoPanelOverlayDark: 'rgba(20,18,14,0.92)',
  yaoPanelOverlayLight: 'rgba(252,249,244,0.94)',
} as const

// ── Face Oracle — jade + ink-wash (camera-first physiognomy) ───────────────

/** 玉色墨韵 — classical jade green with ink wash. */
export const faceOraclePalette = {
  jade: '#3F7B5C',
  jadeBright: '#52A878',
  jadeMute: 'rgba(63,123,92,0.45)',
  jadeGhost: 'rgba(63,123,92,0.08)',
  inkWash: 'rgba(60,36,21,0.04)',
} as const

// ── Dream Oracle — indigo + silver (the night palette) ─────────────────────

/** 夜深星辰 — deep indigo with silver-moon highlights. */
export const dreamOraclePalette = {
  indigo: '#3C3E76',
  indigoBright: '#5A5D9E',
  indigoMute: 'rgba(60,62,118,0.45)',
  indigoGhost: 'rgba(60,62,118,0.08)',
  silver: '#C8C9D6',
  silverMute: 'rgba(200,201,214,0.4)',
} as const

// ── Numerology — cool blue/violet (Western mystical) ───────────────────────

/** Western mystical — cool, less ornamental, more "tarot meets minimalism". */
export const numerologyPalette = {
  violet: '#5B3F8A',
  violetBright: '#7A5BB0',
  violetMute: 'rgba(91,63,138,0.45)',
  violetGhost: 'rgba(91,63,138,0.08)',
  blue: '#4A6FA5',
  blueGhost: 'rgba(74,111,165,0.08)',
} as const

// ── Auspice (黄历) — 朱泥 terra (default) + 3 alt variants ────────────────────
//
// The default 朱泥 honors ADR-0010 §6. The alt variants exist because a single
// red read as overwhelming to some users; each alt is a 黄历-coherent ink the
// almanac tradition itself uses. The 黄历纸 surface tint (`paperGrain`) stays
// terra-anchored regardless of variant — variant changes the highlights, not
// the page feel.

/** 朱泥 — terracotta clay red, the default 黄历 accent. */
export const auspicePalette = {
  terra: '#A8492E',
  terraBright: '#C25E3E',
  terraMute: 'rgba(168,73,46,0.45)',
  terraGhost: 'rgba(168,73,46,0.08)',
  paperGrain: 'rgba(168,73,46,0.05)', // brand-anchored 黄历纸 ambient tint
} as const

/**
 * Auspice accent variants — semantic 黄历 inks. Values picked at mid-luminance
 * so they read on both cream (light) and warm-black (dark) without per-mode
 * pivot. All share the same `accentGhost` alpha pattern as `auspicePalette`.
 */
export type AuspiceAccentVariant = 'terra' | 'ink' | 'azurite' | 'gold'

export const auspiceAccentVariants: Record<
  AuspiceAccentVariant,
  { accent: string; accentBright: string; accentMute: string; accentGhost: string }
> = {
  // 朱泥 (default)
  terra: {
    accent: auspicePalette.terra,
    accentBright: auspicePalette.terraBright,
    accentMute: auspicePalette.terraMute,
    accentGhost: auspicePalette.terraGhost,
  },
  // 苍墨 — warm ink-gray. Brightened 2026-06 (founder "图标颜色不太对"): the original
  // #4D4540 base read dark-on-dark — thin accent strokes (row + card icons, chevrons,
  // selected-date) were muddy on the near-black dark theme (the satellite accent has
  // no light/dark pivot, unlike the flagship per-mode accents). These mid-luminance
  // greys read on the near-black AND still on cream as a restrained ink.
  ink: {
    accent: '#897C6C',
    accentBright: '#A2937E',
    accentMute: 'rgba(137,124,108,0.45)',
    accentGhost: 'rgba(137,124,108,0.08)',
  },
  // 靛青 — textile indigo (intentionally aligned with the 水元素 hue so
  // 干支水日 + brand accent feel of one cloth when this variant is picked)
  azurite: {
    accent: '#3F6B86',
    accentBright: '#5A8AAA',
    accentMute: 'rgba(63,107,134,0.45)',
    accentGhost: 'rgba(63,107,134,0.08)',
  },
  // 赭金 — antique brass-gold (distinct from coincast amber)
  gold: {
    accent: '#9B7A2F',
    accentBright: '#B8954A',
    accentMute: 'rgba(155,122,47,0.45)',
    accentGhost: 'rgba(155,122,47,0.08)',
  },
} as const

// ── Satellite tokens factory ───────────────────────────────────────────────

/**
 * Per-satellite light/dark mode tokens. Each consumes the master `ricePaper`
 * / `rubbing` base from `palette.ts` for surfaces; only the accent line
 * changes per satellite.
 *
 * Call this from each satellite's `lib/theme.ts`:
 *
 *   import { satelliteTokens } from '@zhop/hexastral-tokens/satellites'
 *   const tokens = satelliteTokens('coincast', isDark)
 */
export type SatelliteKey =
  | 'compass'
  | 'coincast'
  | 'faceoracle'
  | 'dreamoracle'
  | 'numerology'
  | 'cycle'

export interface SatelliteAccent {
  accent: string
  accentBright: string
  accentMute: string
  accentGhost: string
  /** Optional ambient surface tint (e.g. wood-grain for coin-cast). */
  surfaceTint?: string
}

/**
 * @param accentVariant Optional variant id. Auspice accepts the
 *   `AuspiceAccentVariant` ids ('terra' | 'ink' | 'azurite' | 'gold'); other
 *   satellites currently ignore it. Unknown variants fall back to the
 *   satellite's default accent.
 */
export function getSatelliteAccent(key: SatelliteKey, accentVariant?: string): SatelliteAccent {
  switch (key) {
    case 'compass':
      return {
        accent: compassPalette.copperGold,
        accentBright: compassPalette.copperGold,
        accentMute: compassPalette.copperGoldMute,
        accentGhost: compassPalette.copperGoldGhost,
      }
    case 'coincast':
      return {
        accent: coinCastPalette.amber,
        accentBright: coinCastPalette.amberBright,
        accentMute: coinCastPalette.amberMute,
        accentGhost: coinCastPalette.amberGhost,
        surfaceTint: coinCastPalette.woodGrain,
      }
    case 'faceoracle':
      return {
        accent: faceOraclePalette.jade,
        accentBright: faceOraclePalette.jadeBright,
        accentMute: faceOraclePalette.jadeMute,
        accentGhost: faceOraclePalette.jadeGhost,
        surfaceTint: faceOraclePalette.inkWash,
      }
    case 'dreamoracle':
      return {
        accent: dreamOraclePalette.indigo,
        accentBright: dreamOraclePalette.indigoBright,
        accentMute: dreamOraclePalette.indigoMute,
        accentGhost: dreamOraclePalette.indigoGhost,
      }
    case 'numerology':
      return {
        accent: numerologyPalette.violet,
        accentBright: numerologyPalette.violetBright,
        accentMute: numerologyPalette.violetMute,
        accentGhost: numerologyPalette.violetGhost,
      }
    case 'cycle': {
      const v =
        accentVariant && accentVariant in auspiceAccentVariants
          ? auspiceAccentVariants[accentVariant as AuspiceAccentVariant]
          : auspiceAccentVariants.terra
      return {
        accent: v.accent,
        accentBright: v.accentBright,
        accentMute: v.accentMute,
        accentGhost: v.accentGhost,
        // The 黄历纸 ambient page-tint now FOLLOWS the accent (2026-06): with the ink
        // default brand, a warm terra page-feel under a neutral ink accent read
        // incoherent. Tracking the active accent keeps the page + highlights one cloth
        // (ink → neutral warm-gray, terra → warm clay, etc.).
        surfaceTint: v.accentGhost,
      }
    }
  }
}

/**
 * Compose master mode tokens with a satellite accent override.
 * Returns a `ModeTokens`-shaped object ready for `@zhop/core-ui` consumption.
 */
export function satelliteTokens(
  key: SatelliteKey,
  baseTokens: ModeTokens,
  accentVariant?: string
): ModeTokens & { accentBright: string; accentGhost: string; surfaceTint?: string } {
  const a = getSatelliteAccent(key, accentVariant)
  return {
    ...baseTokens,
    accent: a.accent,
    accentBright: a.accentBright,
    accentGhost: a.accentGhost,
    surfaceTint: a.surfaceTint,
  }
}
