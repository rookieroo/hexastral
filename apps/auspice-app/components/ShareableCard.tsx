/**
 * ShareableCard — branded frame captured to a PNG for image shares
 * (see lib/imageShare). Mirrors the web `/s/*` OG cards so an in-app share
 * and a forwarded-link preview look like the same product.
 *
 * Rendered OFF-SCREEN (translated far left) only while capturing, then
 * unmounted. `collapsable={false}` keeps Android from flattening it away before
 * react-native-view-shot can snapshot it. Branding + hexastral.com are baked in
 * so an image that loses its caption still markets itself.
 *
 * Palette follows the app light/dark mode so a shared PNG matches what the user
 * sees. Graphs drawn inside should use `sharePaletteFor(isDark)` (not the live
 * interactive theme tokens) so they stay readable on this fixed share surface.
 */

import { useTheme } from '@zhop/core-ui'
import { forwardRef, type ReactNode } from 'react'
import { Text, View } from 'react-native'

export type SharePalette = {
  text: string
  secondary: string
  dim: string
  accent: string
  accentGhost: string
  separator: string
  bg: string
}

/** Light (ivory) share surface — also the default export alias `SHARE_PALETTE`. */
export const SHARE_PALETTE_LIGHT = {
  text: '#2B2118',
  secondary: '#6B5B49',
  dim: '#A8906F',
  accent: '#9A6A3A',
  accentGhost: 'rgba(201,154,91,0.12)',
  separator: '#D8C7AC',
  bg: '#FBF7F0',
} as const satisfies SharePalette

/** Dark share surface — ink paper, not pure black. */
export const SHARE_PALETTE_DARK = {
  text: '#F3EDE4',
  secondary: '#C4B5A0',
  dim: '#8F7F6C',
  accent: '#C9A45B',
  accentGhost: 'rgba(201,154,91,0.16)',
  separator: '#3F362C',
  bg: '#1C1814',
} as const satisfies SharePalette

/** @deprecated Prefer `sharePaletteFor(isDark)` — kept as light alias for call sites. */
export const SHARE_PALETTE = SHARE_PALETTE_LIGHT

export function sharePaletteFor(isDark: boolean): SharePalette {
  return isDark ? SHARE_PALETTE_DARK : SHARE_PALETTE_LIGHT
}

/** Default footer line for the DAY (宜忌) card — left side; the landing URL sits
 *  right. Timeline / make-if pass their OWN `footer` so each share carries chrome
 *  that markets THAT feature instead of the generic 黄历 line. */
const DAY_FOOTER: Record<string, string> = {
  'zh-Hans': '每日干支 · 农历 · 节气 · 宜忌',
  'zh-Hant': '每日干支 · 農曆 · 節氣 · 宜忌',
  ja: '干支 · 旧暦 · 二十四節気 · 宜忌',
  // en is pure English — no bare CJK in footer chrome.
  en: 'Chinese almanac · Good / Avoid',
}

/** Locale-aware brand eyebrow default for the DAY card (en stays CJK-free). */
const DAY_EYEBROW: Record<string, string> = {
  'zh-Hans': 'YUUN 黄历',
  'zh-Hant': 'YUUN 黃曆',
  ja: 'YUUN 暦',
  en: 'YUUN · ALMANAC',
}

export interface ShareableCardProps {
  /** Card width in px (capture resolution scales with device pixel ratio). */
  width: number
  /** Big title, e.g. "己酉日" / "人生时间线". */
  title: string
  /** Optional dim subtitle, e.g. the date or 命局. */
  subtitle?: string
  locale?: string
  /** Small spaced brand eyebrow. Defaults to the 黄历 mark; timeline / make-if
   *  override it so each share has its own 页眉. */
  eyebrow?: string
  /** Footer left line. Defaults to the 宜忌 day-card line; pass a feature-specific
   *  tagline for timeline / make-if (the 页脚 doubles as a marketing hook). */
  footer?: string
  /** Footer right label — the app-specific landing the share funnels to. */
  footerUrl?: string
  children: ReactNode
}

export const ShareableCard = forwardRef<View, ShareableCardProps>(function ShareableCard(
  { width, title, subtitle, locale = 'en', eyebrow, footer, footerUrl, children },
  ref
) {
  const { isDark } = useTheme()
  const p = sharePaletteFor(isDark)
  const footerLine = footer ?? DAY_FOOTER[locale] ?? DAY_FOOTER.en
  const eyebrowLine = eyebrow ?? DAY_EYEBROW[locale] ?? DAY_EYEBROW.en
  const landing = footerUrl ?? 'yuun.hexastral.com'
  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width,
        backgroundColor: p.bg,
        paddingHorizontal: 24,
        paddingVertical: 28,
        gap: 20,
      }}
    >
      <View style={{ gap: 6 }}>
        <Text style={{ color: p.accent, fontSize: 12, letterSpacing: 4 }}>{eyebrowLine}</Text>
        <Text style={{ color: p.text, fontSize: 24, fontWeight: '600' }}>{title}</Text>
        {subtitle ? <Text style={{ color: p.dim, fontSize: 13 }}>{subtitle}</Text> : null}
      </View>

      {children}

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTopWidth: 0.5,
          borderTopColor: p.separator,
          paddingTop: 14,
        }}
      >
        {/* footerLine shrinks/ellipsizes; the landing URL never yields its width
            so a long (e.g. translated) footer can't crowd or overlap the link. */}
        <Text
          style={{ color: p.dim, fontSize: 11, letterSpacing: 1, flexShrink: 1 }}
          numberOfLines={1}
        >
          {footerLine}
        </Text>
        <Text
          style={{
            color: p.dim,
            fontSize: 11,
            letterSpacing: 1,
            flexShrink: 0,
            marginLeft: 12,
          }}
        >
          {landing}
        </Text>
      </View>
    </View>
  )
})
