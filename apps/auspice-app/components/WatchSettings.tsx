/**
 * WatchSettings — widget/watch appearance + live previews.
 * Previews follow app light/dark (宣纸 / 星空). __DEV__ phase slider mocks 月相.
 * Moon-face skin picker removed — chrome uses PhaseLogo (sphere), not water-ink skins.
 */

import { useTheme } from '@zhop/core-ui'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { type AuspiceDayPayload, fetchAuspiceDay } from '@/lib/api'
import { getAuspiceBirthDate } from '@/lib/birth'
import { useDevMoonPhase } from '@/lib/dev-moon-phase'
import { useStrings } from '@/lib/i18n-context'
import {
  DEFAULT_TEMPLATE,
  getWatchTemplate,
  setWatchTemplate,
  TEMPLATE_OPTIONS,
  type WatchTemplate,
} from '@/lib/widget-config'
import { DailyCard } from './DailyCard'
import { WidgetCard } from './WidgetCard'
import { widgetSurfaceBg } from './WidgetSurface'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function Label({ children }: { children: string }) {
  const { colors } = useTheme()
  return <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3 }}>{children}</Text>
}

export function WatchSettings() {
  const { colors, spacing, mode } = useTheme()
  const surfaceMode = mode === 'light' ? 'light' : 'dark'
  const { t } = useStrings()
  const entitlements = useEntitlements()
  const isPro = hasEntitlement(entitlements, 'auspice_pro')
  const [payload, setPayload] = useState<AuspiceDayPayload | null>(null)
  const [template, setTemplate] = useState<WatchTemplate>(DEFAULT_TEMPLATE)
  const { phase: phaseOverride, setPhase: setPhaseOverride } = useDevMoonPhase()

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
  }, [])

  const pickTemplate = (id: WatchTemplate) => {
    setTemplate(id)
    void setWatchTemplate(id)
  }

  const livePhase = phaseOverride ?? undefined
  const previewBg = widgetSurfaceBg(surfaceMode)

  return (
    <View style={{ gap: spacing.lg }}>
      {payload ? (
        <View style={{ gap: spacing.md }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: spacing.md, paddingVertical: 4 }}>
              {(
                [
                  { size: 'small' as const, w: 155, h: 155 },
                  { size: 'medium' as const, w: 329, h: 155 },
                  { size: 'large' as const, w: 329, h: 345 },
                ] as const
              ).map((box) => (
                <View key={box.size} style={{ gap: 4, alignItems: 'center' }}>
                  <View
                    style={{
                      width: box.w * 0.55,
                      height: box.h * 0.55,
                      borderRadius: 22,
                      overflow: 'hidden',
                      backgroundColor: previewBg,
                    }}
                  >
                    <WidgetCard
                      size={box.size}
                      width={box.w * 0.55}
                      height={box.h * 0.55}
                      phaseOverride={livePhase}
                      date={payload.date}
                      day={payload.day}
                      personalization={isPro ? payload.personalization : null}
                    />
                  </View>
                  <Text style={{ color: colors.dim, fontSize: 10, letterSpacing: 1 }}>
                    {box.size}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
          <View style={{ gap: 4, alignItems: 'center', alignSelf: 'center' }}>
            <View
              style={{
                width: 168,
                height: 200,
                borderRadius: 42,
                overflow: 'hidden',
                backgroundColor: previewBg,
                opacity: 0.95,
              }}
            >
              <DailyCard
                tier='compact'
                template={template}
                phaseOverride={livePhase}
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

      {__DEV__ ? (
        <View style={{ gap: spacing.sm }}>
          <Label>{t.devMoonPhaseLabel}</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {(
              [
                { label: t.devMoonPhaseLive, value: null as number | null },
                { label: '朔', value: 0 },
                { label: '上弦', value: 0.25 },
                { label: '望', value: 0.5 },
                { label: '下弦', value: 0.75 },
              ] as const
            ).map((opt) => {
              const sel =
                opt.value === null ? phaseOverride === null : phaseOverride === opt.value
              return (
                <Pressable
                  key={opt.label}
                  onPress={() => setPhaseOverride(opt.value)}
                  accessibilityRole='button'
                  accessibilityState={{ selected: sel }}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: 6,
                    borderRadius: 14,
                    borderWidth: sel ? 1 : 0.5,
                    borderColor: sel ? colors.accent : colors.separator,
                    backgroundColor: sel ? colors.accentGhost : 'transparent',
                  }}
                >
                  <Text style={{ color: sel ? colors.accent : colors.text, fontSize: 13 }}>
                    {opt.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          <Text style={{ color: colors.dim, fontSize: 11, lineHeight: 16 }}>
            {t.devMoonPhaseHint}
          </Text>
        </View>
      ) : null}

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
              </Pressable>
            )
          })}
        </View>
      </View>
    </View>
  )
}
