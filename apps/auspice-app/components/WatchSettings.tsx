/**
 * WatchSettings — appearance config for the home-screen widget (月相 skin) plus a
 * preview of the watch-face styles.
 *
 * Honest framing (2026-06): only the home-screen WIDGET ships today (small +
 * medium), and it varies by 月相 skin. The four "表盘样式" templates drive the
 * watch-face PREVIEW only — there is no watchOS target yet — so they're labelled
 * 即将推出 (coming soon) and not sold on the paywall. When the watch app lands,
 * these templates become its faces with no migration. All copy is localized.
 */

import { useTheme } from '@zhop/core-ui'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { type AuspiceDayPayload, fetchAuspiceDay } from '@/lib/api'
import { getAuspiceBirthDate } from '@/lib/birth'
import { useStrings } from '@/lib/i18n-context'
import {
  DEFAULT_MOON_SKIN_ID,
  DEFAULT_TEMPLATE,
  getMoonSkin,
  getWatchTemplate,
  MOON_SKIN_OPTIONS,
  type MoonSkinId,
  setMoonSkin,
  setWatchTemplate,
  TEMPLATE_OPTIONS,
  type WatchTemplate,
} from '@/lib/widget-config'
import { DailyCard } from './DailyCard'
import { StaticMoon } from './StaticMoon'
import { WidgetCard } from './WidgetCard'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function Label({ children }: { children: string }) {
  const { colors } = useTheme()
  return <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3 }}>{children}</Text>
}

export function WatchSettings() {
  const { colors, spacing } = useTheme()
  const { t } = useStrings()
  // Watch/widget previews mirror native render contracts: 对你而言 is Pro-only.
  // Free users see the same face/widget without the personalization line.
  const entitlements = useEntitlements()
  const isPro = hasEntitlement(entitlements, 'auspice_pro')
  const [payload, setPayload] = useState<AuspiceDayPayload | null>(null)
  const [template, setTemplate] = useState<WatchTemplate>(DEFAULT_TEMPLATE)
  const [skinId, setSkinId] = useState<MoonSkinId>(DEFAULT_MOON_SKIN_ID)

  useEffect(() => {
    const d = new Date()
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    getAuspiceBirthDate()
      .then((b) => fetchAuspiceDay(iso, b))
      .then(setPayload)
      .catch(() => {})
    getWatchTemplate()
      .then(setTemplate)
      .catch(() => {})
    getMoonSkin()
      .then(setSkinId)
      .catch(() => {})
  }, [])

  const pickTemplate = (id: WatchTemplate) => {
    setTemplate(id)
    void setWatchTemplate(id)
  }
  const pickSkin = (id: MoonSkinId) => {
    setSkinId(id)
    void setMoonSkin(id)
  }

  return (
    <View style={{ gap: spacing.lg }}>
      {/* Live preview — watch face + home-screen small widget. */}
      {payload ? (
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.lg,
            alignItems: 'center',
            alignSelf: 'center',
          }}
        >
          {/* Widget preview FIRST — it's what actually ships today. */}
          <View style={{ gap: 4, alignItems: 'center' }}>
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 22,
                overflow: 'hidden',
                backgroundColor: '#000',
              }}
            >
              <WidgetCard
                size='small'
                moonSkinId={skinId}
                date={payload.date}
                day={payload.day}
                personalization={isPro ? payload.personalization : null}
              />
            </View>
            <Text style={{ color: colors.dim, fontSize: 10, letterSpacing: 1 }}>
              {t.widgetPreviewCaption}
            </Text>
          </View>
          {/* Watch preview — a look-ahead; no watchOS target ships yet. */}
          <View style={{ gap: 4, alignItems: 'center' }}>
            <View
              style={{
                width: 168,
                height: 200,
                borderRadius: 42,
                overflow: 'hidden',
                backgroundColor: '#000',
                opacity: 0.85,
              }}
            >
              <DailyCard
                tier='compact'
                template={template}
                moonSkinId={skinId}
                date={payload.date}
                day={payload.day}
                personalization={isPro ? payload.personalization : null}
              />
            </View>
            <Text style={{ color: colors.dim, fontSize: 10, letterSpacing: 1 }}>
              {t.watchPreviewCaption}
            </Text>
          </View>
        </View>
      ) : null}

      <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 18 }}>{t.watchWidgetsNote}</Text>

      {/* Watch-face styles — a preview only (no watchOS target yet), so the
          section carries a 即将推出 badge and isn't sold on the paywall. */}
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Label>{t.watchStyleLabel}</Label>
          <View
            style={{
              paddingHorizontal: 6,
              paddingVertical: 1,
              borderRadius: 6,
              backgroundColor: colors.separator,
            }}
          >
            <Text
              style={{ color: colors.secondary, fontSize: 9, letterSpacing: 1, fontWeight: '600' }}
            >
              {t.comingSoon}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {TEMPLATE_OPTIONS.map((tpl) => {
            const sel = tpl.id === template
            return (
              <Pressable
                key={tpl.id}
                onPress={() => pickTemplate(tpl.id)}
                accessibilityRole='button'
                accessibilityState={{ selected: sel }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: spacing.md,
                  paddingVertical: 6,
                  borderRadius: 14,
                  borderWidth: sel ? 1 : 0.5,
                  borderColor: sel ? colors.accent : colors.separator,
                  backgroundColor: sel ? colors.accentGhost : 'transparent',
                }}
              >
                <Text style={{ color: sel ? colors.accent : colors.text, fontSize: 13 }}>
                  {tpl.label}
                </Text>
                {/* No per-template PRO badge: the whole section is 即将推出, so
                    these aren't sellable yet. The TEMPLATE_OPTIONS.pro data stays
                    for when the watch app ships and they become a paid tier. */}
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* Moon skin — applies to the shipping home-screen widget. */}
      <View style={{ gap: spacing.sm }}>
        <Label>{t.moonSkinLabel}</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {MOON_SKIN_OPTIONS.map((opt) => {
            const sel = opt.id === skinId
            return (
              <Pressable
                key={opt.id}
                onPress={() => pickSkin(opt.id)}
                accessibilityRole='button'
                accessibilityState={{ selected: sel }}
                style={{
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.sm,
                  borderRadius: 12,
                  borderWidth: sel ? 1 : 0.5,
                  borderColor: sel ? colors.accent : colors.separator,
                  backgroundColor: '#000',
                }}
              >
                {/* Skia's native Canvas swallows touches, so the parent
                    Pressable never sees taps on the moon itself — only on
                    the text label. pointerEvents='none' on this wrapper
                    lets taps pass through to the Pressable. */}
                <View pointerEvents='none'>
                  <StaticMoon phase={0.3} size={34} skinId={opt.id} />
                </View>
                <Text style={{ color: sel ? colors.accent : colors.dim, fontSize: 11 }}>
                  {opt.name}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>
    </View>
  )
}
