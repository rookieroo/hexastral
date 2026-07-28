/**
 * WatchSettings — widget/watch appearance + live previews.
 * Previews use true iOS widget points, then CSS-scale into the row (no reflow overflow).
 * Preview locale matches the app locale (same as widget sync).
 */

import { useTheme } from '@zhop/core-ui'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native'
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
import { WidgetCard, type WidgetSize } from './WidgetCard'
import { widgetSurfaceBg } from './WidgetSurface'

/** System widget logical sizes (pt) — layout at full size, then scale for the row. */
const WIDGET_BOX: Record<WidgetSize, { w: number; h: number }> = {
  small: { w: 158, h: 158 },
  medium: { w: 338, h: 158 },
  large: { w: 338, h: 354 },
}

const PREVIEW_SCALE = 0.52

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function Label({ children }: { children: string }) {
  const { colors } = useTheme()
  return <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3 }}>{children}</Text>
}

function ScaledWidgetPreview({
  size,
  label,
  payload,
  isPro,
  livePhase,
  previewBg,
}: {
  size: WidgetSize
  label: string
  payload: AuspiceDayPayload
  isPro: boolean
  livePhase: number | undefined
  previewBg: string
}) {
  const { colors } = useTheme()
  const box = WIDGET_BOX[size]
  const scaledW = Math.round(box.w * PREVIEW_SCALE)
  const scaledH = Math.round(box.h * PREVIEW_SCALE)
  return (
    <View style={{ gap: 6, alignItems: 'center' }}>
      <View
        style={{
          width: scaledW,
          height: scaledH,
          borderRadius: Math.round(22 * PREVIEW_SCALE),
          overflow: 'hidden',
          backgroundColor: previewBg,
        }}
      >
        <View
          style={{
            width: box.w,
            height: box.h,
            transform: [{ scale: PREVIEW_SCALE }],
            transformOrigin: 'top left',
          }}
        >
          <WidgetCard
            size={size}
            width={box.w}
            height={box.h}
            phaseOverride={livePhase}
            date={payload.date}
            day={payload.day}
            personalization={isPro ? payload.personalization : null}
          />
        </View>
      </View>
      <Text style={{ color: colors.dim, fontSize: 10, letterSpacing: 1 }}>{label}</Text>
    </View>
  )
}

export function WatchSettings() {
  const { colors, spacing, mode } = useTheme()
  const { width: winW } = useWindowDimensions()
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
  const sizeLabel = (s: WidgetSize) =>
    s === 'small' ? t.widgetSizeSmall : s === 'medium' ? t.widgetSizeMedium : t.widgetSizeLarge

  const templateLabel = (id: WatchTemplate): string => {
    if (id === 'modern') return t.watchTemplateModern
    if (id === 'lunar') return t.watchTemplateLunar
    if (id === 'almanac') return t.watchTemplateAlmanac
    return t.watchTemplateAncient
  }

  const watchPreviewW = Math.min(176, Math.round(winW * 0.42))
  const watchPreviewH = Math.round(watchPreviewW * (200 / 168))

  return (
    <View style={{ gap: spacing.lg }}>
      {payload ? (
        <View style={{ gap: spacing.md }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: spacing.md, paddingVertical: 4 }}>
              {(['small', 'medium', 'large'] as const).map((size) => (
                <ScaledWidgetPreview
                  key={size}
                  size={size}
                  label={sizeLabel(size)}
                  payload={payload}
                  isPro={isPro}
                  livePhase={livePhase}
                  previewBg={previewBg}
                />
              ))}
            </View>
          </ScrollView>
          <View style={{ gap: 4, alignItems: 'center', alignSelf: 'center' }}>
            <View
              style={{
                width: watchPreviewW,
                height: watchPreviewH,
                borderRadius: Math.round(watchPreviewW * 0.25),
                overflow: 'hidden',
                backgroundColor: previewBg,
                opacity: 0.95,
              }}
            >
              <View
                style={{
                  width: 168,
                  height: 200,
                  transform: [{ scale: watchPreviewW / 168 }],
                  transformOrigin: 'top left',
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
                { label: t.devMoonPhaseNew, value: 0 },
                { label: t.devMoonPhaseFirst, value: 0.25 },
                { label: t.devMoonPhaseFull, value: 0.5 },
                { label: t.devMoonPhaseLast, value: 0.75 },
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
                  {templateLabel(tpl.id)}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>
    </View>
  )
}
