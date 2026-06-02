/**
 * ShareChapterButton — cinnabar-tinted "save card" affordance (Phase C.3).
 *
 * Wraps `shareReportAsLink` with a small spec'd UI:
 *   - Hairline-bordered pill with localized "Share this chapter" label
 *   - Cinnabar/gold accent that recalls the Yuán share pattern but auto-themes
 *     for hexastral-app's IosPalette
 *   - Single-tap → server snapshot via `/api/share` → native share sheet with a
 *     URL pointing at hexastral-web's `/report/[shareId]/page.tsx` (OG-ready)
 *
 * Resilient: snapshot creation can fail (auth missing, network) — we show a
 * one-line error inline instead of throwing.
 */

import { Share2 } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { shareReportAsLink } from '@/lib/domain/share'
import { useI18n } from '@/lib/i18n'
import { useIosPalette, useTheme } from '@/lib/theme'

export interface ShareChapterButtonProps {
  /** Server `reportType` enum — must match hexastral-api `share` route. */
  reportType: 'fate' | 'natal' | 'stellar' | 'yiching' | 'physiognomy' | 'pair'
  /** Stable id used as the snapshot key on the server. */
  reportId: string
  /** Title shown in the native share sheet (also goes into OG image alt). */
  title: string
  /** JSON-encoded payload hexastral-web will render. */
  contentJson: string
  /** Optional override for the button label (e.g. "Share full chart"). */
  labelKey?: 'share_chapter_cta' | 'share_chart_cta'
  /** Optional onShared callback (e.g. for analytics). */
  onShared?: (info: { shareId: string; url: string }) => void
}

export function ShareChapterButton({
  reportType,
  reportId,
  title,
  contentJson,
  labelKey = 'share_chapter_cta',
  onShared,
}: ShareChapterButtonProps) {
  const { t } = useI18n()
  const ios = useIosPalette()
  const { isDark } = useTheme()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Cinnabar accent in light mode, ink-gold in dark — same accent the Yuán
  // share card uses, so users perceive a consistent share action across apps.
  const cinnabar = isDark ? '#C4A882' : '#9B2226'

  const handlePress = async () => {
    if (busy) return
    setErr(null)
    setBusy(true)
    try {
      const result = await shareReportAsLink({
        reportType,
        reportId,
        title,
        contentJson,
      })
      onShared?.(result)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <View>
      <Pressable
        accessibilityRole='button'
        onPress={handlePress}
        disabled={busy}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          paddingVertical: 14,
          paddingHorizontal: 20,
          borderWidth: 0.5,
          borderColor: cinnabar,
          backgroundColor: 'transparent',
          opacity: busy ? 0.5 : 1,
        }}
      >
        <Share2 size={16} color={cinnabar} />
        <Text
          style={{
            color: cinnabar,
            fontSize: 13,
            fontWeight: '500',
            letterSpacing: 1.6,
            textTransform: 'uppercase',
          }}
        >
          {busy ? t('share_chapter_pending') : t(labelKey)}
        </Text>
      </Pressable>
      {err ? (
        <Text style={{ color: ios.secondary, fontSize: 11, marginTop: 6, textAlign: 'center' }}>
          {err === 'share_requires_signed_in_user' ? t('share_chapter_needs_signin') : err}
        </Text>
      ) : null}
    </View>
  )
}
