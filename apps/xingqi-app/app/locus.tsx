/**
 * /locus — fullscreen form-map viewer. Pinch/pan zoom + tappable light spots.
 * Detail uses @gorhom/bottom-sheet (snap + drag dismiss).
 */

import BottomSheet, {
  type BottomSheetBackdropProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet'
import { useTheme } from '@zhop/core-ui'
import { fetchReadingById } from '@zhop/portfolio-client'
import * as Haptics from 'expo-haptics'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { X } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { locusExplorerCopy } from '@/components/HomeLocusExplorer'
import { LocusSheetContent } from '@/components/LocusSheet'
import { LocusStarLayer } from '@/components/LocusStarLayer'
import { XingqiLoader } from '@/components/XingqiLoader'
import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { resolveLocale } from '@/lib/i18n'
import { usePhotoImageSize } from '@/lib/image-stage-layout'
import { locusViewerCopy } from '@/lib/living-copy'
import { pickUi } from '@/lib/locale-zh'
import {
  type LocusExplorerData,
  type LocusPart,
  type LocusStar,
  locusExplorerFromResultJson,
  palmPointDebugSources,
  starsForPart,
} from '@/lib/locus-data'
import { openReadingScreen } from '@/lib/open-reading'
import { ALL_CAPTURE_PARTS } from '@/lib/photo-parts'
import { setHomeCaptureHandoff } from '@/lib/home-capture-handoff'
import { shouldOpenBriefCard } from '@/lib/reading-brief'
import { resolveReadingPhotoUri } from '@/lib/reading-photos'
import {
  locusMarkerAccentForSkinTone,
  parseFaceSkinTone,
} from '@/lib/skin-tone-marker'

const MIN_SCALE = 1
const MAX_SCALE = 4

function isLocusPart(v: string | undefined): v is LocusPart {
  return v === 'palm_l' || v === 'palm_r' || v === 'face'
}

/**
 * Dim only — never capture hits. Stock BottomSheetBackdrop flips
 * pointerEvents to `auto` once the sheet opens, which blocks star swaps
 * even with enableTouchThrough.
 */
function LocusPassThroughBackdrop({ animatedIndex, style }: BottomSheetBackdropProps) {
  const { colors } = useTheme()
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(animatedIndex.value, [-1, 0], [0, 1], Extrapolation.CLAMP),
  }))
  return (
    <Animated.View
      pointerEvents='none'
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, style, animatedStyle]}
    />
  )
}

export default function LocusViewerScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const locale = resolveLocale()
  const s = (hans: string, hant: string, en: string, ja?: string) =>
    pickUi(locale, hans, hant, en, ja)
  const copy = useMemo(() => locusExplorerCopy(locale), [locale])
  const viewerCopy = useMemo(() => locusViewerCopy(locale), [locale])

  const params = useLocalSearchParams<{ readingId?: string; part?: string }>()
  const readingId = typeof params.readingId === 'string' ? params.readingId : undefined
  const initialPart: LocusPart = isLocusPart(params.part) ? params.part : 'face'

  const [data, setData] = useState<LocusExplorerData | null>(null)
  const [resultJson, setResultJson] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [part, setPart] = useState<LocusPart>(initialPart)
  const [availableParts, setAvailableParts] = useState<LocusPart[]>(['face'])
  const [photoUri, setPhotoUri] = useState<string | undefined>()
  const photoSize = usePhotoImageSize(photoUri)
  const [selected, setSelected] = useState<LocusStar | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const sheetRef = useRef<BottomSheet>(null)
  const snapPoints = useMemo(() => ['32%', '52%', '74%'], [])

  const stageSide = useMemo(() => Math.min(width, Math.max(240, height * 0.58)), [width, height])

  const markerAccent = useMemo(() => {
    if (!data) return colors.accent
    return locusMarkerAccentForSkinTone(parseFaceSkinTone(data.features.face.skinTone))
  }, [data, colors.accent])

  const scale = useSharedValue(1)
  const savedScale = useSharedValue(1)
  const tx = useSharedValue(0)
  const ty = useSharedValue(0)
  const savedTx = useSharedValue(0)
  const savedTy = useSharedValue(0)

  const resetZoom = useCallback(() => {
    scale.value = withTiming(1, { duration: 180 })
    savedScale.value = 1
    tx.value = withTiming(0, { duration: 180 })
    ty.value = withTiming(0, { duration: 180 })
    savedTx.value = 0
    savedTy.value = 0
  }, [scale, savedScale, tx, ty, savedTx, savedTy])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!readingId) {
        setLoading(false)
        return
      }
      try {
        const detail = await fetchReadingById(PORTFOLIO_TARGET_APP, readingId)
        if (cancelled) return
        setResultJson(detail.reading.resultJson ?? null)
        setData(locusExplorerFromResultJson(detail.reading))
      } catch {
        if (!cancelled) {
          setData(null)
          setResultJson(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [readingId])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!readingId) {
        setAvailableParts(['face'])
        return
      }
      const found: LocusPart[] = []
      for (const p of ALL_CAPTURE_PARTS) {
        const uri = await resolveReadingPhotoUri(readingId, p, { fallbackLive: true })
        if (uri) found.push(p)
      }
      if (cancelled) return
      const next = found.length > 0 ? found : (['face'] as LocusPart[])
      setAvailableParts(next)
      if (!next.includes(part)) setPart(next[0] ?? 'face')
    })()
    return () => {
      cancelled = true
    }
  }, [readingId])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const uri = await resolveReadingPhotoUri(readingId, part, { fallbackLive: true })
      if (!cancelled) setPhotoUri(uri)
    })()
    return () => {
      cancelled = true
    }
  }, [readingId, part])

  useEffect(() => {
    resetZoom()
    setSheetOpen(false)
    setSelected(null)
    sheetRef.current?.close()
  }, [part, resetZoom])

  // Do not re-snap on every render while open — star swaps only update `selected`.
  useEffect(() => {
    if (!sheetOpen) {
      sheetRef.current?.close()
    }
  }, [sheetOpen])

  const stars = useMemo(() => (data ? starsForPart(data, part) : []), [data, part])
  const debugSources = useMemo(() => {
    if (!__DEV__ || !data || (part !== 'palm_l' && part !== 'palm_r')) return null
    return palmPointDebugSources(data, part)
  }, [data, part])

  const selectPart = useCallback(
    async (next: LocusPart) => {
      if (next === part) return
      await Haptics.selectionAsync()
      setPart(next)
    },
    [part]
  )

  const sheetOpenRef = useRef(false)
  sheetOpenRef.current = sheetOpen

  const openStar = useCallback(async (star: LocusStar) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelected(star)
    // Keep sheet open on star swap — only snap open if closed.
    if (!sheetOpenRef.current) {
      setSheetOpen(true)
      sheetRef.current?.snapToIndex(0)
    }
  }, [])

  const closeSheet = useCallback(() => {
    setSheetOpen(false)
    setSelected(null)
    sheetRef.current?.close()
  }, [])

  const pinch = Gesture.Pinch()
    .enabled(!sheetOpen)
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, savedScale.value * e.scale))
    })
    .onEnd(() => {
      savedScale.value = scale.value
      if (scale.value <= 1.02) {
        scale.value = withTiming(1)
        savedScale.value = 1
        tx.value = withTiming(0)
        ty.value = withTiming(0)
        savedTx.value = 0
        savedTy.value = 0
      }
    })

  const pan = Gesture.Pan()
    .enabled(!sheetOpen)
    .manualActivation(true)
    .averageTouches(true)
    .onTouchesMove((_e, state) => {
      if (savedScale.value > 1.05) state.activate()
      else state.fail()
    })
    .onUpdate((e) => {
      tx.value = savedTx.value + e.translationX
      ty.value = savedTy.value + e.translationY
    })
    .onEnd(() => {
      savedTx.value = tx.value
      savedTy.value = ty.value
    })

  const composed = Gesture.Simultaneous(pinch, pan)

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }))

  const segments: Array<{ part: LocusPart; label: string }> = useMemo(() => {
    const label = (p: LocusPart) =>
      p === 'palm_l' ? copy.palmL : p === 'palm_r' ? copy.palmR : copy.face
    return availableParts.map((p) => ({ part: p, label: label(p) }))
  }, [availableParts, copy])

  const openChapter = () => {
    if (!readingId) return
    let useBrief = false
    if (resultJson?.trim()) {
      try {
        useBrief = shouldOpenBriefCard(JSON.parse(resultJson) as Record<string, unknown>)
      } catch {
        useBrief = false
      }
    }
    if (useBrief) {
      openReadingScreen({ readingId, resultJson, replace: true })
      return
    }
    router.replace({
      pathname: '/result',
      params: { readingId, chapter: part === 'face' ? 'face' : 'palms' },
    } as never)
  }

  const startNewPeriod = () => {
    setHomeCaptureHandoff()
    router.replace('/(app)' as never)
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole='button'
          accessibilityLabel={s('关闭', '關閉', 'Close')}
        >
          <X size={24} color={colors.text} strokeWidth={1.6} />
        </Pressable>
      </View>

      {segments.length > 1 ? (
        <View
          style={{
            flexDirection: 'row',
            marginHorizontal: spacing.xl,
            borderWidth: 0.5,
            borderColor: colors.separator,
          }}
        >
          {segments.map((seg, i) => {
            const active = seg.part === part
            return (
              <Pressable
                key={seg.part}
                onPress={() => void selectPart(seg.part)}
                accessibilityRole='button'
                accessibilityState={{ selected: active }}
                style={{
                  flex: 1,
                  paddingVertical: 11,
                  alignItems: 'center',
                  backgroundColor: active ? colors.separator : 'transparent',
                  borderLeftWidth: i === 0 ? 0 : 0.5,
                  borderLeftColor: colors.separator,
                }}
              >
                <Text
                  style={{
                    color: active ? colors.text : colors.dim,
                    fontSize: 13,
                    letterSpacing: 0.6,
                    fontWeight: active ? '600' : '400',
                  }}
                >
                  {seg.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      ) : null}

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {loading ? (
          <XingqiLoader label={s('加载中', '載入中', 'Loading')} />
        ) : photoUri ? (
          <View
            style={{
              width: stageSide,
              height: stageSide,
              overflow: 'hidden',
              backgroundColor: colors.bg,
              borderWidth: 0.5,
              borderColor: colors.separator,
            }}
          >
            <GestureDetector gesture={composed}>
              <Animated.View style={[{ width: '100%', height: '100%' }, zoomStyle]}>
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode='contain'
                />
                {stars.length > 0 && photoSize ? (
                  <LocusStarLayer
                    stars={stars}
                    stageW={stageSide}
                    stageH={stageSide}
                    imageSize={photoSize}
                    accent={markerAccent}
                    selectedKey={sheetOpen ? selected?.featureKey : null}
                    debugSources={debugSources}
                    onSelect={(star) => void openStar(star)}
                  />
                ) : null}
              </Animated.View>
            </GestureDetector>
          </View>
        ) : (
          <Pressable
            onPress={startNewPeriod}
            style={{
              width: stageSide,
              height: stageSide,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 0.5,
              borderColor: colors.separator,
              padding: spacing.lg,
            }}
          >
            <Text style={{ color: colors.dim, fontSize: 13, textAlign: 'center' }}>
              {copy.noPhoto}
            </Text>
          </Pressable>
        )}

        <Text
          style={{
            color: colors.dim,
            fontSize: 12,
            lineHeight: 17,
            marginTop: spacing.md,
            paddingHorizontal: spacing.xl,
            textAlign: 'center',
          }}
        >
          {stars.length > 0 ? copy.tapHint : copy.noStars}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          gap: spacing.sm,
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + spacing.md,
          paddingTop: spacing.sm,
          opacity: sheetOpen ? 0 : 1,
        }}
        pointerEvents={sheetOpen ? 'none' : 'auto'}
      >
        <Pressable
          onPress={startNewPeriod}
          accessibilityRole='button'
          style={{
            flex: 1,
            paddingVertical: 14,
            borderWidth: 0.5,
            borderColor: colors.separator,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.secondary, fontSize: 13, letterSpacing: 0.4 }}>
            {viewerCopy.newPeriod}
          </Text>
        </Pressable>
        <Pressable
          onPress={openChapter}
          accessibilityRole='button'
          style={{
            flex: 1,
            paddingVertical: 14,
            borderWidth: 0.5,
            borderColor: colors.accent,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: 'IBMPlexMono',
              color: colors.accent,
              fontSize: 12,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
            }}
          >
            {viewerCopy.openChapter}
          </Text>
        </Pressable>
      </View>

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableHandlePanningGesture
        enableContentPanningGesture
        enableOverDrag={false}
        animateOnMount
        enableDynamicSizing={false}
        onClose={closeSheet}
        backdropComponent={LocusPassThroughBackdrop}
        backgroundStyle={{ backgroundColor: colors.bg }}
        handleIndicatorStyle={{ backgroundColor: colors.separator, width: 36 }}
        style={{ zIndex: 40 }}
        containerStyle={{ pointerEvents: 'box-none' }}
      >
        <BottomSheetScrollView>
          <LocusSheetContent
            star={selected}
            locale={locale}
            openReportLabel={copy.openReport}
            teachingLabel={copy.teaching}
            readingLabel={copy.reading}
            noReadingHint={copy.noReading}
            colors={colors}
            onClose={closeSheet}
            onOpenReport={() => {
              closeSheet()
              openChapter()
            }}
          />
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  )
}
