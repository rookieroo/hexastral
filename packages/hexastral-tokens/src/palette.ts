/**
 * HexAstral 金石玄学 design palette — pure tokens, zero React dependency.
 *
 * Three material families:
 *   1. 宣纸与焦墨 (Rice Paper & Heavy Ink) — backgrounds & text
 *   2. 汉魏碑拓 (Stone Rubbings) — cards with weathered texture
 *   3. 方寸篆刻 (Cinnabar Seals) — constrained red accent
 *
 * Extends the existing Zinc-based Ink Brutalism system with
 * additional semantic layers for reports and social cards.
 */

// ── Base Zinc palette (shared source of truth) ───────────────────────────────

export const zinc = {
  50: '#FAFAFA',
  100: '#F4F4F5',
  200: '#E4E4E7',
  300: '#D4D4D8',
  400: '#A1A1AA',
  500: '#71717A',
  600: '#52525B',
  700: '#3F3F46',
  800: '#27272A',
  900: '#18181B',
  950: '#09090B',
} as const

// ── Material colors ──────────────────────────────────────────────────────────

/** 碑拓 — stone rubbing: deep void black for report card backgrounds */
export const rubbing = {
  void: '#0B0B0C',
  stone: '#141416',
  weathered: '#1C1C1F',
  grain: 'rgba(255,255,255,0.03)',
} as const

/** 宣纸 — rice paper: warm off-whites for light mode surfaces */
export const ricePaper = {
  ivory: '#F5F0E8',
  warm: '#EDE6D8',
  aged: '#DDD5C4',
  wash: 'rgba(60,36,21,0.03)',
} as const

/** 朱砂 — cinnabar: used extremely sparingly as seal/accent */
export const cinnabar = {
  seal: '#9B2226',
  bright: '#C0392B',
  muted: 'rgba(155,34,38,0.65)',
  ghost: 'rgba(155,34,38,0.12)',
} as const

/** 墨色 — ink tones: brand accent across modes */
export const ink = {
  gold: '#C4A882',
  goldDim: 'rgba(196,168,130,0.4)',
  goldMuted: 'rgba(196,168,130,0.12)',
  goldGhost: 'rgba(196,168,130,0.04)',
  brown: '#3C2415',
  brownDim: 'rgba(60,36,21,0.4)',
  brownMuted: 'rgba(60,36,21,0.12)',
  brownGhost: 'rgba(60,36,21,0.03)',
} as const

// ── Semantic mode tokens ─────────────────────────────────────────────────────

export interface ModeTokens {
  bg: string
  card: string
  cardElevated: string
  separator: string
  text: string
  secondary: string
  tint: string
  tintFg: string
  accent: string
  dim: string
  inkWash: string
}

export const lightTokens: ModeTokens = {
  bg: zinc[50],
  card: '#FFFFFF',
  cardElevated: zinc[100],
  separator: zinc[200],
  text: zinc[950],
  secondary: zinc[500],
  tint: zinc[900],
  tintFg: '#FFFFFF',
  accent: ink.brown,
  dim: zinc[400],
  inkWash: ink.brownGhost,
}

export const darkTokens: ModeTokens = {
  bg: zinc[950],
  card: zinc[900],
  cardElevated: zinc[800],
  separator: zinc[800],
  text: zinc[50],
  secondary: zinc[400],
  tint: zinc[50],
  tintFg: zinc[900],
  accent: ink.gold,
  // zinc[600] (#52525B) on the near-black 水墨 dark bg read at ~1.3:1 — lunar
  // subtext, the share icon, and CTA subtitles were effectively invisible.
  // zinc[500] keeps the muted intent while clearing the legibility floor.
  dim: zinc[500],
  inkWash: ink.goldGhost,
}

export function getTokens(isDark: boolean): ModeTokens {
  return isDark ? darkTokens : lightTokens
}

/** Modal scrim + full-screen loading overlay — derived from mode, not per-app rgba. */
export function getScrimColors(isDark: boolean): { scrim: string; scrimHeavy: string } {
  return isDark
    ? { scrim: 'rgba(0,0,0,0.5)', scrimHeavy: 'rgba(9,9,11,0.92)' }
    : { scrim: 'rgba(0,0,0,0.35)', scrimHeavy: 'rgba(250,250,250,0.92)' }
}

// ── Planet logo sphere colors ────────────────────────────────────────────────
//
// Theme-independent — the moon's illuminated face is always bright and its
// shadow face is always dark, regardless of light/dark UI mode.  Unlike UI
// chrome, a celestial body depicts physical reality, not interface state.

export interface SphereColors {
  void: string
  lit: string
  stroke: string
}

export function getSphereColors(): SphereColors {
  return { void: zinc[800], lit: zinc[50], stroke: 'rgba(128,128,128,0.25)' }
}

// ── Five Elements ────────────────────────────────────────────────────────────

export const wuxingColors = {
  metal: { accent: '#C4A882', bg: 'rgba(196,168,130,0.08)', label: '金' },
  wood: { accent: '#5B8C5A', bg: 'rgba(91,140,90,0.08)', label: '木' },
  water: { accent: '#4A6FA5', bg: 'rgba(74,111,165,0.08)', label: '水' },
  fire: { accent: '#C25450', bg: 'rgba(194,84,80,0.08)', label: '火' },
  earth: { accent: '#A0845C', bg: 'rgba(160,132,92,0.08)', label: '土' },
} as const

export type WuxingElement = keyof typeof wuxingColors

// ── 五行 graph variant + 干支 mapping (timeline / make-if data-viz) ────────────
//
// DESIGN RULE — state via treatment, data via hue:
//   · The brand **accent** (per-satellite; Auspice = 朱泥 terra) is RESERVED for
//     "now / self / selected" and is only ever drawn as a TREATMENT (glow + ring).
//   · DATA (干支/大运/流年/流月) is colored by its **五行 hue**, never the accent.
// So the 五行 hues must stay OUT of the gold zone — otherwise `金` (which is gold
// in `wuxingColors`) blurs into the gold accent-variant / dark-mode accent. This
// graph variant fixes that: 金 → cool pewter, the rest tuned to read on paper.
// Keep `wuxingColors` (金=gold) for 五行 chips / 科普; use `wuxingGraph` in graphs.

/** 五行 node/line colors for graphs — 金 is pewter (not gold), to free the accent. */
export const wuxingGraph: Record<WuxingElement, string> = {
  wood: '#5B8C5A',
  fire: '#C25450',
  earth: '#A0845C',
  metal: '#8E9AA1', // pewter — deliberately NOT gold, so the accent stays unique
  water: '#4A6FA5',
} as const

/** 天干 → 五行. */
export const STEM_ELEMENT: Record<string, WuxingElement> = {
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

/** 地支 → 五行 (本气). */
export const BRANCH_ELEMENT: Record<string, WuxingElement> = {
  子: 'water',
  丑: 'earth',
  寅: 'wood',
  卯: 'wood',
  辰: 'earth',
  巳: 'fire',
  午: 'fire',
  未: 'earth',
  申: 'metal',
  酉: 'metal',
  戌: 'earth',
  亥: 'water',
}

/** Graph color for a 干支 (or bare 天干) — by its 天干 五行; falls back to grey. */
export function ganZhiGraphColor(ganZhi: string): string {
  const el = STEM_ELEMENT[ganZhi[0] ?? '']
  return el ? wuxingGraph[el] : zinc[500]
}

/**
 * 吉 / 平 / 凶 verdict colors — brand-tuned 3-step. 平 is a neutral grey (NOT the
 * old gold-brown taupe, which collided with the accent). Shared by the make-if
 * 对照表, timeline fit dots, 宜忌 verdict chips, etc. — one source of truth.
 */
export const verdictColors = {
  吉: '#4E8A6B',
  平: '#8C8880',
  凶: '#C0452E',
} as const
export type Verdict = keyof typeof verdictColors

// ── Fortune ──────────────────────────────────────────────────────────────────

export const fortuneColors = {
  'great-fortune': { bg: '#D4AF3720', text: '#D4AF37', label: '大吉' },
  fortune: { bg: '#22C55E20', text: '#22C55E', label: '吉' },
  neutral: { bg: '#6B728020', text: '#6B7280', label: '中平' },
  caution: { bg: '#F59E0B20', text: '#F59E0B', label: '小凶' },
  misfortune: { bg: '#EF444420', text: '#EF4444', label: '凶' },
} as const

export type FortuneLevel = keyof typeof fortuneColors

// ── Star brightness ──────────────────────────────────────────────────────────

export const brightnessColors: Record<string, string> = {
  庙: '#D4AF37',
  旺: '#22C55E',
  得: '#3B82F6',
  利: '#8B5CF6',
  平: '#6B7280',
  不: '#F59E0B',
  陷: '#EF4444',
}

// ── Mutagen (四化) ───────────────────────────────────────────────────────────

export const mutagenColors: Record<string, { bg: string; text: string }> = {
  禄: { bg: '#D4AF3720', text: '#D4AF37' },
  权: { bg: '#EF444420', text: '#EF4444' },
  科: { bg: '#3B82F620', text: '#3B82F6' },
  忌: { bg: '#6B728020', text: '#6B7280' },
}

// ── Palace (宫位) ────────────────────────────────────────────────────────────

export const palaceColors: Record<string, string> = {
  命宫: '#9B59B6',
  兄弟: '#8B5CF6',
  夫妻: '#E91E63',
  子女: '#FF9800',
  财帛: '#D4AF37',
  疾厄: '#27AE60',
  迁移: '#3498DB',
  交友: '#00BCD4',
  官禄: '#2196F3',
  田宅: '#795548',
  福德: '#F39C12',
  父母: '#9C27B0',
}

// ── Design system constants ──────────────────────────────────────────────────

/** Ink Brutalism border radius — only two values: square or fully round. */
export const BORDER_RADIUS = {
  none: 0,
  full: 9999,
} as const

/** Standardised active/selected-state opacity applied to accent color. */
export const ACTIVE_OPACITY = 0.12

/** Semantic highlight backgrounds for contextual callouts (dark / light). */
export interface HighlightColors {
  brownBg: string
  greenBg: string
  warnBg: string
  warnBar: string
}

export function getHighlightColors(isDark: boolean): HighlightColors {
  return isDark
    ? { brownBg: '#1A0A00', greenBg: '#052E16', warnBg: '#3F1A00', warnBar: '#C2410C' }
    : { brownBg: '#FFF7ED', greenBg: '#F0FDF4', warnBg: '#FFF7ED', warnBar: '#EA580C' }
}

/** Semantic 宜/吉 (success) and 忌/凶 (danger) text colors, mode-adapted.
 *  The flat #22C55E / #EF4444 pair was tuned for light surfaces and washed out
 *  on the 水墨 dark bg; dark mode uses the brighter -400 tints so 宜忌 headers
 *  and verdict chips stay legible. */
export interface StatusColors {
  success: string
  danger: string
}

export function getStatusColors(isDark: boolean): StatusColors {
  return isDark
    ? { success: '#4ADE80', danger: '#F87171' }
    : { success: '#16A34A', danger: '#DC2626' }
}

/** Typography scale — Ink Brutalism type ramp. */
export const TYPOGRAPHY = {
  titleLg: { fontSize: 28, fontWeight: '600' as const, lineHeight: 34 },
  title: { fontSize: 22, fontWeight: '600' as const, lineHeight: 28 },
  titleSm: { fontSize: 18, fontWeight: '500' as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySm: { fontSize: 13, fontWeight: '300' as const, lineHeight: 18 },
  label: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 14,
    letterSpacing: 4,
    textTransform: 'uppercase' as const,
  },
  caption: { fontSize: 10, fontWeight: '400' as const, lineHeight: 14 },
} as const

/** Spacing scale (4-point grid). */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const
