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

/** Default footer line for the DAY (宜忌) card — left side; the landing URL sits
 *  right. Timeline / make-if pass their OWN `footer` so each share carries chrome
 *  that markets THAT feature instead of the generic 黄历 line. */
const DAY_FOOTER: Record<string, string> = {
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
  const footerLine = footer ?? DAY_FOOTER[locale] ?? DAY_FOOTER.en
  const eyebrowLine = eyebrow ?? 'AUSPICE 黄历'
  const landing = footerUrl ?? 'hexastral.com/auspice'
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
          {eyebrowLine}
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
        <Text style={{ color: SHARE_PALETTE.dim, fontSize: 11, letterSpacing: 1 }}>
          {footerLine}
        </Text>
        <Text style={{ color: SHARE_PALETTE.dim, fontSize: 11, letterSpacing: 1 }}>{landing}</Text>
      </View>
    </View>
  )
})
