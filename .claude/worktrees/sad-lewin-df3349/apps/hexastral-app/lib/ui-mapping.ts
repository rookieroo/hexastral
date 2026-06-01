/**
 * UI mapping utilities for archetype display.
 *
 * Maps archetype categories and hook dimensions to display-friendly
 * labels and color tokens. Always derive colors from the ios palette —
 * never pass raw hex literals into JSX.
 */

export type ArchetypeCategory = 'harmony' | 'tension' | 'growth' | 'karmic' | 'volatile'
export type HookDimension = 'long_term' | 'communication' | 'attraction' | 'emotional'

/** Accent colors (dark-mode-safe hex literals — resolved at call site via isDark) */
export const ARCHETYPE_CATEGORY_COLORS: Record<ArchetypeCategory, { dark: string; light: string }> =
  {
    harmony: { dark: '#86EFAC', light: '#166534' }, // green
    growth: { dark: '#93C5FD', light: '#1D4ED8' }, // blue
    tension: { dark: '#FCA5A5', light: '#991B1B' }, // red
    karmic: { dark: '#C4A882', light: '#3C2415' }, // ink gold (accent)
    volatile: { dark: '#FCD34D', light: '#92400E' }, // amber
  }

export function archetypeCategoryColor(category: ArchetypeCategory, isDark: boolean): string {
  return isDark
    ? ARCHETYPE_CATEGORY_COLORS[category].dark
    : ARCHETYPE_CATEGORY_COLORS[category].light
}

/** i18n key lookup for archetype category badge label */
export const ARCHETYPE_CATEGORY_I18N_KEY: Record<ArchetypeCategory, string> = {
  harmony: 'archetype_cat_harmony',
  tension: 'archetype_cat_tension',
  growth: 'archetype_cat_growth',
  karmic: 'archetype_cat_karmic',
  volatile: 'archetype_cat_volatile',
}

/** i18n key lookup for hook dimension label */
export const HOOK_DIMENSION_I18N_KEY: Record<HookDimension, string> = {
  long_term: 'shop_dim_long_term',
  communication: 'shop_dim_communication',
  attraction: 'shop_dim_attraction',
  emotional: 'shop_dim_emotional',
}
