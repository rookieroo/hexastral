/**
 * LivingLayerFab — report entry to Life axis / What-if / Chat (Yuel grammar).
 */

import { GitBranch, GitCommitHorizontal, GitCommitVertical, type LucideIcon, MessageCircle, RefreshCw, Timeline } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import Animated, {
  Easing,
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
  labels: { timeline: string; whatif: string; chat: string; regenerate?: string }
  onTimeline?: () => void
  onWhatIf?: () => void
  onChat?: () => void
  onRegenerate?: () => void
  insetBottom: number
  colors: { accent: string; accentFg: string; disc: string; discFg: string }
}

export function LivingLayerFab({
  labels,
  onTimeline,
  onWhatIf,
  onChat,
  onRegenerate,
  insetBottom,
  colors,
}: LivingLayerFabProps) {
  const [open, setOpen] = useState(false)
  const progress = useSharedValue(0)
  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, {
      duration: open ? 340 : 220,
      easing: open ? Easing.bezier(0.2, 0.9, 0.2, 1) : Easing.bezier(0.4, 0, 0.7, 0.2),
    })
  }, [open, progress])

  const actions: Array<{ key: string; Icon: LucideIcon; label: string; onPress: () => void }> = [
    ...(onTimeline
      ? [{ key: 'timeline', Icon: Timeline, label: labels.timeline, onPress: onTimeline }]
      : []),
    ...(onWhatIf ? [{ key: 'whatif', Icon: GitBranch, label: labels.whatif, onPress: onWhatIf }] : []),
    ...(onChat ? [{ key: 'chat', Icon: MessageCircle, label: labels.chat, onPress: onChat }] : []),
    ...(onRegenerate && labels.regenerate
      ? [{ key: 'regen', Icon: RefreshCw, label: labels.regenerate, onPress: onRegenerate }]
      : []),
  ]

  return (
    <View
      pointerEvents='box-none'
      style={{
        position: 'absolute',
        right: 20,
        bottom: insetBottom + 28,
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
          Icon={action.Icon}
          label={action.label}
          colors={colors}
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
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FabToggleIcon progress={progress} color={colors.accentFg} />
      </Pressable>
    </View>
  )
}

function FabToggleIcon({ progress, color }: { progress: SharedValue<number>; color: string }) {
  const horizontalStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    opacity: interpolate(progress.value, [0, 0.5, 1], [1, 0, 0]),
    transform: [{ rotate: `${progress.value * 90}deg` }],
  }))
  const verticalStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0, 1]),
    transform: [{ rotate: `${(progress.value - 1) * 90}deg` }],
  }))
  return (
    <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={horizontalStyle}>
        <GitCommitHorizontal color={color} size={22} strokeWidth={1.8} />
      </Animated.View>
      <Animated.View style={verticalStyle}>
        <GitCommitVertical color={color} size={22} strokeWidth={1.8} />
      </Animated.View>
    </View>
  )
}

function FabDisc({
  progress,
  index,
  total,
  Icon,
  label,
  colors,
  onPress,
}: {
  progress: SharedValue<number>
  index: number
  total: number
  Icon: LucideIcon
  label: string
  colors: LivingLayerFabProps['colors']
  onPress: () => void
}) {
  const style = useAnimatedStyle(() => {
    const t = Math.max(total - 1, 1)
    const angle = (Math.PI / 2) * (index / t) // up → left quarter
    const r = ARC_RADIUS * progress.value
    const opacity = interpolate(progress.value, [0, 0.2, 1], [0, 0, 1])
    const scale = interpolate(progress.value, [0, 1], [0.4, 1])
    return {
      position: 'absolute' as const,
      right: FAB_SIZE / 2 - DISC_SIZE / 2 + Math.sin(angle) * r,
      bottom: FAB_SIZE / 2 - DISC_SIZE / 2 + Math.cos(angle) * r,
      opacity,
      transform: [{ scale }],
    }
  })
  return (
    <Animated.View style={style}>
      <Pressable
        onPress={onPress}
        accessibilityRole='button'
        accessibilityLabel={label}
        style={{
          width: DISC_SIZE,
          height: DISC_SIZE,
          borderRadius: DISC_SIZE / 2,
          backgroundColor: colors.disc,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 0.5,
          borderColor: colors.accent,
        }}
      >
        <Icon size={20} strokeWidth={1.6} color={colors.discFg} />
      </Pressable>
    </Animated.View>
  )
}
