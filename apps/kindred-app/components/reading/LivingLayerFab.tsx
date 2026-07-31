/**
 * LivingLayerFab — the report's bottom-right entry into the per-bond LIVING LAYER:
 * Timeline + What-if + Chat (+ optional Share). Hosts navigate into free taste
 * first; paywall only after server exhaustion.
 *
 * Icon-only circular discs; names ride `accessibilityLabel`. Git-graph family:
 * Timeline / GitBranch / MessageCircle. Shared `progress` fans discs on a
 * quarter-ring up-and-left from the cinnabar toggle.
 */

import { kindredPaper, kindredSpacing } from '@zhop/hexastral-tokens/kindred'
import {
  GitBranch,
  GitCommitHorizontal,
  GitCommitVertical,
  type LucideIcon,
  MessageCircle,
  Share,
  Timeline,
} from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

const FAB_SIZE = 52
const DISC_SIZE = 46
const ARC_RADIUS = 104
const WRAP = ARC_RADIUS + DISC_SIZE / 2 + FAB_SIZE / 2 + 8

export interface LivingLayerFabProps {
  labels: { timeline: string; whatif: string; chat: string; share: string }
  onTimeline: () => void
  onWhatIf: () => void
  onChat: () => void
  onShare?: () => void
  insetBottom: number
}

export function LivingLayerFab({
  labels,
  onTimeline,
  onWhatIf,
  onChat,
  onShare,
  insetBottom,
}: LivingLayerFabProps) {
  const [open, setOpen] = useState(false)
  const progress = useSharedValue(0)
  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, {
      duration: open ? 340 : 220,
      easing: open ? Easing.bezier(0.2, 0.9, 0.2, 1) : Easing.bezier(0.4, 0, 0.7, 0.2),
    })
  }, [open, progress])

  const actions: Array<{
    key: string
    Icon: LucideIcon
    label: string
    onPress: () => void
  }> = [
    { key: 'timeline', Icon: Timeline, label: labels.timeline, onPress: onTimeline },
    { key: 'whatif', Icon: GitBranch, label: labels.whatif, onPress: onWhatIf },
    { key: 'chat', Icon: MessageCircle, label: labels.chat, onPress: onChat },
    ...(onShare ? [{ key: 'share', Icon: Share, label: labels.share, onPress: onShare }] : []),
  ]

  return (
    <Animated.View
      entering={FadeIn.duration(280)}
      pointerEvents='box-none'
      style={{
        position: 'absolute',
        right: kindredSpacing.lg,
        bottom: insetBottom + kindredSpacing.xxl,
        width: WRAP,
        height: WRAP,
        zIndex: 20,
      }}
    >
      {actions.map((action, i) => (
        <FabDisc
          key={action.key}
          progress={progress}
          index={i}
          total={actions.length}
          open={open}
          Icon={action.Icon}
          label={action.label}
          onPress={() => {
            setOpen(false)
            action.onPress()
          }}
        />
      ))}
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole='button'
        accessibilityState={{ expanded: open }}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: FAB_SIZE,
          height: FAB_SIZE,
          borderRadius: FAB_SIZE / 2,
          backgroundColor: kindredPaper.cinnabar,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#3c2415',
          shadowOpacity: 0.22,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
        }}
      >
        <FabToggleIcon progress={progress} />
      </Pressable>
    </Animated.View>
  )
}

function FabToggleIcon({ progress }: { progress: SharedValue<number> }) {
  const horizontalStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    opacity: interpolate(progress.value, [0, 0.5, 1], [1, 0, 0]),
    transform: [{ rotate: `${progress.value * 90}deg` }],
  }))
  const verticalStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0, 1]),
    transform: [{ rotate: `${(progress.value - 1) * 90}deg` }],
  }))

  return (
    <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={horizontalStyle}>
        <GitCommitHorizontal color={kindredPaper.ctaText} size={22} strokeWidth={1.8} />
      </Animated.View>
      <Animated.View style={verticalStyle}>
        <GitCommitVertical color={kindredPaper.ctaText} size={22} strokeWidth={1.8} />
      </Animated.View>
    </View>
  )
}

function FabDisc({
  progress,
  index,
  total,
  open,
  Icon,
  label,
  onPress,
}: {
  progress: SharedValue<number>
  index: number
  total: number
  open: boolean
  Icon: LucideIcon
  label: string
  onPress: () => void
}) {
  const deg = total > 1 ? 90 + (index / (total - 1)) * 90 : 135
  const rad = (deg * Math.PI) / 180
  const dx = ARC_RADIUS * Math.cos(rad)
  const dy = -ARC_RADIUS * Math.sin(rad)
  const start = index * 0.12
  const style = useAnimatedStyle(() => {
    const p = interpolate(progress.value, [start, start + 0.55], [0, 1], Extrapolation.CLAMP)
    return {
      opacity: p,
      transform: [{ translateX: dx * p }, { translateY: dy * p }, { scale: 0.4 + 0.6 * p }],
    }
  })

  return (
    <Animated.View
      pointerEvents={open ? 'auto' : 'none'}
      style={[
        {
          position: 'absolute',
          right: (FAB_SIZE - DISC_SIZE) / 2,
          bottom: (FAB_SIZE - DISC_SIZE) / 2,
        },
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole='button'
        accessibilityLabel={label}
        style={{
          width: DISC_SIZE,
          height: DISC_SIZE,
          borderRadius: DISC_SIZE / 2,
          backgroundColor: kindredPaper.bg,
          borderWidth: 0.5,
          borderColor: kindredPaper.hair,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#3c2415',
          shadowOpacity: 0.16,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        <Icon color={kindredPaper.cinnabar} size={20} strokeWidth={1.8} />
      </Pressable>
    </Animated.View>
  )
}
