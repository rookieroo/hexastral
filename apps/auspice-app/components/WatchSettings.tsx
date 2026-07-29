/**
 * WatchSettings — home-widget sizes + Watch complication hot-zone previews.
 * No fake full watch-face mock: third parties only fill system face slots.
 */

import { useTheme } from '@zhop/core-ui'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { type AuspiceDayPayload, fetchAuspiceDay } from '@/lib/api'
import { getAuspiceBirthDate } from '@/lib/birth'
import { useDevMoonPhase } from '@/lib/dev-moon-phase'
import { useStrings } from '@/lib/i18n-context'
import { buildDailyCardModel, compactVerbs } from './DailyCard'
import { PhaseLogo } from './PhaseLogo'
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
  livePhase,
  previewBg,
}: {
  size: WidgetSize
  label: string
  payload: AuspiceDayPayload
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
            personalization={payload.personalization}
          />
        </View>
      </View>
      <Text style={{ color: colors.dim, fontSize: 10, letterSpacing: 1 }}>{label}</Text>
    </View>
  )
}

function SlotCaption({ children }: { children: string }) {
  const { colors } = useTheme()
  return <Text style={{ color: colors.dim, fontSize: 10, letterSpacing: 1 }}>{children}</Text>
}

/** Circular accessory — moon + 干支. */
function CircularSlotPreview({
  ganZhi,
  phase,
  border,
  text,
}: {
  ganZhi: string
  phase: number
  border: string
  text: string
}) {
  return (
    <View
      style={{
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 0.5,
        borderColor: border,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <PhaseLogo phase={phase} size={14} />
      <Text style={{ color: text, fontSize: 11, fontWeight: '600', letterSpacing: 1 }} numberOfLines={1}>
        {ganZhi}
      </Text>
    </View>
  )
}

/** Rectangular accessory — two lines. */
function RectangularSlotPreview({
  ganZhi,
  solarTerm,
  yiLine,
  phase,
  border,
  text,
  dim,
}: {
  ganZhi: string
  solarTerm: string
  yiLine: string
  phase: number
  border: string
  text: string
  dim: string
}) {
  return (
    <View
      style={{
        width: 148,
        height: 48,
        borderWidth: 0.5,
        borderColor: border,
        borderRadius: 0,
        paddingHorizontal: 8,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <PhaseLogo phase={phase} size={22} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <Text style={{ color: text, fontSize: 13, fontWeight: '600', letterSpacing: 1 }} numberOfLines={1}>
            {ganZhi}
          </Text>
          {solarTerm ? (
            <Text style={{ color: dim, fontSize: 10 }} numberOfLines={1}>
              {solarTerm}
            </Text>
          ) : null}
        </View>
        <Text style={{ color: dim, fontSize: 11 }} numberOfLines={1}>
          {yiLine}
        </Text>
      </View>
    </View>
  )
}

/** Inline accessory — single 宜 line. */
function InlineSlotPreview({
  yiLine,
  border,
  text,
}: {
  yiLine: string
  border: string
  text: string
}) {
  return (
    <View
      style={{
        minWidth: 148,
        maxWidth: 200,
        height: 28,
        borderWidth: 0.5,
        borderColor: border,
        borderRadius: 0,
        paddingHorizontal: 8,
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: text, fontSize: 12 }} numberOfLines={1}>
        {yiLine}
      </Text>
    </View>
  )
}

/** Corner accessory — 干支 stamp. */
function CornerSlotPreview({
  ganZhi,
  border,
  text,
}: {
  ganZhi: string
  border: string
  text: string
}) {
  return (
    <View
      style={{
        width: 44,
        height: 28,
        borderWidth: 0.5,
        borderColor: border,
        borderRadius: 0,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: text, fontSize: 12, fontWeight: '600', letterSpacing: 1 }} numberOfLines={1}>
        {ganZhi}
      </Text>
    </View>
  )
}

export function WatchSettings() {
  const { colors, spacing, mode } = useTheme()
  const surfaceMode = mode === 'light' ? 'light' : 'dark'
  const { t, locale } = useStrings()
  const [payload, setPayload] = useState<AuspiceDayPayload | null>(null)
  const { phase: phaseOverride, setPhase: setPhaseOverride } = useDevMoonPhase()

  useEffect(() => {
    const d = new Date()
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    getAuspiceBirthDate()
      .then((b) => fetchAuspiceDay(iso, b))
      .then(setPayload)
      .catch(() => {})
  }, [])

  const livePhase = phaseOverride ?? undefined
  const previewBg = widgetSurfaceBg(surfaceMode)
  const sizeLabel = (s: WidgetSize) =>
    s === 'small' ? t.widgetSizeSmall : s === 'medium' ? t.widgetSizeMedium : t.widgetSizeLarge

  const model = useMemo(() => {
    if (!payload) return null
    return buildDailyCardModel(
      payload.date,
      payload.day,
      payload.personalization ?? null,
      t,
      locale
    )
  }, [payload, t, locale])

  const ganZhi = model?.ganZhi ?? '—'
  const solarTerm = model?.solarTermName ?? ''
  // Match Watch: locale verbs; en keeps 1 short verb for tiny slots.
  const yiShort = model
    ? compactVerbs(model.goodForRaw, locale === 'en' ? 1 : 2, locale)
    : '—'
  const yiLine = `宜 ${yiShort}`
  const phase = livePhase ?? model?.moonPhase ?? 0.5

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
                  livePhase={livePhase}
                  previewBg={previewBg}
                />
              ))}
            </View>
          </ScrollView>

          <View style={{ gap: spacing.sm }}>
            <Label>{t.watchPreviewCaption}</Label>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: spacing.md,
                alignItems: 'flex-end',
              }}
            >
              <View style={{ gap: 6, alignItems: 'center' }}>
                <CircularSlotPreview
                  ganZhi={ganZhi}
                  phase={phase}
                  border={colors.separator}
                  text={colors.text}
                />
                <SlotCaption>{t.watchSlotCircular}</SlotCaption>
              </View>
              <View style={{ gap: 6, alignItems: 'center' }}>
                <RectangularSlotPreview
                  ganZhi={ganZhi}
                  solarTerm={solarTerm}
                  yiLine={yiLine}
                  phase={phase}
                  border={colors.separator}
                  text={colors.text}
                  dim={colors.dim}
                />
                <SlotCaption>{t.watchSlotRectangular}</SlotCaption>
              </View>
              <View style={{ gap: 6, alignItems: 'center' }}>
                <InlineSlotPreview yiLine={yiLine} border={colors.separator} text={colors.text} />
                <SlotCaption>{t.watchSlotInline}</SlotCaption>
              </View>
              <View style={{ gap: 6, alignItems: 'center' }}>
                <CornerSlotPreview ganZhi={ganZhi} border={colors.separator} text={colors.text} />
                <SlotCaption>{t.watchSlotCorner}</SlotCaption>
              </View>
            </View>
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
    </View>
  )
}
