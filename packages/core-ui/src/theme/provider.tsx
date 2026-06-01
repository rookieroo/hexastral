/**
 * CoreUIProvider — single source of truth for tokens, motion, and elevation
 * across all HexAstral apps.
 *
 * Composes:
 *   - master ModeTokens (light/dark) from `@zhop/hexastral-tokens/palette`
 *   - per-brand accent override (flagship cinnabar / 墨青 / inky-gold;
 *     satellite amber / jade / indigo / violet)
 *   - motion + elevation tokens
 *   - typography + spacing scale
 *
 * Apps wrap their root in <CoreUIProvider brand="..." mode="dark"> and every
 * downstream primitive reads from `useTheme()`. No app-local theme files.
 */

import { type ElevationKey, type ElevationLevel, elevation } from '@zhop/hexastral-tokens/elevation'
import { duration, motion, type SpringKey, spring } from '@zhop/hexastral-tokens/motion'
import {
  BORDER_RADIUS,
  darkTokens,
  getHighlightColors,
  getScrimColors,
  lightTokens,
  type ModeTokens,
  SPACING,
  TYPOGRAPHY,
} from '@zhop/hexastral-tokens/palette'
import { getSatelliteAccent, type SatelliteKey } from '@zhop/hexastral-tokens/satellites'
import { createContext, type ReactNode, useContext, useMemo } from 'react'

// ── Brand identity ─────────────────────────────────────────────────────────

/**
 * Locked brand assignments per phase-f-plan §1. No new brand keys without
 * updating ADR-0004.
 *
 * Flagships:
 *   - 'hexastral' — ink + gold (master tokens, no override)
 *   - 'yuan'      — cinnabar
 *   - 'feng'      — 墨青 + copper
 *
 * Satellites (re-exported from hexastral-tokens):
 *   - 'compass' / 'coincast' / 'faceoracle' / 'dreamoracle' / 'numerology'
 */
export type CoreUIBrand = 'hexastral' | 'yuan' | 'feng' | SatelliteKey

export type CoreUIMode = 'light' | 'dark'

// Flagship-specific accent overrides (satellites use getSatelliteAccent).
const FLAGSHIP_ACCENTS: Record<'hexastral' | 'yuan' | 'feng', { light: string; dark: string }> = {
  hexastral: {
    light: lightTokens.accent, // ink brown
    dark: darkTokens.accent, // ink gold
  },
  yuan: {
    light: '#9B2226', // cinnabar
    dark: '#C4A882', // ink gold in dark mode for legibility
  },
  feng: {
    light: '#0F1E26', // 墨青 (used as accent on light surfaces)
    dark: '#B08D5B', // copper gold in dark mode
  },
}

// ── Theme shape ────────────────────────────────────────────────────────────

export interface CoreUITheme {
  brand: CoreUIBrand
  mode: CoreUIMode
  isDark: boolean

  /** Master mode tokens with brand accent applied. */
  colors: ModeTokens & {
    accentBright: string
    accentGhost: string
    surfaceTint?: string
    warning: string
    success: string
    danger: string
    /** Modal / sheet backdrop dim. */
    scrim: string
    /** Full-screen loading overlay. */
    scrimHeavy: string
  }

  spacing: typeof SPACING
  typography: typeof TYPOGRAPHY
  radius: typeof BORDER_RADIUS

  motion: typeof motion
  spring: typeof spring
  duration: typeof duration

  elevation: typeof elevation
  getElevation: (key: ElevationKey) => ElevationLevel
}

const ThemeContext = createContext<CoreUITheme | null>(null)

// ── Provider ───────────────────────────────────────────────────────────────

export interface CoreUIProviderProps {
  brand: CoreUIBrand
  mode: CoreUIMode
  children: ReactNode
}

export function CoreUIProvider({ brand, mode, children }: CoreUIProviderProps) {
  const theme = useMemo<CoreUITheme>(() => buildTheme(brand, mode), [brand, mode])

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

export function useTheme(): CoreUITheme {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be called inside <CoreUIProvider>. Wrap your app root with it.')
  }
  return ctx
}

// ── Build ──────────────────────────────────────────────────────────────────

function buildTheme(brand: CoreUIBrand, mode: CoreUIMode): CoreUITheme {
  const isDark = mode === 'dark'
  const baseTokens: ModeTokens = isDark ? darkTokens : lightTokens
  const highlights = getHighlightColors(isDark)
  const scrims = getScrimColors(isDark)

  // Resolve brand accent.
  let accent = baseTokens.accent
  let accentBright = baseTokens.accent
  let accentGhost: string = isDark ? 'rgba(196,168,130,0.12)' : 'rgba(60,36,21,0.06)'
  let surfaceTint: string | undefined

  if (brand === 'hexastral' || brand === 'yuan' || brand === 'feng') {
    accent = FLAGSHIP_ACCENTS[brand][mode]
    accentBright = accent
  } else {
    // Satellite — use satellite accent factory.
    const sat = getSatelliteAccent(brand)
    accent = sat.accent
    accentBright = sat.accentBright
    accentGhost = sat.accentGhost
    surfaceTint = sat.surfaceTint
  }

  return {
    brand,
    mode,
    isDark,
    colors: {
      ...baseTokens,
      accent,
      accentBright,
      accentGhost,
      surfaceTint,
      warning: highlights.warnBar,
      success: '#22C55E',
      danger: '#EF4444',
      scrim: scrims.scrim,
      scrimHeavy: scrims.scrimHeavy,
    },
    spacing: SPACING,
    typography: TYPOGRAPHY,
    radius: BORDER_RADIUS,
    motion,
    spring,
    duration,
    elevation,
    getElevation: (key: ElevationKey) => elevation[key],
  }
}
