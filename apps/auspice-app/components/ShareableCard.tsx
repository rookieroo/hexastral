/**
 * ShareableCard — the branded ivory frame captured to a PNG for image shares
 * (see lib/imageShare). It mirrors the web `/s/*` OG cards so an in-app share
 * and a forwarded-link preview look like the same product.
 *
 * Rendered OFF-SCREEN (translated far left) only while capturing, then
 * unmounted. `collapsable={false}` keeps Android from flattening it away before
 * react-native-view-shot can snapshot it. Branding + hexastral.com are baked in
 * so an image that loses its caption still markets itself.
 *
 * Graphs drawn inside should be passed `SHARE_PALETTE` (not the live theme) so
 * they always read correctly on the fixed ivory background — the captured image
 * is brand-consistent regardless of the user's light/dark setting.
 */

import { forwardRef, type ReactNode } from 'react'
import { Text, View } from 'react-native'

/** Fixed light palette for any graph rendered into the card (matches the web OG cards). */
export const SHARE_PALETTE = {
  text: '#2B2118',
  secondary: '#6B5B49',
  dim: '#A8906F',
  accent: '#9A6A3A',
  accentGhost: 'rgba(201,154,91,0.12)',
  separator: '#D8C7AC',
  bg: '#FBF7F0',
} as const

/** Localized "made with Auspice" footer line (left side; hexastral.com sits right). */
const FOOTER: Record<string, string> = {
  'zh-Hans': '每日干支 · 农历 · 节气 · 宜忌',
  'zh-Hant': '每日干支 · 農曆 · 節氣 · 宜忌',
  ja: '干支 · 旧暦 · 二十四節気 · 宜忌',
  en: 'The Chinese calendar — 干支 · 农历 · 宜忌',
}

export interface ShareableCardProps {
  /** Card width in px (capture resolution scales with device pixel ratio). */
  width: number
  /** Big title, e.g. "己酉日" / "人生时间线". */
  title: string
  /** Optional dim subtitle, e.g. the date or 命局. */
  subtitle?: string
  locale?: string
  children: ReactNode
}

export const ShareableCard = forwardRef<View, ShareableCardProps>(function ShareableCard(
  { width, title, subtitle, locale = 'en', children },
  ref
) {
  const footer = FOOTER[locale] ?? FOOTER.en
  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width,
        backgroundColor: SHARE_PALETTE.bg,
        paddingHorizontal: 24,
        paddingVertical: 28,
        gap: 20,
      }}
    >
      <View style={{ gap: 6 }}>
        <Text style={{ color: SHARE_PALETTE.accent, fontSize: 12, letterSpacing: 4 }}>
          AUSPICE 黄历
        </Text>
        <Text style={{ color: SHARE_PALETTE.text, fontSize: 24, fontWeight: '600' }}>{title}</Text>
        {subtitle ? (
          <Text style={{ color: SHARE_PALETTE.dim, fontSize: 13 }}>{subtitle}</Text>
        ) : null}
      </View>

      {children}

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTopWidth: 0.5,
          borderTopColor: SHARE_PALETTE.separator,
          paddingTop: 14,
        }}
      >
        <Text style={{ color: SHARE_PALETTE.dim, fontSize: 11, letterSpacing: 1 }}>{footer}</Text>
        <Text style={{ color: SHARE_PALETTE.dim, fontSize: 11, letterSpacing: 1 }}>
          hexastral.com
        </Text>
      </View>
    </View>
  )
})
