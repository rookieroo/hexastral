/**
 * Offset polaroid stack — rectangular cards. Depth from offset / rotateZ / scale.
 */

import { useTheme } from '@zhop/core-ui'
import { useEffect, useState } from 'react'
import { Text, View, Pressable } from 'react-native'
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { Trash2 } from 'lucide-react-native'

import { LocalPhoto } from '@/components/LocalPhoto'
import { PolaroidChrome, polaroidLift } from '@/components/PolaroidChrome'
import { PolaroidGhost } from '@/components/PolaroidGhost'
import type { CapturePart } from '@/lib/reading-draft'
import { ALL_CAPTURE_PARTS, partsWithPhotoUris } from '@/lib/photo-parts'
import { resolveReadingPhotoUri } from '@/lib/reading-photos'
import {
  POLAROID_CARD_H,
  POLAROID_CARD_W,
  POLAROID_FAN_MS,
  POLAROID_FAN_W,
  POLAROID_RITUAL_MS,
  POLAROID_SELECT_MS,
  POLAROID_STACK_H,
  polaroidPoses,
} from '@/lib/stack-layout'

/** Ease-in-out — fan, ritual, and selection share one curve. */
const STACK_EASE = Easing.inOut(Easing.cubic)

function StackCard({
  part,
  uri,
  spread,
  ritual,
  cardW,
  cardH,
  fanW,
  isDark,
  label,
  labelColor,
  active,
  interactive,
  inkEnabled,
  showLabels,
  photoCache,
  ghostHint,
  onPressPart,
  onClearActive,
  clearAccessibilityLabel,
}: {
  part: CapturePart
  uri?: string
  spread: SharedValue<number>
  ritual: SharedValue<number>
  cardW: number
  cardH: number
  fanW: number
  isDark: boolean
  label: string
  labelColor: string
  active: boolean
  interactive: boolean
  inkEnabled: boolean
  showLabels: boolean
  photoCache: 'memory-disk' | 'none'
  ghostHint?: string
  onPressPart?: (part: CapturePart, hasPhoto: boolean) => void
  /** Shown under the active card when the slot can be cleared. */
  onClearActive?: () => void
  clearAccessibilityLabel?: string
}) {
  const lift = useSharedValue(0)
  // Always start unselected so auto-focus (Face) and tap both ease in — never snap.
  const selected = useSharedValue(0)

  useEffect(() => {
    selected.value = withTiming(active ? 1 : 0, {
      duration: POLAROID_SELECT_MS,
      easing: STACK_EASE,
    })
  }, [active, selected])

  const posStyle = useAnimatedStyle(() => {
    const pose = polaroidPoses(spread.value, fanW, cardW, ritual.value)[part]
    const k = lift.value
    const sel = selected.value
    const baseScale = pose.scale * (0.95 + sel * 0.14)
    return {
      left: pose.left,
      top: pose.top - sel * 18,
      zIndex: Math.round(pose.z + sel * 5),
      transform: [
        { translateY: k * -10 - sel * 6 },
        { rotate: `${pose.rotateDeg * (1 - sel * 0.12)}deg` },
        { scale: baseScale + k * 0.04 },
      ],
    }
  })
  const labelStyle = useAnimatedStyle(() => ({
    opacity: showLabels ? ritual.value : 0,
    transform: [{ translateY: (1 - ritual.value) * 8 }],
  }))

  const clearTop = cardH + (showLabels ? 24 : 10)

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: cardW,
          height: cardH,
          ...polaroidLift(isDark, poseLayer(part) + (active ? 2 : 0)),
        },
        posStyle,
      ]}
    >
      <PolaroidChrome
        active={active}
        interactive={interactive}
        accessibilityLabel={label}
        inkDrawn={inkEnabled ? ritual : undefined}
        onPress={() => onPressPart?.(part, Boolean(uri))}
        onPressIn={() => {
          lift.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) })
        }}
        onPressOut={() => {
          lift.value = withTiming(0, { duration: 280, easing: Easing.inOut(Easing.cubic) })
        }}
      >
        {uri ? (
          <LocalPhoto uri={uri} style={{ width: '100%', height: '100%' }} cache={photoCache} />
        ) : (
          <PolaroidGhost hint={part === 'face' ? ghostHint : undefined} />
        )}
      </PolaroidChrome>
      {showLabels ? (
        <Animated.View
          pointerEvents='none'
          style={[
            { position: 'absolute', left: 0, right: 0, top: cardH + 6, alignItems: 'center' },
            labelStyle,
          ]}
        >
          <Text style={{ color: labelColor, fontSize: 11, letterSpacing: 2 }}>{label}</Text>
        </Animated.View>
      ) : null}
      {active && onClearActive ? (
        <Pressable
          onPress={onClearActive}
          hitSlop={14}
          accessibilityRole='button'
          accessibilityLabel={clearAccessibilityLabel ?? label}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: clearTop,
            alignItems: 'center',
            paddingVertical: 6,
          }}
        >
          <Trash2 size={18} color={labelColor} strokeWidth={1.6} />
        </Pressable>
      ) : null}
    </Animated.View>
  )
}

function poseLayer(part: CapturePart): number {
  if (part === 'face') return 2
  if (part === 'palm_r') return 1
  return 0
}

export function OffsetPhotoStack({
  readingId,
  uris: urisProp,
  revision = 0,
  labels,
  activePart,
  spread = 1,
  ritual = 0,
  compact = false,
  inkEnabled = false,
  instantPose = false,
  interactive,
  photoCache = 'memory-disk',
  /** When true, omit parts with no URI (archive / annotation). Capture keeps false. */
  hideEmpty = false,
  onPressPart,
  onClearActive,
  clearAccessibilityLabel,
  ghostHint,
}: {
  readingId?: string
  uris?: Partial<Record<CapturePart, string>>
  revision?: number
  labels: { palmL: string; palmR: string; face: string }
  activePart?: CapturePart
  spread?: number
  ritual?: number
  compact?: boolean
  inkEnabled?: boolean
  instantPose?: boolean
  interactive?: boolean
  /** Period sandbox reuses paths — pass `none` with a busted URI. */
  photoCache?: 'memory-disk' | 'none'
  hideEmpty?: boolean
  onPressPart?: (part: CapturePart, hasPhoto: boolean) => void
  /** Trash under the active card when the slot can be cleared. */
  onClearActive?: () => void
  clearAccessibilityLabel?: string
  /** Label shown inside an empty well (e.g. 新一期). Only the face slot renders it. */
  ghostHint?: string
}) {
  const { isDark, colors } = useTheme()
  const [boxW, setBoxW] = useState(POLAROID_FAN_W)
  const [loaded, setLoaded] = useState<Partial<Record<CapturePart, string>>>({})
  const fanW = compact ? POLAROID_FAN_W : boxW
  const cardW = compact ? POLAROID_CARD_W : Math.min(124, Math.round(boxW * 0.34))
  const cardH = compact ? POLAROID_CARD_H : Math.round(cardW * (POLAROID_CARD_H / POLAROID_CARD_W))
  const uris = urisProp ?? loaded
  const visibleParts = hideEmpty
    ? partsWithPhotoUris(uris).length > 0
      ? partsWithPhotoUris(uris)
      : (['face'] as CapturePart[])
    : ALL_CAPTURE_PARTS
  const spreadSv = useSharedValue(spread)
  const ritualSv = useSharedValue(ritual)

  useEffect(() => {
    if (instantPose) {
      spreadSv.value = spread
      return
    }
    spreadSv.value = withTiming(spread, { duration: POLAROID_FAN_MS, easing: STACK_EASE })
  }, [instantPose, spread, spreadSv])

  useEffect(() => {
    if (instantPose) {
      ritualSv.value = ritual
      return
    }
    ritualSv.value = withTiming(ritual, {
      duration: POLAROID_RITUAL_MS,
      easing: STACK_EASE,
    })
  }, [instantPose, ritual, ritualSv])

  useEffect(() => {
    if (urisProp) return
    let cancelled = false
    void (async () => {
      const next: Partial<Record<CapturePart, string>> = {}
      for (const part of ALL_CAPTURE_PARTS) {
        const uri = await resolveReadingPhotoUri(readingId, part, { fallbackLive: true })
        if (uri) next[part] = uri
      }
      if (!cancelled) setLoaded(next)
    })()
    return () => {
      cancelled = true
    }
  }, [readingId, revision, urisProp])

  const labelFor = (part: CapturePart) =>
    part === 'palm_l' ? labels.palmL : part === 'palm_r' ? labels.palmR : labels.face
  const canPress = interactive ?? !compact

  return (
    <View
      onLayout={(e) => {
        if (!compact) setBoxW(e.nativeEvent.layout.width)
      }}
      style={{
        height: compact ? POLAROID_STACK_H : cardH + 40,
        width: compact ? POLAROID_FAN_W : '100%',
        alignSelf: 'center',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {visibleParts.map((part) => (
        <StackCard
          key={part}
          part={part}
          uri={uris[part]}
          spread={spreadSv}
          ritual={ritualSv}
          cardW={cardW}
          cardH={cardH}
          fanW={fanW}
          isDark={isDark}
          label={labelFor(part)}
          labelColor={colors.secondary}
          active={activePart === part}
          interactive={canPress}
          inkEnabled={inkEnabled}
          showLabels={compact}
          photoCache={photoCache}
          ghostHint={ghostHint}
          onPressPart={onPressPart}
          onClearActive={activePart === part ? onClearActive : undefined}
          clearAccessibilityLabel={clearAccessibilityLabel}
        />
      ))}
    </View>
  )
}
