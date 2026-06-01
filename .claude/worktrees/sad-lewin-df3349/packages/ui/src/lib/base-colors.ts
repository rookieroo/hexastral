import { themes } from './themes'

export type BaseColorPalette = {
  background: string
  foreground: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  destructive: string
  destructiveForeground: string
  border: string
  input: string
  ring: string
}

export type BaseColorName = (typeof themes)[number]['name']

// Helper to convert HSL channel strings "0 0% 100%" to "hsl(0 0% 100%)"
// If the value already starts with hsl/rgb/oklch, leave it alone.
function toCssValue(val: string | undefined): string {
  if (!val) return ''
  if (
    val.startsWith('hsl') ||
    val.startsWith('rgb') ||
    val.startsWith('oklch') ||
    val.startsWith('#')
  ) {
    return val
  }
  return `hsl(${val})`
}

function mapThemeVarsToPalette(vars: Record<string, string>): BaseColorPalette {
  return {
    background: toCssValue(vars.background),
    foreground: toCssValue(vars.foreground),
    card: toCssValue(vars.card),
    cardForeground: toCssValue(vars['card-foreground']),
    popover: toCssValue(vars.popover),
    popoverForeground: toCssValue(vars['popover-foreground']),
    primary: toCssValue(vars.primary),
    primaryForeground: toCssValue(vars['primary-foreground']),
    secondary: toCssValue(vars.secondary),
    secondaryForeground: toCssValue(vars['secondary-foreground']),
    muted: toCssValue(vars.muted),
    mutedForeground: toCssValue(vars['muted-foreground']),
    accent: toCssValue(vars.accent),
    accentForeground: toCssValue(vars['accent-foreground']),
    destructive: toCssValue(vars.destructive),
    destructiveForeground: toCssValue(vars['destructive-foreground']),
    border: toCssValue(vars.border),
    input: toCssValue(vars.input),
    ring: toCssValue(vars.ring),
  }
}

export const baseColors: Record<string, { light: BaseColorPalette; dark: BaseColorPalette }> =
  themes.reduce(
    (acc, theme) => {
      acc[theme.name] = {
        light: mapThemeVarsToPalette(theme.cssVars.light),
        dark: mapThemeVarsToPalette(theme.cssVars.dark),
      }
      return acc
    },
    {} as Record<string, { light: BaseColorPalette; dark: BaseColorPalette }>
  )
