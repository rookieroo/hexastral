import { createContext, useContext, type ReactNode } from 'react'

/**
 * Design Theme IDs — Tailwind CSS Color Palette Based
 *
 * 3 categories:
 * 1. Core Styles: default, minimal, bold
 * 2. Chromatic Themes: One per Tailwind color family (red → rose)
 * 3. Neutral Themes: slate, gray, zinc, neutral, stone
 *
 * @see packages/ui/src/lib/theme-options.ts — THEME_PRESETS
 * @see packages/ui/src/lib/tailwind-palette.ts — Color values
 */
export type DesignThemeId =
  // Core Styles
  | 'default' // Neutral, versatile (zinc-900)
  | 'minimal' // Clean, whitespace-focused (neutral-900)
  | 'bold' // High contrast, impactful (red-500)
  // Chromatic — Warm
  | 'red' // Passionate, energetic
  | 'orange' // Warm, athletic
  | 'amber' // Earthy warmth
  | 'yellow' // Bright optimism
  // Chromatic — Green
  | 'lime' // Fresh energy
  | 'green' // Growth, nature
  | 'emerald' // Sophisticated green
  | 'teal' // Calm clarity
  // Chromatic — Cool
  | 'cyan' // Refreshing
  | 'sky' // Friendly trust
  | 'blue' // Trust, corporate
  | 'indigo' // Deep tech
  // Chromatic — Purple
  | 'violet' // Creative luxury
  | 'purple' // Royal, imaginative
  | 'fuchsia' // Bold, expressive
  // Chromatic — Pink/Rose
  | 'pink' // Playful charm
  | 'rose' // Elegant warmth
  // Neutrals
  | 'slate' // Cool neutral (dark mode)
  | 'gray' // Classic neutral
  | 'zinc' // Sharp neutral
  | 'neutral' // Pure gray
  | 'stone' // Warm neutral

export interface DesignTheme {
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  buttonRadius?: string
  fontFamily?: string
}

const ThemeContext = createContext<DesignTheme>({})

export function DesignThemeProvider({
  children,
  theme,
}: {
  children: ReactNode
  theme: DesignTheme
}) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}

export function useThemeWithFallback(overrideTheme?: DesignTheme): DesignTheme {
  const contextTheme = useTheme()
  return { ...contextTheme, ...overrideTheme }
}
