/**
 * Home period wheel — vertical iOS-picker of local photo stacks.
 * Left date rail scrolls with each row; center fans open at focus.
 */

import { useTheme } from '@zhop/core-ui'
import { spring, triggerHaptic } from '@zhop/core-ui'
import { useEffect, useRef, useState } from 'react'
import { Text, View } from 'react-native'
import { Gesture, GestureDetector, Pressable } from 'react-native-gesture-handler'
import Animated, {
  type SharedValue,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

import { LocalPhoto } from '@/components/LocalPhoto'
import { PolaroidChrome, polaroidLift } from '@/components/PolaroidChrome'
import { PolaroidGhost } from '@/components/PolaroidGhost'
import { setFlightSource } from '@/lib/shared-element-flight'
import { getReducedMotion } from '@/lib/reduced-motion'
import { periodPhotoMap } from '@/lib/period-photos'
import type { CapturePart } from '@/lib/reading-draft'
import { ALL_CAPTURE_PARTS, partsWithPhotoUris } from '@/lib/photo-parts'
import { resolveReadingPhotoUri } from '@/lib/reading-photos'
import {
  POLAROID_CARD_H,
  POLAROID_CARD_W,
  POLAROID_FAN_W,
  polaroidPoses,
  WHEEL_ROW_GAP,
  wheelRowOpacity,
  wheelRowScale,
  wheelSpread,
} from '@/lib/stack-layout'

const DATE_RAIL_W = 76

export type WheelItem = {
  id: string
  title: string
  excerpt: string
  draft?: boolean
}

function Polaroid({
  part,
  uri,
  draft,
  index,
  scroll,
  boxW,
  cardW,
  cardH,
  isDark,
  onPress,
}: {
  part: CapturePart
  uri?: string
  draft: boolean
  index: number
  scroll: SharedValue<number>
  boxW: number
  cardW: number
  cardH: number
  isDark: boolean
  onPress: (part: CapturePart, rect?: { x: number; y: number; w: number; h: number }) => void
}) {
  const pressed = useSharedValue(0)
  const cardRef = useRef<View | null>(null)
  const posStyle = useAnimatedStyle(() => {
    const pose = polaroidPoses(wheelSpread(index - scroll.value), boxW, cardW)[part]
    return {
      left: pose.left,
      top: pose.top,
      zIndex: pose.z,
      transform: [
        { translateY: pressed.value * -6 },
        { rotate: `${pose.rotateDeg}deg` },
        { scale: pose.scale * (1 - pressed.value * 0.05) },
      ],
    }
  })

  const pressIn = () => {
    pressed.value = withTiming(1, { duration: 120 })
  }
  const pressOut = () => {
    pressed.value = withTiming(0, { duration: 200 })
  }

  const handlePress = () => {
    // Measure on the JS thread — `measureInWindow` is more reliable than a UI
    // thread `measure` on first tap, and matches the report plate's coordinate
    // space (window coords). If it fails, open without a flight.
    const node = cardRef.current
    if (!node) {
      onPress(part)
      return
    }
    node.measureInWindow((x, y, w, h) => {
      if (w > 0 && h > 0) onPress(part, { x, y, w, h })
      else onPress(part)
    })
  }

  return (
    <Animated.View
      ref={cardRef}
      collapsable={false}
      style={[
        {
          position: 'absolute',
          width: cardW,
          height: cardH,
          ...polaroidLift(isDark),
        },
        posStyle,
      ]}
    >
      <PolaroidChrome onPress={handlePress} onPressIn={pressIn} onPressOut={pressOut}>
        {uri ? (
          <LocalPhoto
            uri={uri}
            style={{ width: '100%', height: '100%' }}
            cache={draft ? 'none' : 'memory-disk'}
          />
        ) : (
          <PolaroidGhost />
        )}
      </PolaroidChrome>
    </Animated.View>
  )
}

function WheelRow({
  item,
  index,
  scroll,
  boxW,
  height,
  revision,
  colors,
  isDark,
  onPressReading,
  onPressDraft,
  snapTo,
}: {
  item: WheelItem
  index: number
  scroll: SharedValue<number>
  boxW: number
  height: number
  revision: number
  colors: { card: string; separator: string; dim: string; text: string; secondary: string }
  isDark: boolean
  onPressReading?: (readingId: string, part: CapturePart) => void
  onPressDraft: (part: CapturePart) => void
  /** Snap the wheel so this row is focused. Used when a *non-focused* row is tapped. */
  snapTo: (index: number) => void
}) {
  const [uris, setUris] = useState<Partial<Record<CapturePart, string>>>({})
  const cardW = POLAROID_CARD_W
  const cardH = POLAROID_CARD_H
  const draft = Boolean(item.draft)
  const fanW = Math.min(POLAROID_FAN_W, Math.max(200, boxW - DATE_RAIL_W - 12))

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const next: Partial<Record<CapturePart, string>> = {}
      if (draft) {
        const map = await periodPhotoMap()
        const bust = `t=${revision}`
        if (map.palm_l) next.palm_l = `${map.palm_l}?${bust}`
        if (map.palm_r) next.palm_r = `${map.palm_r}?${bust}`
        if (map.face) next.face = `${map.face}?${bust}`
      } else {
        for (const part of ALL_CAPTURE_PARTS) {
          const uri = await resolveReadingPhotoUri(item.id, part, { fallbackLive: false })
          if (uri) next[part] = uri
        }
      }
      if (!cancelled) setUris(next)
    })()
    return () => {
      cancelled = true
    }
  }, [draft, item.id, revision])

  const rowStyle = useAnimatedStyle(() => {
    const d = index - scroll.value
    return {
      transform: [{ translateY: d * WHEEL_ROW_GAP }, { scale: wheelRowScale(d) }],
      opacity: wheelRowOpacity(d),
      zIndex: Math.round(20 - Math.abs(d) * 4),
    }
  })

  /** Date rail stays more opaque than the stack so the scale remains readable. */
  const railStyle = useAnimatedStyle(() => {
    const d = Math.abs(index - scroll.value)
    return { opacity: Math.max(0.42, 1 - 0.22 * Math.min(2.2, d)) }
  })

  const excerptStyle = useAnimatedStyle(() => ({
    opacity: wheelSpread(index - scroll.value),
  }))

  const open = (part: CapturePart = 'face', rect?: { x: number; y: number; w: number; h: number }) => {
    if (draft) {
      // Thread the tapped slot so capture opens with that part focused.
      onPressDraft(part)
      return
    }
    // Only open when this row is already focused; else snap the wheel here so a
    // tap on an off-focus photo scrolls it into place rather than jumping.
    if (Math.abs(index - scroll.value) > 0.18) {
      snapTo(index)
      return
    }
    // Focused — queue the shared-element flight from the tapped polaroid.
    const uri = uris[part]
    if (uri && rect && !getReducedMotion()) {
      setFlightSource({ uri, rect, readingId: item.id, part })
    }
    onPressReading?.(item.id, part)
  }

  return (
    <Animated.View
      pointerEvents='box-none'
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          top: height / 2 - 120,
          height: 240,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 10,
          paddingRight: 8,
        },
        rowStyle,
      ]}
    >
      <Animated.View style={[{ width: DATE_RAIL_W, paddingRight: 8 }, railStyle]}>
        <Pressable onPress={() => open()} accessibilityRole='button' accessibilityLabel={item.title}>
          <Text
            numberOfLines={2}
            style={{
              color: colors.dim,
              fontSize: 11,
              lineHeight: 14,
              fontFamily: 'IBMPlexMono',
              letterSpacing: 0.4,
            }}
          >
            {item.title}
          </Text>
        </Pressable>
      </Animated.View>

      <View style={{ flex: 1, alignItems: 'center' }}>
        <View pointerEvents='box-none' style={{ width: fanW, height: cardH + 28 }}>
          {(draft
            ? ALL_CAPTURE_PARTS
            : partsWithPhotoUris(uris).length > 0
              ? partsWithPhotoUris(uris)
              : (['face'] as CapturePart[])
          ).map((part) => (
            <Polaroid
              key={part}
              part={part}
              uri={uris[part]}
              draft={draft}
              index={index}
              scroll={scroll}
              boxW={fanW}
              cardW={cardW}
              cardH={cardH}
              isDark={isDark}
              onPress={open}
            />
          ))}
        </View>
        {item.excerpt ? (
          <Animated.View
            style={[{ maxWidth: fanW, marginTop: 10, paddingHorizontal: 6 }, excerptStyle]}
          >
            <Pressable onPress={() => open()}>
              <Text
                numberOfLines={2}
                style={{
                  color: colors.secondary,
                  fontFamily: 'CrimsonPro',
                  fontSize: 15,
                  lineHeight: 21,
                  textAlign: 'center',
                  letterSpacing: 0.4,
                }}
              >
                {item.excerpt}
              </Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </Animated.View>
  )
}

export function PeriodPhotoWheel({
  items,
  revision,
  scrollIndex = 0,
  onPressReading,
  onPressDraft,
}: {
  items: WheelItem[]
  revision: number
  scrollIndex?: number
  onPressReading?: (readingId: string, part: CapturePart) => void
  onPressDraft: (part: CapturePart) => void
}) {
  const { colors, isDark } = useTheme()
  const [boxW, setBoxW] = useState(320)
  const [height, setHeight] = useState(420)
  const scroll = useSharedValue(scrollIndex)
  const start = useSharedValue(0)
  const max = Math.max(0, items.length - 1)
  // Track the last snapped-to row so a settle onto a *different* row triggers a
  // light selection haptic (wheel-picker grammar). Same-row wraps (e.g. tap)
  // stay silent to avoid double-buzz with the press-in feedback.
  const settledRowRef = useRef(scrollIndex)

  const snapHaptic = (target: number) => {
    if (settledRowRef.current !== target) {
      settledRowRef.current = target
      triggerHaptic('selection')
    }
  }

  /** Snap the wheel so a tapped (off-focus) row becomes focused. */
  const snapTo = (index: number) => {
    const target = Math.max(0, Math.min(max, index))
    scroll.value = withSpring(target, spring.snap)
    runOnJS(snapHaptic)(target)
  }

  useEffect(() => {
    scroll.value = Math.max(0, Math.min(max, scrollIndex))
  }, [max, scrollIndex, scroll])

  const pan = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .failOffsetX([-28, 28])
    .onStart(() => {
      start.value = scroll.value
    })
    .onUpdate((e) => {
      const next = start.value - e.translationY / WHEEL_ROW_GAP
      scroll.value = Math.max(0, Math.min(max, next))
    })
    .onEnd((e) => {
      const projected = scroll.value - e.velocityY / WHEEL_ROW_GAP / 900
      const target = Math.round(Math.max(0, Math.min(max, projected)))
      scroll.value = withSpring(target, spring.snap)
      runOnJS(snapHaptic)(target)
    })

  return (
    <GestureDetector gesture={pan}>
      <View
        onLayout={(e) => {
          const { width, height: h } = e.nativeEvent.layout
          setBoxW((w) => (Math.abs(w - width) < 2 ? w : width))
          setHeight((prev) => (Math.abs(prev - h) < 2 ? prev : h))
        }}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        accessibilityRole='adjustable'
      >
        {items.map((item, index) => (
          <WheelRow
            key={item.id}
            item={item}
            index={index}
            scroll={scroll}
            boxW={boxW}
            height={height}
            revision={revision}
            colors={{
              card: colors.card,
              separator: colors.separator,
              dim: colors.secondary,
              text: colors.text,
              secondary: colors.secondary,
            }}
            isDark={isDark}
            onPressReading={onPressReading}
            onPressDraft={onPressDraft}
            snapTo={snapTo}
          />
        ))}
      </View>
    </GestureDetector>
  )
}
