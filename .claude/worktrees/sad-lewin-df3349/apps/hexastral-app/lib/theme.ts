/**
 * Hexastral 统一主题系统
 * 设计语言：东方水墨极简 · Ink Brutalism
 *
 * 差异化策略 (vs Co-Star 冷黑白):
 *   · 墨色強调 (ink accent) — 暖褐/藏青, 呼应书法/水墨传统
 *   · 混合字重 — 标题 500-600, 正文 300, 标签 200-300
 *   · 五行语义色 — 金木水火土
 *   · 选择性圆角 — 铜钱/头像圆形, 卡片方形
 *
 * 基于 Tailwind CSS Zinc 色阶的 Light / Dark 自适应系统。
 * 命理语义色 (fortune / brightness / mutagen / palace) 独立于品牌色保留。
 */

import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native'
import { Appearance, useColorScheme } from 'react-native'
import { storage } from './storage'

// Re-export design tokens from the canonical source of truth
export {
  ACTIVE_OPACITY,
  BORDER_RADIUS,
  SPACING,
  TYPOGRAPHY,
} from '@zhop/hexastral-tokens/palette'

/** User preference for color scheme — stored in MMKV. */
export type ThemePreference = 'system' | 'light' | 'dark'

const THEME_STORAGE_KEY = 'hexastral_theme_mode'

/** Read persisted theme preference (sync). */
export function getThemePreference(): ThemePreference {
  const v = storage.getString(THEME_STORAGE_KEY)
  if (v === 'light' || v === 'dark') return v
  return 'system'
}

/**
 * Set theme preference and apply immediately.
 * RN 0.81+ `Appearance.setColorScheme()` propagates to all `useColorScheme()` consumers.
 */
export function setThemePreference(mode: ThemePreference) {
  storage.set(THEME_STORAGE_KEY, mode)
  Appearance.setColorScheme(mode === 'system' ? null : mode)
}

export const theme = {
  light: {
    background: '#FAFAFA', // Zinc-50
    surface: '#F4F4F5', // Zinc-100
    surfaceSecondary: '#E4E4E7', // Zinc-200
    text: '#18181B', // Zinc-900
    textSecondary: '#71717A', // Zinc-500
    primary: '#18181B', // Zinc-900 — 主色=黑
    accent: '#3C2415', // 墨色 Ink Brown — 东方书法褐墨
    border: '#D4D4D8', // Zinc-300
    card: '#FFFFFF',
    inkWash: 'rgba(60,36,21,0.06)', // 极淡宣纸墨晕 (hero/card bg)
  },
  dark: {
    background: '#09090B', // Zinc-950
    surface: '#18181B', // Zinc-900
    surfaceSecondary: '#27272A', // Zinc-800
    text: '#FAFAFA', // Zinc-50
    textSecondary: '#A1A1AA', // Zinc-400
    primary: '#FAFAFA', // Zinc-50 — 主色=白
    accent: '#C4A882', // 墨色 Ink Gold — 暖金墨 (暗色反转)
    border: '#3F3F46', // Zinc-700
    card: '#18181B', // Zinc-900
    inkWash: 'rgba(196,168,130,0.04)', // 极淡金墨晕 (hero/card bg)
  },
} as const

// ==================== 命理语义色 (from @zhop/hexastral-tokens) ====================
// Re-exported so existing imports continue to work — single source of truth.

export type { WuxingElement } from '@zhop/hexastral-tokens/palette'
export {
  brightnessColors,
  fortuneColors,
  mutagenColors,
  palaceColors,
  wuxingColors,
} from '@zhop/hexastral-tokens/palette'

import { getHighlightColors, getTokens, type ModeTokens } from '@zhop/hexastral-tokens/palette'

export type ThemeMode = 'light' | 'dark'
export type ThemeColors = (typeof theme)['dark'] | (typeof theme)['light']

/**
 * NAV_THEME — passed to <ThemeProvider> in _layout.tsx.
 * Aligns react-navigation's internal colors with the Zinc palette so
 * navigation backgrounds, card sheets and transition overlays match
 * the app theme in both light and dark mode.
 */
export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: theme.light.background,
      border: theme.light.border,
      card: theme.light.card,
      notification: '#EF4444',
      primary: theme.light.primary,
      text: theme.light.text,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: theme.dark.background,
      border: theme.dark.border,
      card: theme.dark.card,
      notification: '#EF4444',
      primary: theme.dark.primary,
      text: theme.dark.text,
    },
  },
}

/**
 * Drop-in hook for all screens and onboarding steps.
 *
 * Respects the user's manual theme preference stored in MMKV.
 * On first render, applies any saved override via `Appearance.setColorScheme()`.
 */
export function useTheme() {
  const scheme = useColorScheme()
  const isDark = (scheme ?? Appearance.getColorScheme() ?? 'light') === 'dark'
  return { colors: isDark ? theme.dark : theme.light, isDark }
}

// Apply stored preference at module load time so the very first render is correct.
{
  const pref = getThemePreference()
  if (pref !== 'system') {
    Appearance.setColorScheme(pref)
  }
}

/** Returns the perceived luminance (0–255) of a 6-digit hex color. */
function _hexLuminance(hex: string): number {
  const h = hex.startsWith('#') ? hex.slice(1) : hex
  if (h.length !== 6) return 0
  const r = Number.parseInt(h.slice(0, 2), 16)
  const g = Number.parseInt(h.slice(2, 4), 16)
  const b = Number.parseInt(h.slice(4, 6), 16)
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/** Unified iOS palette — derives all values from hexastral-tokens ModeTokens. */
export interface IosPalette extends ModeTokens {
  sectionLabel: string
  destructive: string
  /** Semantic highlight backgrounds for callouts */
  highlightBrown: string
  highlightGreen: string
  warnBg: string
  warnBar: string
}

export function useIosPalette(): IosPalette {
  const { isDark } = useTheme()
  const tokens = getTokens(isDark)
  const hl = getHighlightColors(isDark)
  return {
    ...tokens,
    highlightBrown: hl.brownBg,
    highlightGreen: hl.greenBg,
    warnBg: hl.warnBg,
    warnBar: hl.warnBar,
    sectionLabel: isDark ? '#A1A1AA' : '#71717A',
    destructive: isDark ? '#EF4444' : '#DC2626',
  }
}

/**
 * @deprecated Use `useIosPalette()` instead. Settings pages now use
 * the Zinc palette to match the rest of the app (Ink Brutalism).
 */
export function useSettingsPalette() {
  const ios = useIosPalette()
  return {
    bg: ios.bg,
    card: ios.card,
    separator: ios.separator,
    text: ios.text,
    secondary: ios.secondary,
    sectionLabel: ios.secondary,
    destructive: '#FF3B30' as const,
    tint: ios.tint,
    tintFg: ios.tintFg,
  }
}
