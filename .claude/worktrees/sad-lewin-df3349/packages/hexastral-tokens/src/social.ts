/**
 * Social card / share card visual config — pure data.
 *
 * Covers:
 *   - Reading share card (post-reading screenshot for social media)
 *   - Chart public card (QR-backed shareable identity card)
 *   - Daily fortune push card
 *   - Constellation / bond map card
 *
 * Platform renderers build ViewShot (iOS) or og:image (web) from these.
 */

import { rubbing, ink, cinnabar, zinc, ricePaper } from './palette'

// ── Card dimensions ──────────────────────────────────────────────────────────
// Standard ratios for social sharing targets.

export interface CardDimensions {
  /** Card width in logical pixels. */
  width: number
  /** Card height in logical pixels. */
  height: number
  /** Content padding in logical pixels. */
  padding: number
}

/** 3:4 portrait for Instagram stories / iOS share sheet. */
export const CARD_PORTRAIT: CardDimensions = { width: 390, height: 520, padding: 24 }

/** 1:1 square for social feeds. */
export const CARD_SQUARE: CardDimensions = { width: 480, height: 480, padding: 28 }

/** 1.91:1 landscape for OG image / Twitter card. */
export const CARD_OG: CardDimensions = { width: 1200, height: 630, padding: 60 }

// ── Card color config ────────────────────────────────────────────────────────

export interface CardColors {
  /** Card background color. */
  bg: string
  /** Primary text color. */
  text: string
  /** Secondary / muted text color. */
  secondary: string
  /** Accent for highlights, metric values. */
  accent: string
  /** Separator / border color. */
  separator: string
  /** Brand watermark color. */
  watermark: string
}

/** Dark card (碑拓 style) — default for most shares. */
export const darkCardColors: CardColors = {
  bg: rubbing.void,
  text: zinc[50],
  secondary: zinc[400],
  accent: ink.gold,
  separator: `${zinc[400]}40`,
  watermark: zinc[600],
}

/** Light card (宣纸 style) — optional for contrast. */
export const lightCardColors: CardColors = {
  bg: ricePaper.ivory,
  text: zinc[900],
  secondary: zinc[500],
  accent: ink.brown,
  separator: `${zinc[500]}30`,
  watermark: zinc[400],
}

// ── Brand footer ─────────────────────────────────────────────────────────────

export const BRAND_FOOTER = {
  text: 'HexAstral',
  symbol: '☰✦',
  url: 'hexastral.com',
} as const

// ── Card type presets ────────────────────────────────────────────────────────

export type SocialCardType =
  | 'reading-share' // post-reading result with key metrics
  | 'chart-identity' // public chart card with QR
  | 'daily-fortune' // daily push card for screenshot
  | 'bond-map' // constellation share image

export interface SocialCardConfig {
  dimensions: CardDimensions
  colors: CardColors
  /** Whether to render the cinnabar seal stamp. */
  showSeal: boolean
  /** Whether to render a QR code placeholder area. */
  showQR: boolean
  /** Brand footer position: 'bottom' or 'none'. */
  footer: 'bottom' | 'none'
}

export const SOCIAL_CARD_CONFIGS: Record<SocialCardType, SocialCardConfig> = {
  'reading-share': {
    dimensions: CARD_PORTRAIT,
    colors: darkCardColors,
    showSeal: true,
    showQR: false,
    footer: 'bottom',
  },
  'chart-identity': {
    dimensions: CARD_SQUARE,
    colors: darkCardColors,
    showSeal: true,
    showQR: true,
    footer: 'bottom',
  },
  'daily-fortune': {
    dimensions: CARD_PORTRAIT,
    colors: darkCardColors,
    showSeal: false,
    showQR: false,
    footer: 'bottom',
  },
  'bond-map': {
    dimensions: CARD_PORTRAIT,
    colors: darkCardColors,
    showSeal: false,
    showQR: false,
    footer: 'bottom',
  },
}

/** Look up social card config by type. */
export function getSocialCardConfig(type: SocialCardType): SocialCardConfig {
  return SOCIAL_CARD_CONFIGS[type]
}
