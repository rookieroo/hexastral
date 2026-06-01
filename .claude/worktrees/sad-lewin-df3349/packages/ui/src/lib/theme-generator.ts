import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import { type BaseColorName, baseColors, type BaseColorPalette } from './base-colors'

export type ThemeConfig = {
  base?: BaseColorName
  overrides?: {
    light?: Partial<BaseColorPalette>
    dark?: Partial<BaseColorPalette>
  }
  common?: {
    radius?: string
  }
  fonts?: {
    sans?: string
    heading?: string
  }
}

/**
 * Generates CSS variables string for a theme
 * Supports Light and Dark modes based on the selected base theme.
 */
export function generateThemeCss({
  base = 'zinc',
  overrides = {},
  common = { radius: '0.625rem' },
  fonts = {
    sans: 'ui-sans-serif, system-ui, sans-serif',
    heading: 'ui-sans-serif, system-ui, sans-serif',
  },
}: ThemeConfig): string {
  const basePalette = baseColors[base] ?? baseColors.zinc!

  // Merge Light Mode
  const lightColors = {
    ...basePalette.light,
    ...overrides.light,
  }

  // Merge Dark Mode
  const darkColors = {
    ...basePalette.dark,
    ...overrides.dark,
  }

  // Helper to generate CSS vars block
  const generateVarsBuffer = (colors: BaseColorPalette) => {
    return Object.entries(colors)
      .map(([key, value]) => {
        // Convert camelCase to kebab-case
        const cssVarName = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
        return `--${cssVarName}: ${value};`
      })
      .join('\n      ')
  }

  return `
    :root {
      ${generateVarsBuffer(lightColors)}
      --radius: ${common.radius};
      --font-sans: ${fonts.sans};
      --font-heading: ${fonts.heading};
    }

    .dark {
      ${generateVarsBuffer(darkColors)}
    }
  `
}
