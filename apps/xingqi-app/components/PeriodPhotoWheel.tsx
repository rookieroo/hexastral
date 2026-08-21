/**
 * Home period wheel — vertical iOS-picker of local photo stacks.
 * Left date rail scrolls with each row; center fans open at focus.
 */

import { useTheme } from '@zhop/core-ui'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { Gesture, GestureDetector, Pressable } from 'react-native-gesture-handler'
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'

import { LocalPhoto } from '@/components/LocalPhoto'
import { PolaroidChrome, polaroidLift } from '@/components/PolaroidChrome'
import { PolaroidGhost } from '@/components/PolaroidGhost'
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
  onPress: () => void
}) {
  const posStyle = useAnimatedStyle(() => {
    const pose = polaroidPoses(wheelSpread(index - scroll.value), boxW, cardW)[part]
    return {
      left: pose.left,
      top: pose.top,
      zIndex: pose.z,
      transform: [{ rotate: `${pose.rotateDeg}deg` }, { scale: pose.scale }],
    }
  })

  return (
    <Animated.View
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
      <PolaroidChrome onPress={onPress}>
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
}: {
  item: WheelItem
  index: number
  scroll: SharedValue<number>
  boxW: number
  height: number
  revision: number
  colors: { card: string; separator: string; dim: string; text: string; secondary: string }
  isDark: boolean
  onPressReading?: (readingId: string) => void
  onPressDraft: () => void
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

  const open = () => {
    if (draft) onPressDraft()
    else onPressReading?.(item.id)
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
        <Pressable onPress={open} accessibilityRole='button' accessibilityLabel={item.title}>
          <Text
            numberOfLines={3}
            style={{
              color: colors.text,
              fontSize: 12,
              lineHeight: 16,
              fontFamily: 'IBMPlexMono',
              letterSpacing: 0.2,
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
          <Animated.View style={[{ maxWidth: fanW, marginTop: 6, paddingHorizontal: 4 }, excerptStyle]}>
            <Pressable onPress={open}>
              <Text
                numberOfLines={2}
                style={{
                  color: colors.secondary,
                  fontSize: 12,
                  lineHeight: 16,
                  textAlign: 'center',
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
  onPressReading?: (readingId: string) => void
  onPressDraft: () => void
}) {
  const { colors, isDark } = useTheme()
  const [boxW, setBoxW] = useState(320)
  const [height, setHeight] = useState(420)
  const scroll = useSharedValue(scrollIndex)
  const start = useSharedValue(0)
  const max = Math.max(0, items.length - 1)

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
      scroll.value = withSpring(target, { damping: 18, stiffness: 170 })
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
          />
        ))}
      </View>
    </GestureDetector>
  )
}
