/**
 * Kindred (Kindred) — application rules for the synastry product.
 *
 * Extends the base palette / materials in `palette.ts` with usage proportions,
 * typography scale, motion curves, spacing scale, and radius rules specific to
 * Kindred. The base tokens (rubbing, ricePaper, cinnabar, ink, zinc) are NOT
 * redefined here — they live in palette.ts and are shared across all HexAstral
 * products.
 *
 * Design philosophy:
 *   - hexastral-app aesthetic = stone rubbing on rice paper (static, austere)
 *   - Kindred aesthetic = same rice paper, two cinnabar seals connecting (warmer,
 *     spacious, with cinnabar reserved for emotional peak moments)
 *
 * See docs/decisions/0001-yuan-naming.md for product context.
 */

import { cinnabar, ink, ricePaper, rubbing, stone } from './palette'

// ── Semantic theme — light mode (web teaser surface ONLY; the app is dark-only
//    per ADR-0021 §5 and never reads these tokens) ───────────────────────────────

export const kindredLight = {
  // Surfaces
  bg: ricePaper.ivory,
  bgWarm: ricePaper.warm,
  bgAged: ricePaper.aged,
  card: ricePaper.warm,
  cardElevated: '#FFFFFF',
  /** Contained dark surface — only inside relationship archive cards, never full-screen */
  archiveCard: rubbing.void,
  separator: ricePaper.aged,

  // Text
  text: ink.brown,
  textOnDark: ricePaper.ivory,
  textSecondary: 'rgba(60,36,21,0.65)',
  textMuted: 'rgba(60,36,21,0.35)',

  // Accents
  accent: ink.gold,
  accentMuted: ink.goldMuted,
  /** Reserved for peak emotional moments — one per screen, max */
  seal: cinnabar.seal,
  /** Pressed / hover state for cinnabar elements */
  sealGhost: cinnabar.ghost,

  // Borders
  border: 'rgba(60,36,21,0.12)',
  borderStrong: 'rgba(60,36,21,0.25)',
} as const

// ── Dark mode (the app's only mode — ADR-0021 §5) ───────────────────────────

export const kindredDark = {
  // Warm-neutral Stone base (was the cool 碑拓 void/zinc) — one disciplined ramp the
  // shell reads in; colour sits ON it, never competes with it.
  bg: stone.void,
  bgWarm: stone.deep,
  bgAged: stone.surface,
  card: stone.surface,
  cardElevated: stone.raised,
  archiveCard: stone.void,
  separator: stone.edge,
  text: ricePaper.ivory,
  textOnDark: ricePaper.ivory,
  textSecondary: 'rgba(245,240,232,0.65)',
  textMuted: 'rgba(245,240,232,0.35)',
  // Interaction = moonlight (the brightest neutral), NOT gold: gold was both the 金
  // element colour and the CTA accent — one colour, two jobs. Interaction now carries
  // no hue, so it can never collide with a 五行 colour; cinnabar (`seal`) is the only
  // reserved brand colour. The CTA affordance is brightness + underline/arrow.
  accent: stone.moonlight,
  accentMuted: stone.moonlightMuted,
  seal: cinnabar.bright,
  sealGhost: 'rgba(155,34,38,0.25)',
  border: 'rgba(245,240,232,0.12)',
  borderStrong: 'rgba(245,240,232,0.25)',
} as const

// ── 宣纸 document layer ──────────────────────────────────────────────────────
//
// The warm "paper" surface the long-form reading / paywall / settings present
// on. The app shell is dark (ADR-0021 §5); these screens are the DELIBERATE
// exception — a 文档层 (document layer) the ink-bloom uncovers, so the cream sits
// against the dark home like an unrolled scroll, not a second app. Promoted to
// one named surface (was a private palette inside ReadingReport + scattered
// `ricePaper.ivory` literals) so every cream screen reads as the SAME document
// and can't drift (2026-06: "宣纸=文档层，统一 cream 表面"). Dark-on-cream by
// design — these tokens deliberately invert kindredDark.

export const kindredPaper = {
  /** Rice-paper ground. */
  bg: ricePaper.ivory,
  /** Dark-brown body ink. */
  ink: ink.brown,
  inkSoft: 'rgba(60,36,21,0.72)',
  /** Section accent (bronze). */
  bronze: ink.gold,
  muted: 'rgba(60,36,21,0.45)',
  /** Seal red — the one warm CTA anchor on paper. */
  cinnabar: cinnabar.seal,
  /** Hairline rules on paper. */
  hair: 'rgba(60,36,21,0.14)',
  hairSoft: 'rgba(60,36,21,0.07)',
  /** Light text/glyph sitting on a cinnabar or ink fill. */
  ctaText: ricePaper.ivory,
} as const

export type KindredTheme = typeof kindredLight

// ── Typography ──────────────────────────────────────────────────────────────

export const kindredType = {
  /** 64 / 72 / 300 / -2 — single CJK glyph or extreme minimal headline */
  hero: {
    fontSize: 64,
    lineHeight: 72,
    fontWeight: '300',
    letterSpacing: -2,
  },
  /** 32 / 44 / 400 / -0.5 — chapter / question titles */
  title: {
    fontSize: 32,
    lineHeight: 44,
    fontWeight: '400',
    letterSpacing: -0.5,
  },
  /** 22 / 32 / 500 / 0 — subtitles, chapter names */
  heading: {
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '500',
    letterSpacing: 0,
  },
  /** 16 / 28 / 400 / 0.2 — body text; 1.75× line-height for breathing room */
  body: {
    fontSize: 16,
    lineHeight: 28,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  /** 13 / 20 / 500 / 0.8 — labels, captions */
  caption: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: 0.8,
  },
  /** 11 / 14 / 700 / 4 — uppercase seal-script-style markers */
  seal: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
} as const

// ── Spacing ─────────────────────────────────────────────────────────────────

export const kindredSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
  xxl: 64,
  /** Screen-edge horizontal padding default */
  screenH: 28,
  /** Section vertical padding default */
  screenV: 40,
} as const

// ── Radius ──────────────────────────────────────────────────────────────────

export const kindredRadius = {
  none: 0,
  sm: 4,
  md: 8,
  full: 9999,
} as const

// ── Motion ──────────────────────────────────────────────────────────────────
//
// Reanimated 4 spring / timing configs. Values are plain objects so consumers
// can spread them into withSpring / withTiming as needed.

export const yuanMotion = {
  /** Screen transition: spring damping 22 / stiffness 180 */
  screenTransition: {
    damping: 22,
    stiffness: 180,
    mass: 1,
  },
  /** Card appear: spring damping 18 / stiffness 160 */
  cardAppear: {
    damping: 18,
    stiffness: 160,
    mass: 0.9,
  },
  /** Text fade-in: 600ms ease-out */
  textFade: {
    duration: 600,
  },
  /** Cinnabar seal slam-down: 320ms with heavy curve */
  sealStamp: {
    duration: 320,
  },
  /** Connecting line draw: 1000ms ease-in-out */
  connectingLine: {
    duration: 1000,
  },
  /** Slow breathing: 2400ms per half-cycle */
  breathing: {
    duration: 2400,
  },
} as const

// ── Composite presets ───────────────────────────────────────────────────────
//
// What consumers actually import for common patterns. Each preset is a plain
// style object that can be spread into RN component styles. Keeps callers from
// reaching into individual tokens.

export const kindredPresets = {
  /** Primary CTA — moonlight underline text (the interaction tier), not a button box.
   *  Affordance is the bright neutral + the underline; no hue, so it never reads as
   *  a 五行 colour. */
  ctaText: {
    color: stone.moonlight,
    fontSize: kindredType.heading.fontSize,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    paddingVertical: kindredSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: stone.moonlight,
  },
  /** Cinnabar Kindred seal container — round red ground, gold glyph */
  sealCircle: {
    backgroundColor: cinnabar.seal,
    width: 96,
    height: 96,
    borderRadius: kindredRadius.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  /** Hero CJK glyph (Kindred / 命 / 風) — used in welcome and brand marks */
  heroGlyph: {
    fontSize: 120,
    lineHeight: 140,
    color: cinnabar.seal,
    fontWeight: '400' as const,
  },
} as const
