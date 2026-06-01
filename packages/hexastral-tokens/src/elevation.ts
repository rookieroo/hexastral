/**
 * Elevation tokens — surface layering for cards, modals, sticky bars.
 *
 * The Ink Brutalism aesthetic stays mostly flat, but a small set of elevation
 * steps adds visual hierarchy without breaking the calm. Use:
 *
 *   - `none` for inline content (text-in-paragraph)
 *   - `sm`   for cards (chapter cards, list rows, site cards)
 *   - `md`   for sticky bars (tab bar, app bar) and popovers
 *   - `lg`   for modals, sheets, full-screen overlays
 *
 * Each level exposes both iOS shadow and Android elevation values. Consumers:
 *
 *   import { elevation } from '@zhop/hexastral-tokens/elevation'
 *   const { iosShadow, androidElevation } = elevation.sm
 *   <View style={Platform.OS === 'ios' ? iosShadow : { elevation: androidElevation }} />
 *
 * For web, use `webBoxShadow` directly as a CSS box-shadow string.
 */

export interface IosShadow {
  shadowColor: string
  shadowOpacity: number
  shadowRadius: number
  shadowOffset: { width: number; height: number }
}

export interface ElevationLevel {
  iosShadow: IosShadow | null
  androidElevation: number
  webBoxShadow: string
}

const SHADOW_COLOR = '#000000'

export const elevation = {
  none: {
    iosShadow: null,
    androidElevation: 0,
    webBoxShadow: 'none',
  },
  sm: {
    iosShadow: {
      shadowColor: SHADOW_COLOR,
      shadowOpacity: 0.06,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
    },
    androidElevation: 1,
    webBoxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
  },
  md: {
    iosShadow: {
      shadowColor: SHADOW_COLOR,
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },
    androidElevation: 3,
    webBoxShadow: '0 4px 10px rgba(0, 0, 0, 0.08)',
  },
  lg: {
    iosShadow: {
      shadowColor: SHADOW_COLOR,
      shadowOpacity: 0.12,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
    },
    androidElevation: 8,
    webBoxShadow: '0 10px 22px rgba(0, 0, 0, 0.12)',
  },
} as const satisfies Record<string, ElevationLevel>

export type ElevationKey = keyof typeof elevation
