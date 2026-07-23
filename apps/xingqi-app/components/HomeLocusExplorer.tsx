/**
 * Home locus explorer — photo stage + star points + sheet.
 * Pinch-zoom keeps landmarks locked to the image; no swipe-delete.
 */

import * as Haptics from 'expo-haptics'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Image, type LayoutChangeEvent, Pressable, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { LocusSheet } from '@/components/LocusSheet'
import { LocusStarLayer } from '@/components/LocusStarLayer'
import { isCjkZh, pickZh } from '@/lib/locale-zh'
import type { LocusExplorerData, LocusPart, LocusStar } from '@/lib/locus-data'
import { starsForPart } from '@/lib/locus-data'
import { resolveReadingPhotoUri } from '@/lib/reading-photos'
import { usePhotoImageSize } from '@/lib/image-stage-layout'

const STAGE_MAX = 280
const MIN_SCALE = 1
const MAX_SCALE = 3.2

type Segment = { part: LocusPart; label: string }

export function HomeLocusExplorer({
  data,
  copy,
  meta,
  colors,
  spacing,
  onOpenReport,
  onCapturePart,
}: {
  data: LocusExplorerData
  locale: string
  copy: {
    sectionLabel: string
    tapHint: string
    noPhoto: string
    noStars: string
    openReport: string
    teaching: string
    reading: string
    noReading: string
    palmL: string
    palmR: string
    face: string
  }
  meta: string
  colors: {
    bg: string
    text: string
    dim: string
    secondary: string
    accent: string
    separator: string
  }
  spacing: { md: number; lg: number; sm: number; xl: number }
  onOpenReport: (chapter?: 'face' | 'palms') => void
  onCapturePart: (part: LocusPart) => void
}) {
  const segments: Segment[] = useMemo(
    () => [
      { part: 'palm_l', label: copy.palmL },
      { part: 'palm_r', label: copy.palmR },
      { part: 'face', label: copy.face },
    ],
    [copy]
  )

  const [part, setPart] = useState<LocusPart>('face')
  const [photoUri, setPhotoUri] = useState<string | undefined>()
  const photoSize = usePhotoImageSize(photoUri)
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 })
  const [selected, setSelected] = useState<LocusStar | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const scale = useSharedValue(1)
  const savedScale = useSharedValue(1)
  const tx = useSharedValue(0)
  const ty = useSharedValue(0)
  const savedTx = useSharedValue(0)
  const savedTy = useSharedValue(0)

  const stars = useMemo(() => starsForPart(data, part), [data, part])

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
      const uri = await resolveReadingPhotoUri(data.readingId, part, { fallbackLive: true })
      if (!cancelled) setPhotoUri(uri)
    })()
    return () => {
      cancelled = true
    }
  }, [data.readingId, part])

  // Reset zoom + close sheet when switching palm/face slots.
  useEffect(() => {
    resetZoom()
    setSheetOpen(false)
    setSelected(null)
  }, [part, resetZoom])

  const onStageLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    if (width > 0 && height > 0) setStageSize({ w: width, h: height })
  }, [])

  const openStar = useCallback(async (star: LocusStar) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelected(star)
    setSheetOpen(true)
  }, [])

  const selectPart = useCallback(
    async (next: LocusPart) => {
      if (next === part) return
      await Haptics.selectionAsync()
      setPart(next)
    },
    [part]
  )

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, savedScale.value * e.scale))
      scale.value = next
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
      // Only claim pan when zoomed — leave horizontal swipe free for page nav.
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

  return (
    <View style={{ gap: spacing.md, position: 'relative' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: spacing.md,
        }}
      >
        <Text style={{ color: colors.dim, fontSize: 12, letterSpacing: 0.8 }}>
          {copy.sectionLabel}
        </Text>
        <Text
          style={{
            fontFamily: 'IBMPlexMono',
            color: colors.dim,
            fontSize: 10,
            letterSpacing: 1,
            textTransform: 'uppercase',
            flexShrink: 1,
          }}
          numberOfLines={1}
        >
          {meta}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
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
                  fontSize: 12,
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

      <View
        onLayout={onStageLayout}
        style={{
          width: '100%',
          maxHeight: STAGE_MAX,
          aspectRatio: 1,
          alignSelf: 'center',
          backgroundColor: colors.bg,
          borderWidth: 0.5,
          borderColor: colors.separator,
          overflow: 'hidden',
        }}
      >
        {photoUri ? (
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
                  stageW={stageSize.w}
                  stageH={stageSize.h}
                  imageSize={photoSize}
                  accent={colors.accent}
                  selectedKey={sheetOpen ? selected?.featureKey : null}
                  onSelect={(s) => void openStar(s)}
                />
              ) : null}
            </Animated.View>
          </GestureDetector>
        ) : (
          <Pressable
            onPress={() => onCapturePart(part)}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              padding: spacing.lg,
            }}
          >
            <Text style={{ color: colors.dim, fontSize: 13, textAlign: 'center' }}>
              {copy.noPhoto}
            </Text>
          </Pressable>
        )}
      </View>

      <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 17 }}>
        {stars.length > 0 ? copy.tapHint : copy.noStars}
      </Text>

      {sheetOpen ? (
        <View style={{ marginHorizontal: -spacing.md }}>
          <LocusSheet
            visible
            star={selected}
            locale={data.locale ?? 'zh'}
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
              onOpenReport(part === 'face' ? 'face' : 'palms')
            }}
          />
        </View>
      ) : null}
    </View>
  )
}

export function locusExplorerCopy(locale: string): {
  sectionLabel: string
  tapHint: string
  noPhoto: string
  noStars: string
  openReport: string
  teaching: string
  reading: string
  noReading: string
  palmL: string
  palmR: string
  face: string
} {
  if (locale.startsWith('ja')) {
    return {
      sectionLabel: '形気対照',
      tapHint: '光点をタップ · ピンチで拡大',
      noPhoto: 'このスロットの写真がありません。タップして撮影',
      noStars: 'この図では部位座標がありません · 再撮影で抽出',
      openReport: 'レポートを開く',
      teaching: '部位の意味',
      reading: '本期の読み',
      noReading: 'この部位の読みはレポート本章に',
      palmL: '左掌',
      palmR: '右掌',
      face: '面',
    }
  }
  if (isCjkZh(locale)) {
    return {
      sectionLabel: pickZh(locale, '形气对照', '形氣對照'),
      tapHint: pickZh(locale, '点光斑查看 · 双指缩放', '點光斑查看 · 雙指縮放'),
      noPhoto: pickZh(locale, '尚无此图 · 点此拍摄', '尚無此圖 · 點此拍攝'),
      noStars: pickZh(
        locale,
        '此图尚无部位坐标 · 请重新拍摄提取',
        '此圖尚無部位座標 · 請重新拍攝提取'
      ),
      openReport: pickZh(locale, '打开完整报告', '打開完整報告'),
      teaching: pickZh(locale, '部位含义', '部位含義'),
      reading: pickZh(locale, '本期读法', '本期讀法'),
      noReading: pickZh(locale, '完整论断见报告本章', '完整論斷見報告本章'),
      palmL: '左掌',
      palmR: '右掌',
      face: '面',
    }
  }
  return {
    sectionLabel: 'Form map',
    tapHint: 'Tap a light spot · pinch to zoom',
    noPhoto: 'No photo for this slot · tap to capture',
    noStars: 'No landmark coords on this view · re-capture to extract',
    openReport: 'Open full report',
    teaching: 'What this locus means',
    reading: 'This reading',
    noReading: 'Full reading is in the report chapter',
    palmL: 'L palm',
    palmR: 'R palm',
    face: 'Face',
  }
}
