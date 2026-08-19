/**
 * Home period wheel — vertical iOS-picker of local photo stacks.
 * Center fans open; neighbors stay stacked. Index 0 may be a capture draft.
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
import type { CapturePart } from '@/lib/reading-draft'
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

const PARTS: CapturePart[] = ['palm_l', 'palm_r', 'face']

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
    }
  })
  const rotStyle = useAnimatedStyle(() => {
    const pose = polaroidPoses(wheelSpread(index - scroll.value), boxW, cardW)[part]
    return {
      transform: [{ rotate: `${pose.rotateDeg}deg` }],
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
      <Animated.View style={[{ flex: 1 }, rotStyle]}>
        <PolaroidChrome onPress={onPress}>
          {uri && !draft ? (
            <LocalPhoto uri={uri} style={{ width: '100%', height: '100%' }} />
          ) : (
            <PolaroidGhost />
          )}
        </PolaroidChrome>
      </Animated.View>
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
  onPressPart,
  onPressLabel,
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
  onPressPart: (readingId: string, part: CapturePart, hasPhoto: boolean) => void
  onPressLabel?: (readingId: string) => void
  onPressDraft: () => void
}) {
  const [uris, setUris] = useState<Partial<Record<CapturePart, string>>>({})
  const cardW = POLAROID_CARD_W
  const cardH = POLAROID_CARD_H
  const draft = Boolean(item.draft)

  useEffect(() => {
    if (draft) {
      setUris({})
      return
    }
    let cancelled = false
    void (async () => {
      const next: Partial<Record<CapturePart, string>> = {}
      for (const part of PARTS) {
        const uri = await resolveReadingPhotoUri(item.id, part, { fallbackLive: false })
        if (uri) next[part] = uri
      }
      if (!cancelled) setUris(next)
    })()
    return () => {
      cancelled = true
    }
  }, [item.id, revision, draft])

  const rowStyle = useAnimatedStyle(() => {
    const d = index - scroll.value
    return {
      transform: [{ translateY: d * WHEEL_ROW_GAP }, { scale: wheelRowScale(d) }],
      opacity: wheelRowOpacity(d),
      zIndex: Math.round(20 - Math.abs(d) * 4),
    }
  })

  const metaStyle = useAnimatedStyle(() => ({
    opacity: wheelSpread(index - scroll.value),
  }))

  return (
    <Animated.View
      pointerEvents='box-none'
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          top: height / 2 - 134,
          height: 268,
          alignItems: 'center',
        },
        rowStyle,
      ]}
    >
      <Animated.View style={[{ maxWidth: 280, marginBottom: 10, alignItems: 'center' }, metaStyle]}>
        <Pressable
          onPress={() => {
            if (draft) onPressDraft()
            else onPressLabel?.(item.id)
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: 15,
              textAlign: 'center',
              fontFamily: 'IBMPlexMono',
            }}
          >
            {item.title}
          </Text>
          {item.excerpt ? (
            <Text
              numberOfLines={2}
              style={{
                marginTop: 4,
                color: colors.secondary,
                fontSize: 12,
                lineHeight: 17,
                textAlign: 'center',
              }}
            >
              {item.excerpt}
            </Text>
          ) : null}
        </Pressable>
      </Animated.View>
      <View
        pointerEvents='box-none'
        style={{ width: Math.min(POLAROID_FAN_W, boxW), height: cardH + 40 }}
      >
        {PARTS.map((part) => (
          <Polaroid
            key={part}
            part={part}
            uri={uris[part]}
            draft={draft}
            index={index}
            scroll={scroll}
            boxW={Math.min(POLAROID_FAN_W, boxW)}
            cardW={cardW}
            cardH={cardH}
            isDark={isDark}
            onPress={() => {
              if (draft) {
                onPressDraft()
                return
              }
              onPressPart(item.id, part, Boolean(uris[part]))
            }}
          />
        ))}
      </View>
    </Animated.View>
  )
}

export function PeriodPhotoWheel({
  items,
  revision,
  initialIndex = 0,
  onPressPart,
  onPressLabel,
  onPressDraft,
}: {
  items: WheelItem[]
  revision: number
  initialIndex?: number
  onPressPart: (readingId: string, part: CapturePart, hasPhoto: boolean) => void
  onPressLabel?: (readingId: string) => void
  onPressDraft: () => void
}) {
  const { colors, isDark } = useTheme()
  const [boxW, setBoxW] = useState(320)
  const [height, setHeight] = useState(420)
  const scroll = useSharedValue(initialIndex)
  const start = useSharedValue(0)
  const max = Math.max(0, items.length - 1)

  useEffect(() => {
    const next = Math.max(0, Math.min(max, initialIndex))
    scroll.value = next
  }, [initialIndex, max, items.length, scroll])

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
          setBoxW(e.nativeEvent.layout.width)
          setHeight(e.nativeEvent.layout.height)
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
            onPressPart={onPressPart}
            onPressLabel={onPressLabel}
            onPressDraft={onPressDraft}
          />
        ))}
      </View>
    </GestureDetector>
  )
}
