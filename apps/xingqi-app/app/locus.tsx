/**
 * /locus — fullscreen form-map viewer. Big square stage + pinch/pan zoom +
 * tappable light spots (LocusStarLayer/LocusSheet). Part chips switch 左掌/右掌/面.
 * Replaces the cramped in-card tab explorer so zoom is comfortable.
 */

import { useTheme } from '@zhop/core-ui'
import { fetchReadingById } from '@zhop/portfolio-client'
import * as Haptics from 'expo-haptics'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { X } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Image, Pressable, Text, useWindowDimensions, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { locusExplorerCopy } from '@/components/HomeLocusExplorer'
import { LocusSheet } from '@/components/LocusSheet'
import { LocusStarLayer } from '@/components/LocusStarLayer'
import { XingqiLoader } from '@/components/XingqiLoader'
import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { resolveLocale } from '@/lib/i18n'
import { locusViewerCopy } from '@/lib/living-copy'
import { isCjkZh, pickZh } from '@/lib/locale-zh'
import {
  type LocusExplorerData,
  type LocusPart,
  type LocusStar,
  locusExplorerFromResultJson,
  starsForPart,
} from '@/lib/locus-data'
import { captureHrefForPart } from '@/lib/period-photos'
import { resolveReadingPhotoUri } from '@/lib/reading-photos'

const MIN_SCALE = 1
const MAX_SCALE = 4

function isLocusPart(v: string | undefined): v is LocusPart {
  return v === 'palm_l' || v === 'palm_r' || v === 'face'
}

export default function LocusViewerScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const locale = resolveLocale()
  const s = (hans: string, hant: string, en: string) =>
    isCjkZh(locale) ? pickZh(locale, hans, hant) : en
  const copy = useMemo(() => locusExplorerCopy(locale), [locale])
  const viewerCopy = useMemo(() => locusViewerCopy(locale), [locale])

  const params = useLocalSearchParams<{ readingId?: string; part?: string }>()
  const readingId = typeof params.readingId === 'string' ? params.readingId : undefined
  const initialPart: LocusPart = isLocusPart(params.part) ? params.part : 'face'

  const [data, setData] = useState<LocusExplorerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [part, setPart] = useState<LocusPart>(initialPart)
  const [photoUri, setPhotoUri] = useState<string | undefined>()
  const [selected, setSelected] = useState<LocusStar | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const stageSide = useMemo(() => Math.min(width, Math.max(240, height * 0.62)), [width, height])

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
        setData(locusExplorerFromResultJson(detail.reading))
      } catch {
        if (!cancelled) setData(null)
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
  }, [part, resetZoom])

  const stars = useMemo(() => (data ? starsForPart(data, part) : []), [data, part])

  const selectPart = useCallback(
    async (next: LocusPart) => {
      if (next === part) return
      await Haptics.selectionAsync()
      setPart(next)
    },
    [part]
  )

  const openStar = useCallback(async (star: LocusStar) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelected(star)
    setSheetOpen(true)
  }, [])

  const pinch = Gesture.Pinch()
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

  const segments: Array<{ part: LocusPart; label: string }> = [
    { part: 'palm_l', label: copy.palmL },
    { part: 'palm_r', label: copy.palmR },
    { part: 'face', label: copy.face },
  ]

  const openChapter = () => {
    if (!readingId) return
    router.replace({
      pathname: '/result',
      params: { readingId, chapter: part === 'face' ? 'face' : 'palms' },
    } as never)
  }

  const recapture = () => {
    router.push({ pathname: captureHrefForPart(part), params: { mode: 'slot' } } as never)
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
                  resizeMode='cover'
                />
                {stars.length > 0 ? (
                  <LocusStarLayer
                    stars={stars}
                    stageW={stageSide}
                    stageH={stageSide}
                    accent={colors.accent}
                    onSelect={(star) => void openStar(star)}
                  />
                ) : null}
              </Animated.View>
            </GestureDetector>
          </View>
        ) : (
          <Pressable
            onPress={recapture}
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
          onPress={recapture}
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
            {viewerCopy.recapture}
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

      {/* Always mounted while open — star swaps must not remount the shell. */}
      <View
        pointerEvents={sheetOpen ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 30,
          opacity: sheetOpen ? 1 : 0,
        }}
      >
        <LocusSheet
          visible={sheetOpen}
          star={selected}
          openReportLabel={copy.openReport}
          teachingLabel={copy.teaching}
          readingLabel={copy.reading}
          noReadingHint={copy.noReading}
          colors={colors}
          onClose={() => {
            setSheetOpen(false)
            setSelected(null)
          }}
          onOpenReport={() => {
            setSheetOpen(false)
            setSelected(null)
            openChapter()
          }}
        />
      </View>
    </View>
  )
}
