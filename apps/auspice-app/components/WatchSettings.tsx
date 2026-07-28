/**
 * WatchSettings — widget/watch appearance + live previews.
 * Previews follow app light/dark (宣纸 / 星空). __DEV__ phase slider mocks 月相.
 */

import { useTheme } from '@zhop/core-ui'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { type AuspiceDayPayload, fetchAuspiceDay } from '@/lib/api'
import { getAuspiceBirthDate } from '@/lib/birth'
import { useStrings } from '@/lib/i18n-context'
import {
  DEFAULT_TEMPLATE,
  defaultMoonSkinForMode,
  getMoonSkin,
  getWatchTemplate,
  MOON_SKIN_OPTIONS,
  type MoonSkinId,
  setMoonSkin,
  setWatchTemplate,
  TEMPLATE_OPTIONS,
  type WatchTemplate,
} from '@/lib/widget-config'
import { useDevMoonPhase } from '@/lib/dev-moon-phase'
import { DailyCard } from './DailyCard'
import { StaticMoon } from './StaticMoon'
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
  const [skinId, setSkinId] = useState<MoonSkinId>(defaultMoonSkinForMode(surfaceMode))
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
    getMoonSkin(surfaceMode)
      .then(setSkinId)
      .catch(() => {})
  }, [surfaceMode])

  const pickTemplate = (id: WatchTemplate) => {
    setTemplate(id)
    void setWatchTemplate(id)
  }
  const pickSkin = (id: MoonSkinId) => {
    setSkinId(id)
    void setMoonSkin(id)
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
                  { size: 'small' as const, w: 100, h: 100 },
                  { size: 'medium' as const, w: 200, h: 100 },
                  { size: 'large' as const, w: 180, h: 190 },
                ] as const
              ).map((box) => (
                <View key={box.size} style={{ gap: 4, alignItems: 'center' }}>
                  <View
                    style={{
                      width: box.w,
                      height: box.h,
                      borderRadius: 22,
                      overflow: 'hidden',
                      backgroundColor: previewBg,
                    }}
                  >
                    <WidgetCard
                      size={box.size}
                      width={box.w}
                      height={box.h}
                      moonSkinId={skinId}
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
                moonSkinId={skinId}
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

      <View style={{ gap: spacing.sm }}>
        <Label>{t.moonSkinLabel}</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {MOON_SKIN_OPTIONS.map((opt) => {
            const sel = opt.id === skinId
            const swatchBg =
              opt.id === 'rice-paper'
                ? widgetSurfaceBg('light')
                : opt.id === 'starfield'
                  ? widgetSurfaceBg('dark')
                  : previewBg
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
                  backgroundColor: swatchBg,
                }}
              >
                <View pointerEvents='none'>
                  <StaticMoon
                    phase={phaseOverride ?? 0.3}
                    size={34}
                    skinId={opt.id}
                  />
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
