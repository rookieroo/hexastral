/**
 * WatchSettings — home-widget sizes + Watch complication hot-zone previews.
 * No fake full watch-face mock: third parties only fill system face slots.
 */

import { useTheme } from '@zhop/core-ui'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Platform, Pressable, Text, useWindowDimensions, View } from 'react-native'
import { type AuspiceDayPayload, fetchAuspiceDay } from '@/lib/api'
import { getAuspiceBirthDate } from '@/lib/birth'
import { useDevMoonPhase } from '@/lib/dev-moon-phase'
import { useStrings } from '@/lib/i18n-context'
import { syncWidgetWindow } from '@/lib/widget-bridge'
import { WIDGET_SPEC } from '@/lib/widget-spec'
import { useYijiDisplayMode } from '@/lib/yiji-mode-context'
import { buildDailyCardModel, compactVerbs, moonPhaseForIsoDate } from './DailyCard'
import { PhaseLogo } from './PhaseLogo'
import { WidgetCard, type WidgetSize } from './WidgetCard'
import { widgetSurfaceBg } from './WidgetSurface'

/**
 * System widget logical sizes (pt) — from the single widget spec
 * (lib/widget-spec.json), shared with the native Swift/Glance widgets.
 * 小 = 2×2, 中 = 4×2, 大 = 4×4 (Android Glance uses the identical cell matrix).
 */
const WIDGET_BOX: Record<WidgetSize, { w: number; h: number }> = WIDGET_SPEC.boxSizesPt

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function addDaysIso(iso: string, delta: number): string {
  const parts = iso.split('-').map(Number)
  const dt = new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1)
  dt.setDate(dt.getDate() + delta)
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
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
  maxWidth,
}: {
  size: WidgetSize
  label: string
  payload: AuspiceDayPayload
  livePhase: number | undefined
  previewBg: string
  /** Available content width — previews scale down to fit narrow screens. */
  maxWidth: number
}) {
  const { colors } = useTheme()
  const isAndroid = Platform.OS === 'android'
  const box = WIDGET_BOX[size]
  const scale = Math.min(1, maxWidth / box.w)
  const scaledW = Math.round(box.w * scale)
  const scaledH = Math.round(box.h * scale)
  return (
    <View style={{ gap: 6, alignItems: 'center' }}>
      <View
        style={{
          width: scaledW,
          height: scaledH,
          // Corner radii come from the shared spec: iOS 22pt (WidgetKit system
          // mask), Android 16dp (systemAppWidgetBackgroundRadius). MIUI/HyperOS
          // ignores the Android mask and shows square, but most devices round.
          borderRadius: isAndroid
            ? Math.round(WIDGET_SPEC.cornerRadiusPt.android * scale)
            : Math.round(WIDGET_SPEC.cornerRadiusPt.ios * scale),
          overflow: 'hidden',
          backgroundColor: previewBg,
        }}
      >
        <View
          style={{
            width: box.w,
            height: box.h,
            transform: [{ scale }],
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
            variant={isAndroid ? 'android' : 'ios'}
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
      <Text
        style={{ color: text, fontSize: 11, fontWeight: '600', letterSpacing: 1 }}
        numberOfLines={1}
      >
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
          <Text
            style={{ color: text, fontSize: 13, fontWeight: '600', letterSpacing: 1 }}
            numberOfLines={1}
          >
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
      <Text
        style={{ color: text, fontSize: 12, fontWeight: '600', letterSpacing: 1 }}
        numberOfLines={1}
      >
        {ganZhi}
      </Text>
    </View>
  )
}

/**
 * iPhone Lock Screen mock — portrait phone frame (Dynamic Island + top clock)
 * so it reads unmistakably as the iPhone lock screen, NOT a watch face:
 *   Dynamic Island → inline widget → big clock → date → circular + rectangular
 *   widgets near the bottom. Lock Screen widgets are an iPhone feature (iOS 17+);
 *   the Apple Watch complications have their own section below.
 */
function LockScreenMock({
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
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return (
    <View
      style={{
        width: 148,
        height: 252,
        borderRadius: 32,
        borderWidth: 0.5,
        borderColor: border,
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 14,
        gap: 6,
        alignItems: 'center',
      }}
    >
      {/* Dynamic Island */}
      <View
        style={{
          width: 44,
          height: 12,
          borderRadius: 6,
          backgroundColor: border,
          opacity: 0.7,
        }}
      />

      {/* Inline widget — sits above the clock. iOS inline widgets are borderless text. */}
      <View
        style={{
          alignSelf: 'stretch',
          height: 22,
          paddingHorizontal: 8,
          justifyContent: 'center',
          marginTop: 6,
        }}
      >
        <Text style={{ color: text, fontSize: 10 }} numberOfLines={1}>
          {yiLine}
        </Text>
      </View>

      {/* Clock + date */}
      <Text style={{ color: text, fontSize: 38, fontWeight: '200', letterSpacing: 2 }}>
        {hh}:{mm}
      </Text>
      <Text style={{ color: dim, fontSize: 10 }}>
        {ganZhi}
        {solarTerm ? ` · ${solarTerm}` : ''}
      </Text>

      <View style={{ flex: 1 }} />

      {/* Circular + rectangular widgets near the bottom. iOS lock-screen widgets
          are borderless with NO background fill — bare glyphs and text. */}
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
          alignSelf: 'stretch',
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          <PhaseLogo phase={phase} size={12} />
          <Text
            style={{ color: text, fontSize: 10, fontWeight: '600', letterSpacing: 1 }}
            numberOfLines={1}
          >
            {ganZhi}
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            height: 48,
            paddingHorizontal: 8,
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <Text
            style={{ color: text, fontSize: 12, fontWeight: '600', letterSpacing: 1 }}
            numberOfLines={1}
          >
            {ganZhi}
          </Text>
          <Text style={{ color: dim, fontSize: 10 }} numberOfLines={1}>
            {yiLine}
          </Text>
        </View>
      </View>
    </View>
  )
}

export function WatchSettings() {
  const { colors, spacing, mode } = useTheme()
  const surfaceMode = mode === 'light' ? 'light' : 'dark'
  const { t, locale } = useStrings()
  const [payload, setPayload] = useState<AuspiceDayPayload | null>(null)
  const { phase: phaseOverride, setPhase: setPhaseOverride } = useDevMoonPhase()
  const [dayOffset, setDayOffset] = useState(0)

  useEffect(() => {
    const iso = todayIso()
    getAuspiceBirthDate()
      .then((b) => fetchAuspiceDay(iso, b))
      .then(setPayload)
      .catch(() => {})
  }, [])

  const followSystemDate = useCallback(() => {
    setDayOffset(0)
    setPhaseOverride(null)
    void getAuspiceBirthDate().then((birthDate) =>
      syncWidgetWindow(todayIso(), t, locale, Boolean(birthDate))
    )
  }, [setPhaseOverride, t, locale])

  const previewDayIso = useMemo(() => addDaysIso(todayIso(), dayOffset), [dayOffset])
  const livePhase = phaseOverride ?? moonPhaseForIsoDate(previewDayIso)
  const previewBg = widgetSurfaceBg(surfaceMode)
  const { width: windowWidth } = useWindowDimensions()
  // Page content width (display.tsx pads spacing.xl on both sides); cap at the
  // widest widget box so the large preview never overflows narrow screens.
  const maxPreviewWidth = Math.max(120, Math.min(WIDGET_BOX.large.w, windowWidth - spacing.xl * 2))
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
  const { mode: yijiMode } = useYijiDisplayMode()
  const yiShort = model
    ? compactVerbs(model.goodForRaw, locale === 'en' ? 1 : 2, locale, yijiMode)
    : '—'
  const yiLine = `宜 ${yiShort}`
  const phase = livePhase ?? model?.moonPhase ?? 0.5

  return (
    <View style={{ gap: spacing.lg }}>
      {payload ? (
        <>
          {/* 桌面组件 — both platforms. Android ships home widgets only.
              Vertical stack: 小 → 中 → 大, scaled to the screen width. */}
          <View style={{ gap: spacing.sm }}>
            <Label>{t.widgetPreviewCaption}</Label>
            <View style={{ gap: spacing.md, alignItems: 'center', paddingVertical: 4 }}>
              {(['small', 'medium', 'large'] as const).map((size) => (
                <ScaledWidgetPreview
                  key={size}
                  size={size}
                  label={sizeLabel(size)}
                  payload={payload}
                  livePhase={livePhase}
                  previewBg={previewBg}
                  maxWidth={maxPreviewWidth}
                />
              ))}
            </View>
          </View>

          {Platform.OS === 'ios' ? (
            <>
              {/* 锁屏 — iOS only (Lock Screen widgets, iOS 17+). */}
              <View style={{ gap: spacing.sm }}>
                <Label>{t.widgetLockCaption}</Label>
                <LockScreenMock
                  ganZhi={ganZhi}
                  solarTerm={solarTerm}
                  yiLine={yiLine}
                  phase={phase}
                  border={colors.separator}
                  text={colors.text}
                  dim={colors.dim}
                />
              </View>

              {/* Apple Watch — iOS only. */}
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
                    <InlineSlotPreview
                      yiLine={yiLine}
                      border={colors.separator}
                      text={colors.text}
                    />
                    <SlotCaption>{t.watchSlotInline}</SlotCaption>
                  </View>
                  <View style={{ gap: 6, alignItems: 'center' }}>
                    <CornerSlotPreview
                      ganZhi={ganZhi}
                      border={colors.separator}
                      text={colors.text}
                    />
                    <SlotCaption>{t.watchSlotCorner}</SlotCaption>
                  </View>
                </View>
              </View>
            </>
          ) : null}
        </>
      ) : null}

      {__DEV__ ? (
        <View style={{ gap: spacing.sm }}>
          <Label>{t.devMoonPhaseLabel}</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <Pressable
              onPress={followSystemDate}
              accessibilityRole='button'
              accessibilityState={{ selected: phaseOverride === null && dayOffset === 0 }}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: 6,
                borderRadius: 14,
                borderWidth: phaseOverride === null && dayOffset === 0 ? 1 : 0.5,
                borderColor:
                  phaseOverride === null && dayOffset === 0 ? colors.accent : colors.separator,
                backgroundColor:
                  phaseOverride === null && dayOffset === 0 ? colors.accentGhost : 'transparent',
              }}
            >
              <Text
                style={{
                  color: phaseOverride === null && dayOffset === 0 ? colors.accent : colors.text,
                  fontSize: 13,
                }}
              >
                {t.devMoonPhaseLive}
              </Text>
            </Pressable>
            {(
              [
                { label: t.devMoonPhaseNew, value: 0 },
                { label: t.devMoonPhaseFirst, value: 0.25 },
                { label: t.devMoonPhaseFull, value: 0.5 },
                { label: t.devMoonPhaseLast, value: 0.75 },
              ] as const
            ).map((opt) => {
              const sel = phaseOverride === opt.value
              return (
                <Pressable
                  key={opt.label}
                  onPress={() => {
                    setDayOffset(0)
                    setPhaseOverride(opt.value)
                  }}
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
          <Label>{t.devMoonPhaseDayScrub}</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {([-3, -2, -1, 0, 1, 2, 3] as const).map((off) => {
              const iso = addDaysIso(todayIso(), off)
              const dayPhase = moonPhaseForIsoDate(iso)
              const sel =
                off === 0
                  ? phaseOverride === null && dayOffset === 0
                  : phaseOverride != null && Math.abs(phaseOverride - dayPhase) < 0.0005
              const label = off === 0 ? t.devMoonPhaseDayToday : off > 0 ? `+${off}` : `${off}`
              return (
                <Pressable
                  key={off}
                  onPress={() => {
                    setDayOffset(off)
                    if (off === 0) {
                      followSystemDate()
                    } else {
                      setPhaseOverride(dayPhase)
                    }
                  }}
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
                    {label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <PhaseLogo phase={phase} size={36} />
            <Text style={{ color: colors.dim, fontSize: 11, lineHeight: 16, flex: 1 }}>
              {previewDayIso} · phase {phase.toFixed(3)}
              {'\n'}
              {t.devMoonPhaseHint}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  )
}
