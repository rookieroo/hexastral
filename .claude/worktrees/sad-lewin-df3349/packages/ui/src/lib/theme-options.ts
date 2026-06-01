import type { DesignThemeId } from '../components/design-theme-provider'
import { TAILWIND_COLORS, CHROMATIC_COLORS, type ColorFamily } from './tailwind-palette'

/**
 * Theme Preset - Complete style configuration for a theme
 *
 * When user selects a theme, these values auto-populate the styleOverride fields.
 * Users can then customize individual values if needed.
 *
 * All colors are sourced from the official Tailwind CSS v4 palette
 * @see tailwind-palette.ts
 */
export interface ThemePreset {
  id: DesignThemeId
  label: string
  description: string
  /** Tailwind color family ID (e.g. 'blue', 'rose') — undefined for custom/core themes */
  colorFamily?: string
  /** Preview color hex (shown in theme picker grid) */
  previewColor: string
  /** StyleOverride values (auto-fill when theme is selected) */
  preset: {
    primaryColor: string
    secondaryColor: string
    accentColor: string
    destructiveColor: string
    backgroundTheme: 'white' | 'soft' | 'dark'
    fontFamily: string
    fontHeading: string
    borderRadius: string
  }
}

/**
 * Tailwind color swatches for quick-pick in the color field popover
 *
 * Shows shade 500 of each chromatic color family, plus key neutral shades.
 * Used by ColorField component to offer one-click color selection.
 */
export const COLOR_SWATCHES: Array<{ hex: string; label: string; family: string }> =
  CHROMATIC_COLORS.map((c) => ({
    hex: c.shades[500]?.hex ?? '#000000',
    label: c.label,
    family: c.id,
  }))

/**
 * Extended color swatches including light (300) and dark (700) variants
 * for the advanced color picker
 */
export const COLOR_SWATCHES_EXTENDED: Array<{
  hex: string
  label: string
  family: string
  shade: number
}> = CHROMATIC_COLORS.flatMap((c) =>
  [300, 400, 500, 600, 700].map((shade) => ({
    hex: c.shades[shade]?.hex ?? '#000000',
    label: `${c.label} ${shade}`,
    family: c.id,
    shade,
  }))
)

// ── Complementary color mapping ────────────────────────────────────────────
// For each primary color family, pick a harmonious accent & secondary
// Based on color wheel relationships (complement, split-complement, analogous)
const COMPLEMENT_MAP: Record<
  string,
  { accent: string; accentShade: number; secondary: string; secondaryShade: number }
> = {
  red: { accent: 'cyan', accentShade: 500, secondary: 'slate', secondaryShade: 500 },
  orange: { accent: 'blue', accentShade: 500, secondary: 'slate', secondaryShade: 500 },
  amber: { accent: 'indigo', accentShade: 500, secondary: 'stone', secondaryShade: 500 },
  yellow: { accent: 'violet', accentShade: 500, secondary: 'stone', secondaryShade: 500 },
  lime: { accent: 'purple', accentShade: 500, secondary: 'gray', secondaryShade: 500 },
  green: { accent: 'rose', accentShade: 500, secondary: 'slate', secondaryShade: 500 },
  emerald: { accent: 'pink', accentShade: 500, secondary: 'slate', secondaryShade: 500 },
  teal: { accent: 'orange', accentShade: 500, secondary: 'slate', secondaryShade: 500 },
  cyan: { accent: 'red', accentShade: 500, secondary: 'gray', secondaryShade: 500 },
  sky: { accent: 'amber', accentShade: 500, secondary: 'slate', secondaryShade: 500 },
  blue: { accent: 'amber', accentShade: 500, secondary: 'slate', secondaryShade: 500 },
  indigo: { accent: 'amber', accentShade: 400, secondary: 'slate', secondaryShade: 500 },
  violet: { accent: 'yellow', accentShade: 400, secondary: 'gray', secondaryShade: 500 },
  purple: { accent: 'lime', accentShade: 400, secondary: 'gray', secondaryShade: 500 },
  fuchsia: { accent: 'emerald', accentShade: 500, secondary: 'slate', secondaryShade: 500 },
  pink: { accent: 'teal', accentShade: 500, secondary: 'slate', secondaryShade: 500 },
  rose: { accent: 'emerald', accentShade: 500, secondary: 'slate', secondaryShade: 500 },
}

/** Helper: get hex from palette by family + shade */
function tw(family: string, shade: number): string {
  const c = TAILWIND_COLORS.find((f) => f.id === family)
  return c?.shades[shade]?.hex ?? '#000000'
}

/**
 * Generate a theme preset from a Tailwind color family
 *
 * @param family - ColorFamily from tailwind-palette.ts
 * @param overrides - Optional preset value overrides
 */
function createColorTheme(
  family: ColorFamily,
  overrides?: Partial<ThemePreset & { preset: Partial<ThemePreset['preset']> }>
): ThemePreset {
  const comp = COMPLEMENT_MAP[family.id]
  const accent = comp ? tw(comp.accent, comp.accentShade) : (family.shades[400]?.hex ?? '#000000')
  const secondary = comp ? tw(comp.secondary, comp.secondaryShade) : tw('slate', 500)

  return {
    id: family.id as DesignThemeId,
    label: overrides?.label ?? family.label,
    description: overrides?.description ?? `${family.label} color theme`,
    colorFamily: family.id,
    previewColor: family.shades[500]?.hex ?? '#000000',
    preset: {
      primaryColor: family.shades[500]?.hex ?? '#000000',
      secondaryColor: secondary,
      accentColor: accent,
      destructiveColor: tw('red', 500), // #ef4444 — universal
      backgroundTheme: 'white',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontHeading: 'Inter, system-ui, sans-serif',
      borderRadius: '0.625rem',
      ...overrides?.preset,
    },
  }
}

/**
 * Theme Presets — Tailwind CSS Color Palette Based
 *
 * 3 categories:
 * 1. Core Styles: default, minimal, bold (hand-tuned)
 * 2. Color Themes: One per chromatic Tailwind family (red → rose, 17 total)
 * 3. Neutral Themes: slate, gray, zinc, neutral, stone (5 total)
 *
 * Total: 25 presets = 3 core + 17 chromatic + 5 neutral
 *
 * All hex values are exact Tailwind CSS v4 defaults.
 * @see https://tailwindcss.com/docs/colors
 */
export const THEME_PRESETS: ThemePreset[] = [
  // ============================================================================
  // CORE STYLES (hand-tuned, not tied to a single TW family)
  // ============================================================================
  {
    id: 'default',
    label: 'Default',
    description: 'Neutral and versatile (New York style)',
    previewColor: '#18181b', // zinc-900
    preset: {
      primaryColor: '#18181b', // zinc-900
      secondaryColor: '#f4f4f5', // zinc-100
      accentColor: '#f4f4f5', // zinc-100
      destructiveColor: '#ef4444', // red-500
      backgroundTheme: 'white',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontHeading: 'Inter, system-ui, sans-serif',
      borderRadius: '0.625rem',
    },
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Clean, whitespace-focused design',
    previewColor: '#171717', // neutral-900
    preset: {
      primaryColor: '#171717', // neutral-900
      secondaryColor: '#737373', // neutral-500
      accentColor: '#171717', // neutral-900
      destructiveColor: '#dc2626', // red-600
      backgroundTheme: 'white',
      fontFamily: "'Inter Tight', system-ui, sans-serif",
      fontHeading: "'Inter Tight', system-ui, sans-serif",
      borderRadius: '0px',
    },
  },
  {
    id: 'bold',
    label: 'Bold',
    description: 'High contrast, impactful statements',
    previewColor: '#ef4444', // red-500
    preset: {
      primaryColor: '#ef4444', // red-500
      secondaryColor: '#1f2937', // gray-800
      accentColor: '#fbbf24', // amber-400
      destructiveColor: '#b91c1c', // red-700
      backgroundTheme: 'white',
      fontFamily: "'Space Grotesk', system-ui, sans-serif",
      fontHeading: "'Space Grotesk', system-ui, sans-serif",
      borderRadius: '0.75rem',
    },
  },

  // ============================================================================
  // CHROMATIC COLOR THEMES (one per Tailwind color family)
  // Each uses shade-500 as primary, with color-wheel-based accent/secondary
  // ============================================================================

  // ── Warm ─────────────────────────────────────────────────────────────────
  createColorTheme(CHROMATIC_COLORS.find((c) => c.id === 'red')!, {
    label: 'Red',
    description: 'Passionate, energetic — sales, urgency, food',
    preset: {
      fontFamily: "'Space Grotesk', system-ui, sans-serif",
      fontHeading: "'Space Grotesk', system-ui, sans-serif",
    },
  }),
  createColorTheme(CHROMATIC_COLORS.find((c) => c.id === 'orange')!, {
    label: 'Orange',
    description: 'Warm, athletic — sports, fitness, creativity',
    preset: {
      fontFamily: "'Outfit', system-ui, sans-serif",
      fontHeading: "'Bebas Neue', system-ui, sans-serif",
    },
  }),
  createColorTheme(CHROMATIC_COLORS.find((c) => c.id === 'amber')!, {
    label: 'Amber',
    description: 'Earthy warmth — food, craft, heritage',
    preset: {
      fontFamily: "'Lora', Georgia, serif",
      fontHeading: "'Playfair Display', Georgia, serif",
      backgroundTheme: 'soft',
      borderRadius: '0.5rem',
    },
  }),
  createColorTheme(CHROMATIC_COLORS.find((c) => c.id === 'yellow')!, {
    label: 'Yellow',
    description: 'Bright optimism — kids, creative, playful',
    preset: {
      fontFamily: "'Nunito', system-ui, sans-serif",
      fontHeading: "'Righteous', system-ui, sans-serif",
      borderRadius: '9999px',
    },
  }),

  // ── Green ────────────────────────────────────────────────────────────────
  createColorTheme(CHROMATIC_COLORS.find((c) => c.id === 'lime')!, {
    label: 'Lime',
    description: 'Fresh energy — natural, eco, organic',
    preset: {
      fontFamily: "'Nunito', system-ui, sans-serif",
      fontHeading: "'Nunito', system-ui, sans-serif",
      backgroundTheme: 'soft',
      borderRadius: '1rem',
    },
  }),
  createColorTheme(CHROMATIC_COLORS.find((c) => c.id === 'green')!, {
    label: 'Green',
    description: 'Growth, nature — organic, wellness, finance',
    preset: {
      fontFamily: "'Nunito', system-ui, sans-serif",
      fontHeading: "'Nunito', system-ui, sans-serif",
      backgroundTheme: 'soft',
      borderRadius: '1rem',
    },
  }),
  createColorTheme(CHROMATIC_COLORS.find((c) => c.id === 'emerald')!, {
    label: 'Emerald',
    description: 'Sophisticated green — luxury, wellness, spa',
    preset: {
      fontFamily: "'Nunito', system-ui, sans-serif",
      fontHeading: "'Cormorant', Georgia, serif",
      backgroundTheme: 'soft',
      borderRadius: '1rem',
    },
  }),
  createColorTheme(CHROMATIC_COLORS.find((c) => c.id === 'teal')!, {
    label: 'Teal',
    description: 'Calm clarity — health, spa, meditation',
    preset: {
      fontFamily: "'Nunito', system-ui, sans-serif",
      fontHeading: "'Cormorant', Georgia, serif",
      backgroundTheme: 'soft',
      borderRadius: '1rem',
    },
  }),

  // ── Cool ─────────────────────────────────────────────────────────────────
  createColorTheme(CHROMATIC_COLORS.find((c) => c.id === 'cyan')!, {
    label: 'Cyan',
    description: 'Refreshing — water, tech, communication',
    preset: {
      fontFamily: "'DM Sans', system-ui, sans-serif",
      fontHeading: "'DM Sans', system-ui, sans-serif",
      borderRadius: '0.75rem',
    },
  }),
  createColorTheme(CHROMATIC_COLORS.find((c) => c.id === 'sky')!, {
    label: 'Sky',
    description: 'Friendly trust — SaaS, social, travel',
    preset: {
      fontFamily: "'DM Sans', system-ui, sans-serif",
      fontHeading: "'DM Sans', system-ui, sans-serif",
      borderRadius: '0.75rem',
    },
  }),
  createColorTheme(CHROMATIC_COLORS.find((c) => c.id === 'blue')!, {
    label: 'Blue',
    description: 'Trust, corporate — B2B, finance, professional',
    preset: {
      fontFamily: "'Inter', system-ui, sans-serif",
      fontHeading: "'Inter', system-ui, sans-serif",
      borderRadius: '0.5rem',
    },
  }),
  createColorTheme(CHROMATIC_COLORS.find((c) => c.id === 'indigo')!, {
    label: 'Indigo',
    description: 'Deep tech — SaaS, AI, developer tools',
    preset: {
      fontFamily: "'DM Sans', system-ui, sans-serif",
      fontHeading: "'DM Sans', system-ui, sans-serif",
      backgroundTheme: 'soft',
      borderRadius: '0.75rem',
    },
  }),

  // ── Purple ───────────────────────────────────────────────────────────────
  createColorTheme(CHROMATIC_COLORS.find((c) => c.id === 'violet')!, {
    label: 'Violet',
    description: 'Creative luxury — art, design, premium',
    preset: {
      fontFamily: "'Nunito', system-ui, sans-serif",
      fontHeading: "'Righteous', system-ui, sans-serif",
      borderRadius: '0.75rem',
    },
  }),
  createColorTheme(CHROMATIC_COLORS.find((c) => c.id === 'purple')!, {
    label: 'Purple',
    description: 'Royal, imaginative — beauty, creative, gaming',
    preset: {
      fontFamily: "'DM Sans', system-ui, sans-serif",
      fontHeading: "'DM Sans', system-ui, sans-serif",
      borderRadius: '0.75rem',
    },
  }),
  createColorTheme(CHROMATIC_COLORS.find((c) => c.id === 'fuchsia')!, {
    label: 'Fuchsia',
    description: 'Bold, expressive — fashion, entertainment, art',
    preset: {
      fontFamily: "'Space Grotesk', system-ui, sans-serif",
      fontHeading: "'Anton', system-ui, sans-serif",
      borderRadius: '0px',
    },
  }),

  // ── Pink / Rose ──────────────────────────────────────────────────────────
  createColorTheme(CHROMATIC_COLORS.find((c) => c.id === 'pink')!, {
    label: 'Pink',
    description: 'Playful charm — beauty, lifestyle, kids',
    preset: {
      fontFamily: "'Cormorant', Georgia, serif",
      fontHeading: "'Playfair Display', Georgia, serif",
    },
  }),
  createColorTheme(CHROMATIC_COLORS.find((c) => c.id === 'rose')!, {
    label: 'Rose',
    description: 'Elegant warmth — beauty, wedding, luxury',
    preset: {
      fontFamily: "'Cormorant', Georgia, serif",
      fontHeading: "'Playfair Display', Georgia, serif",
    },
  }),

  // ============================================================================
  // NEUTRAL THEMES (dark-mode focused, typography-driven)
  // ============================================================================
  {
    id: 'slate',
    label: 'Slate',
    description: 'Cool neutral — modern editorial, dark mode',
    colorFamily: 'slate',
    previewColor: '#64748b', // slate-500
    preset: {
      primaryColor: '#0f172a', // slate-900
      secondaryColor: '#64748b', // slate-500
      accentColor: '#0ea5e9', // sky-500
      destructiveColor: '#ef4444', // red-500
      backgroundTheme: 'dark',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      fontHeading: "'DM Sans', system-ui, sans-serif",
      borderRadius: '0.5rem',
    },
  },
  {
    id: 'gray',
    label: 'Gray',
    description: 'Classic neutral — professional, corporate',
    colorFamily: 'gray',
    previewColor: '#6b7280', // gray-500
    preset: {
      primaryColor: '#111827', // gray-900
      secondaryColor: '#6b7280', // gray-500
      accentColor: '#3b82f6', // blue-500
      destructiveColor: '#ef4444', // red-500
      backgroundTheme: 'white',
      fontFamily: "'Inter', system-ui, sans-serif",
      fontHeading: "'Inter', system-ui, sans-serif",
      borderRadius: '0.3rem',
    },
  },
  {
    id: 'zinc',
    label: 'Zinc',
    description: 'Sharp neutral — tech, developer, minimal',
    colorFamily: 'zinc',
    previewColor: '#71717a', // zinc-500
    preset: {
      primaryColor: '#18181b', // zinc-900
      secondaryColor: '#71717a', // zinc-500
      accentColor: '#6366f1', // indigo-500
      destructiveColor: '#ef4444', // red-500
      backgroundTheme: 'white',
      fontFamily: "'Inter', system-ui, sans-serif",
      fontHeading: "'Inter', system-ui, sans-serif",
      borderRadius: '0.625rem',
    },
  },
  {
    id: 'neutral',
    label: 'Neutral',
    description: 'Pure gray — universal, no color tint',
    colorFamily: 'neutral',
    previewColor: '#737373', // neutral-500
    preset: {
      primaryColor: '#171717', // neutral-900
      secondaryColor: '#737373', // neutral-500
      accentColor: '#171717', // neutral-900
      destructiveColor: '#ef4444', // red-500
      backgroundTheme: 'white',
      fontFamily: "'Inter Tight', system-ui, sans-serif",
      fontHeading: "'Inter Tight', system-ui, sans-serif",
      borderRadius: '0px',
    },
  },
  {
    id: 'stone',
    label: 'Stone',
    description: 'Warm neutral — vintage, craft, heritage',
    colorFamily: 'stone',
    previewColor: '#78716c', // stone-500
    preset: {
      primaryColor: '#1c1917', // stone-900
      secondaryColor: '#78716c', // stone-500
      accentColor: '#b45309', // amber-700
      destructiveColor: '#991b1b', // red-800
      backgroundTheme: 'soft',
      fontFamily: "'Libre Baskerville', Georgia, serif",
      fontHeading: "'Playfair Display', Georgia, serif",
      borderRadius: '0.3rem',
    },
  },
]

/**
 * Legacy THEME_OPTIONS for backward compatibility
 * @deprecated Use THEME_PRESETS instead
 */
export const THEME_OPTIONS = THEME_PRESETS.map(({ id, label, previewColor }) => ({
  id,
  label,
  color: previewColor,
}))

/**
 * Get theme preset by ID
 */
export function getThemePreset(id: DesignThemeId): ThemePreset | undefined {
  return THEME_PRESETS.find((t) => t.id === id)
}

/**
 * Get styleOverride values for a theme
 * Used to auto-populate fields when theme is selected
 */
export function getThemeStyleOverride(id: DesignThemeId) {
  return getThemePreset(id)?.preset
}

/**
 * Get the full Tailwind shade palette for a theme's color family
 *
 * @param themeId - The theme preset ID
 * @returns Array of { shade, hex } for the theme's color family, or undefined
 */
export function getThemeColorScale(
  themeId: DesignThemeId
): Array<{ shade: number; hex: string }> | undefined {
  const preset = getThemePreset(themeId)
  if (!preset?.colorFamily) return undefined

  const family = TAILWIND_COLORS.find((c) => c.id === preset.colorFamily)
  if (!family) return undefined

  return Object.entries(family.shades).map(([shade, val]) => ({
    shade: Number(shade),
    hex: val.hex,
  }))
}
