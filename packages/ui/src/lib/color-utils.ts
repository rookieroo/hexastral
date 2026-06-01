import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper to parse hex to [h, s, l]
// This is a minimal implementation to avoid heavy dependencies like 'colord'
// If you already have 'colord' or 'tinycolor2', prefer using those.
export function hexToHsl(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return null

  let r = Number.parseInt(result[1]!, 16)
  let g = Number.parseInt(result[2]!, 16)
  let b = Number.parseInt(result[3]!, 16)

  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)

  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  // Return as typical CSS HSL values (Degrees, Percentage, Percentage)
  return [
    Math.round(h * 360 * 10) / 10,
    Math.round(s * 100 * 10) / 10,
    Math.round(l * 100 * 10) / 10,
  ]
}

// Converts [h, s, l] array to shadcn css var string "H S% L%"
export function hslToVariable(hsl: [number, number, number]): string {
  return `${hsl[0]} ${hsl[1]}% ${hsl[2]}%`
}

// Determine if we should use black or white foreground based on background luminance
export function getContrastColor(hsl: [number, number, number]): string {
  const [h, s, l] = hsl
  return l > 65 ? '0 0% 0%' : '0 0% 100%'
}

/**
 * Adjusts the lightness of an HSL color
 * @param hsl The base color [h, s, l]
 * @param amount positive to lighten, negative to darken (percentage points)
 */
function adjustLightness(hsl: [number, number, number], amount: number): [number, number, number] {
  const [h, s, l] = hsl
  // Clamp between 0 and 100
  const newL = Math.max(0, Math.min(100, l + amount))
  return [h, s, newL]
}

/**
 * Adjusts saturation
 */
function adjustSaturation(hsl: [number, number, number], amount: number): [number, number, number] {
  const [h, s, l] = hsl
  const newS = Math.max(0, Math.min(100, s + amount))
  return [h, newS, l]
}

/**
 * Generates the partial overrides needed for our theme system
 * from a single brand color.
 *
 * Now smarter: Generates Secondary, Accent, and Chart colors derived from Primary.
 */
export function generateBrandOverrides(hexColor: string) {
  const hsl = hexToHsl(hexColor)
  if (!hsl) return {}

  const primaryVar = hslToVariable(hsl)
  const foregroundVar = getContrastColor(hsl)

  // Derive Secondary (Used for secondary buttons, cards etc)
  // Logic: Keep Hue, heavily reduce Saturation, heavily increase Lightness (for light mode)
  // e.g. If primary is Bright Blue, Secondary is Pale Blue Gray
  const secondaryHsl = adjustLightness(adjustSaturation(hsl, -20), 45) // much lighter
  // Ensure it's not pure white if primary was already light
  if (secondaryHsl[2] > 95) secondaryHsl[2] = 90
  const secondaryVar = hslToVariable(secondaryHsl)
  const secondaryFgVar = '240 5.9% 10%' // Standard dark text usually works on pale secondary

  // Derive Accent (Used for hover states, list items)
  // Logic: Similar to secondary but maybe slightly more saturated or different lightness
  const accentHsl = adjustLightness(hsl, 40)
  if (accentHsl[2] > 96) accentHsl[2] = 94 // Cap lightness
  const accentVar = hslToVariable(accentHsl)
  const accentFgVar = '240 5.9% 10%'

  // Derive Chart Colors (Simple monochromatic scale or hue rotation)
  // For simplicity, we'll do hue rotation to find complementary/analogous colors
  const chart1 = primaryVar
  const chart2 = hslToVariable([(hsl[0] + 30) % 360, hsl[1], hsl[2]])
  const chart3 = hslToVariable([(hsl[0] + 60) % 360, hsl[1], hsl[2]])
  const chart4 = hslToVariable([(hsl[0] - 30 + 360) % 360, hsl[1], hsl[2]])
  const chart5 = hslToVariable([(hsl[0] - 60 + 360) % 360, hsl[1], hsl[2]])

  return {
    light: {
      primary: primaryVar,
      'primary-foreground': foregroundVar,
      ring: primaryVar,

      // Auto-generated semantic colors
      secondary: secondaryVar,
      'secondary-foreground': secondaryFgVar,
      accent: accentVar,
      'accent-foreground': accentFgVar,

      // Auto-generated chart colors
      'chart-1': chart1,
      'chart-2': chart2,
      'chart-3': chart3,
      'chart-4': chart4,
      'chart-5': chart5,
    },
    // Dark mode logic needs to be inverted for lightness
    dark: {
      primary: primaryVar,
      'primary-foreground': foregroundVar,
      ring: primaryVar,

      // In dark mode, derived colors should be darker/desaturated versions
      // This is a naive implementation, ideally dark mode uses specific logic
      secondary: '240 3.7% 15.9%', // Fallback to standard dark secondary for safety
      'secondary-foreground': '0 0% 98%',
      accent: '240 3.7% 15.9%',
      'accent-foreground': '0 0% 98%',

      'chart-1': chart1, // Charts often keep same vibrancy or need slight adaptation
      'chart-2': chart2,
      'chart-3': chart3,
      'chart-4': chart4,
      'chart-5': chart5,
    },
  }
}
