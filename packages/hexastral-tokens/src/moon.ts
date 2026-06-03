/**
 * Moon-phase loader tokens — geometry, timing, and skin presets.
 *
 * Shared across the 8-app suite so every product surface uses the same
 * water-ink moon language with its own tonal identity.
 *
 * Pure TypeScript: zero React / Skia deps. The actual rendering lives in
 * `@zhop/core-ui/motion/MoonPhaseLoader`, which consumes these tokens.
 *
 *   import { SKIN_RICE_PAPER, SWEEP, phaseToCx } from '@zhop/hexastral-tokens/moon'
 *
 * Geometry mirrors HTML POC `docs/design/motion-poc-fate-flow.html` exactly:
 *   viewBox 100, moon (cx=50, cy=50, r=40), shadow disc (cx variable, r=48).
 *   SWEEP=180 → shadow disc sweeps 90 left & 90 right of moon centre across
 *   one cycle, the satellite just clearing the moon disc at the extremes
 *   (cx=50±90, edge at 50±138, moon edge at 50±40 — well past).
 */

// ── Geometry (viewBox 100 units, matches HTML mphwrap) ──
export const MOON_VIEWBOX = 100
export const MOON_CX = 50
export const MOON_CY = 50
export const MOON_R = 40
export const SHADOW_R = 48
/** Disc cx travel range — see HTML SWEEP=180. */
export const SWEEP = 180

// ── Timing ──
/** Full new→full→new cycle, ms. HTML: MOON_SPEED=0.0027/frame at 60fps ≈ 6.2s. */
export const PHASE_DUR = 6200
/** Faster cycle for the mini inline indicator. */
export const PHASE_DUR_MINI = 2200

/**
 * Map phase ∈ [0, 1] to shadow disc cx.
 *
 * - p<0.5: waxing — shadow retreats left (right side lights up).
 * - p≥0.5: waning — shadow returns from the right (left lights last).
 * - p=0.5: shadow has fully cleared the moon disc; "jumps" via reset path.
 *
 * Marked as a reanimated worklet candidate (use inside `useDerivedValue`).
 */
export function phaseToCx(p: number): number {
  'worklet'
  return p < 0.5 ? MOON_CX - SWEEP * p : MOON_CX + SWEEP * (1 - p)
}

// ──────────────────────────────────────────────────────────────────
// Skin system — two orthogonal dimensions:
//   • face — colour palette of the lit area (radial gradient stops)
//   • surface — material texture overlay (paper fibre / silk sheen /
//               stone mottling / nothing). NOT every skin has paper.
// ──────────────────────────────────────────────────────────────────

/** Material texture overlaid on the moon (defaults per kind embedded). */
export type MoonSurface =
  | { kind: 'none' }
  /** HTML mphgrain — fbm 0.85 + Overlay + opacity 0.28 default. */
  | { kind: 'paper'; opacity?: number }
  /** Tight high-freq fbm + SoftLight + 0.18 default — subtle metal sheen. */
  | { kind: 'silk'; opacity?: number }
  /** Low-freq raw fbm + Overlay + 0.22 default — patina / weathered. */
  | { kind: 'stone'; opacity?: number }

/** Gradient stop in face/shadow palettes. */
export type MoonStop = { offset: number; color: string }

/**
 * Complete moon-face skin. Each app picks one (or registers its own) to
 * brand its loader / hero moon while keeping the motion language shared.
 */
export type MoonFaceSkin = {
  id: string
  name: string
  /** Lit-face radial gradient centre, in objectBoundingBox units (0-1). */
  faceCenter: { cx: number; cy: number }
  /** Lit-face radial radius, fraction of bbox. */
  faceRadius: number
  /** Lit-face gradient stops (cream → darker for default 月白 / 宣纸). */
  faceStops: MoonStop[]
  /** Material treatment on top of the lit face. */
  surface: MoonSurface
  /** Optional shadow-tone override (defaults to HTML v15Shadow if omitted). */
  shadowStops?: MoonStop[]
}

// ── 6 built-in skins ────────────────────────────────────────────

/** HTML POC default: cream face + paper-fibre overlay. */
export const SKIN_RICE_PAPER: MoonFaceSkin = {
  id: 'rice-paper',
  name: '宣纸',
  faceCenter: { cx: 0.36, cy: 0.3 },
  faceRadius: 0.68,
  faceStops: [
    { offset: 0, color: '#e7e0d0' },
    { offset: 0.55, color: '#d4cbb4' },
    { offset: 1, color: '#b5ac96' },
  ],
  surface: { kind: 'paper', opacity: 0.28 },
}

/** Clean cream — no overlay. The "pure" moon. */
export const SKIN_MOON_WHITE: MoonFaceSkin = {
  id: 'moon-white',
  name: '月白',
  faceCenter: { cx: 0.36, cy: 0.3 },
  faceRadius: 0.68,
  faceStops: [
    { offset: 0, color: '#f0ece0' },
    { offset: 0.55, color: '#dcd5c2' },
    { offset: 1, color: '#b5ac96' },
  ],
  surface: { kind: 'none' },
}

/** Cool silver face + silk sheen. */
export const SKIN_SILVER: MoonFaceSkin = {
  id: 'silver',
  name: '银',
  faceCenter: { cx: 0.36, cy: 0.3 },
  faceRadius: 0.68,
  faceStops: [
    { offset: 0, color: '#f5f4f0' },
    { offset: 0.55, color: '#c2c6cc' },
    { offset: 1, color: '#828a94' },
  ],
  surface: { kind: 'silk', opacity: 0.18 },
}

/** Warm bronze face + stone patina. */
export const SKIN_BRONZE: MoonFaceSkin = {
  id: 'bronze',
  name: '古铜',
  faceCenter: { cx: 0.36, cy: 0.3 },
  faceRadius: 0.68,
  faceStops: [
    { offset: 0, color: '#f0d6a0' },
    { offset: 0.55, color: '#c89460' },
    { offset: 1, color: '#7e5a30' },
  ],
  surface: { kind: 'stone', opacity: 0.22 },
}

/** Polished jade — glassy clean, no overlay. */
export const SKIN_JADE: MoonFaceSkin = {
  id: 'jade',
  name: '玉青',
  faceCenter: { cx: 0.36, cy: 0.3 },
  faceRadius: 0.68,
  faceStops: [
    { offset: 0, color: '#e6efe0' },
    { offset: 0.55, color: '#9cb89a' },
    { offset: 1, color: '#4c6c5a' },
  ],
  surface: { kind: 'none' },
}

/** Vermillion — alert / festive (use sparingly). */
export const SKIN_CINNABAR: MoonFaceSkin = {
  id: 'cinnabar',
  name: '朱砂',
  faceCenter: { cx: 0.36, cy: 0.3 },
  faceRadius: 0.68,
  faceStops: [
    { offset: 0, color: '#f3d8c0' },
    { offset: 0.55, color: '#c87454' },
    { offset: 1, color: '#7a2418' },
  ],
  surface: { kind: 'none' },
}

/**
 * Cinnabar with a matte paper grain — Kindred's brand phase-moon. Same face as
 * SKIN_CINNABAR but with the water-ink paper surface (instead of the glossy
 * `clean`/none look), so the swelling focal moon reads as the same matte ink
 * material as the V15 logo moon's `inkM` edge rather than smooth plastic.
 * NOT in ALL_MOON_SKINS — it's an app-brand variant, not a user-picker option.
 */
export const SKIN_CINNABAR_INK: MoonFaceSkin = {
  id: 'cinnabar-ink',
  name: '朱砂·墨',
  faceCenter: { cx: 0.36, cy: 0.3 },
  faceRadius: 0.68,
  faceStops: [
    { offset: 0, color: '#f3d8c0' },
    { offset: 0.55, color: '#c87454' },
    { offset: 1, color: '#7a2418' },
  ],
  // 0.28 (the rice-paper default) rather than a faint 0.18 — the lit face must
  // read as matte ink-on-paper, not a smooth plastic sphere, so its material
  // matches the water-ink shadow side (2026-06 feedback: 表面光滑 vs 水墨阴影不搭).
  surface: { kind: 'paper', opacity: 0.28 },
}

/** All built-in skins in display order (for pickers). */
export const ALL_MOON_SKINS: MoonFaceSkin[] = [
  SKIN_RICE_PAPER,
  SKIN_MOON_WHITE,
  SKIN_SILVER,
  SKIN_BRONZE,
  SKIN_JADE,
  SKIN_CINNABAR,
]

/** Default skin — matches HTML POC behaviour. */
export const DEFAULT_MOON_SKIN = SKIN_RICE_PAPER

/** Convenience lookup map by id. */
export const MOON_SKINS_BY_ID: Record<string, MoonFaceSkin> = Object.fromEntries(
  ALL_MOON_SKINS.map((s) => [s.id, s])
)

/** HTML v15Shadow — used when a skin doesn't override shadowStops. */
export const DEFAULT_SHADOW_STOPS: MoonStop[] = [
  { offset: 0, color: '#0e0d0c' },
  { offset: 0.5, color: '#131218' },
  { offset: 0.78, color: '#1a1922' },
  { offset: 0.94, color: 'rgba(26,25,34,0.4)' },
  { offset: 1, color: 'rgba(26,25,34,0)' },
]

// ──────────────────────────────────────────────────────────────────
// Logo moon skin — the STATIC moon form (splash logo, hero, share card).
// Different visual from loading moon-phase: a single radial that's dark
// at the offset centre and CREAM at the 100% edge → rim-lit sphere look.
// Maps to HTML POC `v15G` gradient + inkM filter (used by v15moon()).
// ──────────────────────────────────────────────────────────────────

export type LogoMoonSkin = {
  id: string
  name: string
  /** Radial gradient — v15G shape (dark centre, cream rim). */
  gradient: {
    /** Centre x in objectBoundingBox units (0-1). HTML v15G: 0.64. */
    cx: number
    /** Centre y. HTML v15G: 0.70. */
    cy: number
    /** Radius fraction. HTML v15G: 0.62. */
    r: number
    /** Stops — last must be the cream rim. */
    stops: MoonStop[]
  }
}

/** HTML v15G — the default fate-app water-ink logo moon. */
export const LOGO_DEFAULT_V15: LogoMoonSkin = {
  id: 'default',
  name: '水墨月',
  gradient: {
    cx: 0.64,
    cy: 0.7,
    r: 0.62,
    stops: [
      { offset: 0, color: '#3a3a40' },
      { offset: 0.42, color: '#222227' },
      { offset: 0.78, color: '#15151a' },
      { offset: 1, color: '#e7e0d0' },
    ],
  },
}

/**
 * Night-sky variant — same rim-lit shape, but the dark sphere fades into
 * rubbing.void (#0B0B0C) so the moon's shadow side melts into a void-black
 * night scene instead of floating as a grey disc (kindred intro, ADR-0018
 * dark-only surfaces).
 */
export const LOGO_NIGHT_V15: LogoMoonSkin = {
  id: 'night',
  name: '夜空月',
  gradient: {
    cx: 0.64,
    cy: 0.7,
    r: 0.62,
    stops: [
      { offset: 0, color: '#1A1A1F' },
      { offset: 0.42, color: '#121214' },
      { offset: 0.78, color: '#0B0B0C' },
      { offset: 1, color: '#e7e0d0' },
    ],
  },
}

/**
 * Cinnabar logo moon — Kindred's brand mark. A "朱砂色月亮" — vermillion lights
 * the lit crescent (the rim, where the sun is striking the moon) while the
 * shadowed body deepens to burgundy / void. The radial gradient is centred
 * off-axis (cx 0.64, cy 0.7) so the dark body sits opposite the lit side and
 * the rim-light reads as a true crescent rather than a halo.
 *
 * 2026-06: a prior tune put cinnabar on the BODY and ivory on the rim, which
 * read as a red sphere with a halo (the lit face was cream, not red). The lit
 * side should be the cinnabar; the body should be the shadow. Swapped to fix.
 */
export const LOGO_CINNABAR_V15: LogoMoonSkin = {
  id: 'cinnabar',
  name: '朱砂月',
  gradient: {
    cx: 0.64,
    cy: 0.7,
    r: 0.62,
    stops: [
      { offset: 0, color: '#3a0a08' },
      { offset: 0.42, color: '#641c12' },
      { offset: 0.78, color: '#a82e28' },
      { offset: 1, color: '#e85a3d' },
    ],
  },
}

/** Logo moon constants (HTML v15moon: circle cx=50, cy=50, r=44 in viewBox 100). */
export const LOGO_MOON_R = 44
