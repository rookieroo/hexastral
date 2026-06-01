/**
 * WCAG Contrast Utilities
 *
 * Provides WCAG 2.1 contrast ratio calculation, accessibility grading,
 * and automatic foreground color selection for any background.
 *
 * Used by:
 * - styleOverrideToCSSVars (config.tsx) → auto-calculate foreground colors
 * - GlobalThemeControls ColorField → real-time contrast warnings
 * - create-block dark mode wrapper → ensure readable text
 *
 * @see https://www.w3.org/TR/WCAG21/#contrast-minimum
 */

/**
 * Parse hex color to RGB tuple.
 * Supports #RGB, #RRGGBB, with or without leading #.
 */
export function hexToRgb(hex: string): [number, number, number] | null {
  const cleaned = hex.replace(/^#/, '')

  if (cleaned.length === 3) {
    const r = Number.parseInt(cleaned[0]! + cleaned[0]!, 16)
    const g = Number.parseInt(cleaned[1]! + cleaned[1]!, 16)
    const b = Number.parseInt(cleaned[2]! + cleaned[2]!, 16)
    return [r, g, b]
  }

  if (cleaned.length === 6) {
    const r = Number.parseInt(cleaned.slice(0, 2), 16)
    const g = Number.parseInt(cleaned.slice(2, 4), 16)
    const b = Number.parseInt(cleaned.slice(4, 6), 16)
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null
    return [r, g, b]
  }

  return null
}

/**
 * Calculate relative luminance per WCAG 2.1
 * @see https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0.5

  const [r, g, b] = rgb
  const toLinear = (value: number): number => {
    const s = value / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

/**
 * Calculate WCAG 2.1 contrast ratio between two colors.
 * Returns a value between 1 (identical) and 21 (black vs white).
 *
 * @see https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
export function getContrastRatio(color1: string, color2: string): number {
  const l1 = getRelativeLuminance(color1)
  const l2 = getRelativeLuminance(color2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * WCAG accessibility levels
 *
 * - AAA: ≥ 7:1 (enhanced, ideal)
 * - AA:  ≥ 4.5:1 (normal text minimum)
 * - AA-large: ≥ 3:1 (large text / UI components)
 * - Fail: < 3:1 (not accessible)
 */
export type ContrastLevel = 'AAA' | 'AA' | 'AA-large' | 'Fail'

export function getContrastLevel(ratio: number): ContrastLevel {
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3) return 'AA-large'
  return 'Fail'
}

/**
 * Core foreground color candidates.
 * Ordered from lightest to darkest for consistent selection.
 */
const FOREGROUND_CANDIDATES = [
  '#ffffff', // Pure white
  '#f8fafc', // slate-50
  '#f1f5f9', // slate-100
  '#e2e8f0', // slate-200
  '#0f172a', // slate-900 (near-black)
  '#1e293b', // slate-800
  '#334155', // slate-700
  '#000000', // Pure black
] as const

/**
 * Choose the best foreground color for a given background.
 *
 * Unlike the binary `luminance > 0.5 ? dark : light` approach,
 * this tests multiple candidates and picks the one with the
 * highest WCAG contrast ratio, guaranteeing at least AA compliance.
 *
 * @param bgHex - Background color in hex
 * @param preferLight - Hint: prefer light foreground when ratios are close
 * @returns Best foreground hex color
 */
export function getBestForeground(bgHex: string, preferLight = false): string {
  const bgLum = getRelativeLuminance(bgHex)

  // Fast path: very dark bg → white, very light bg → near-black
  if (bgLum < 0.03) return '#ffffff'
  if (bgLum > 0.85) return '#0f172a'

  let bestColor = bgLum > 0.5 ? '#0f172a' : '#ffffff'
  let bestRatio = getContrastRatio(bgHex, bestColor)

  for (const candidate of FOREGROUND_CANDIDATES) {
    const ratio = getContrastRatio(bgHex, candidate)
    if (ratio > bestRatio) {
      bestRatio = ratio
      bestColor = candidate
    } else if (ratio === bestRatio && preferLight) {
      // When equal, prefer light text on dark backgrounds
      const candidateLum = getRelativeLuminance(candidate)
      const currentLum = getRelativeLuminance(bestColor)
      if (candidateLum > currentLum) {
        bestColor = candidate
      }
    }
  }

  return bestColor
}

/**
 * Check a pair of colors and return diagnostic info.
 * Used by ColorField to show real-time contrast warnings.
 */
export function checkContrast(
  fg: string,
  bg: string
): {
  ratio: number
  level: ContrastLevel
  passes: boolean
  suggestion: string | null
} {
  const ratio = getContrastRatio(fg, bg)
  const level = getContrastLevel(ratio)
  const passes = ratio >= 4.5

  let suggestion: string | null = null
  if (!passes) {
    const bestFg = getBestForeground(bg)
    const bestRatio = getContrastRatio(bestFg, bg)
    if (bestRatio >= 4.5) {
      suggestion = `Use ${bestFg} for ${bestRatio.toFixed(1)}:1 contrast`
    } else {
      suggestion = 'This background color has low contrast with any text color'
    }
  }

  return { ratio, level, passes, suggestion }
}

/**
 * Check multiple foreground/background pairs at once.
 * Returns the worst-case pair for quick triage.
 *
 * @param pairs - Array of { name, fg, bg } to check
 * @returns Array of results sorted by ratio (worst first)
 */
export function auditContrastPairs(
  pairs: Array<{ name: string; fg: string; bg: string }>
): Array<{ name: string; fg: string; bg: string; ratio: number; level: ContrastLevel }> {
  return pairs
    .map(({ name, fg, bg }) => {
      const ratio = getContrastRatio(fg, bg)
      return { name, fg, bg, ratio, level: getContrastLevel(ratio) }
    })
    .sort((a, b) => a.ratio - b.ratio)
}
