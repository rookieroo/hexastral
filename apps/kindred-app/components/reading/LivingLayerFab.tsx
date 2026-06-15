/**
 * LivingLayerFab — the report's bottom-right entry into the per-bond LIVING LAYER:
 * Timeline (key 合盘 time nodes) + What-if (the timing of real decisions —
 * marriage, a child, going long-distance…) + Chat (ask about this bond). These are
 * the subscription surfaces (2026-06: chapters open free via invite, so the paywall
 * lives here + chat), so they get a prominent floating entry instead of a buried
 * row-swipe.
 *
 * Icon-only, equal-size circular discs — text labels read as clutter and made the
 * rows uneven widths; the name now rides `accessibilityLabel`. They stay in the
 * git-graph family the Timeline spine uses: Timeline = the Timeline glyph (the axis
 * of nodes), What-if = GitBranch (the branching futures), Chat = MessageCircle.
 *
 * One shared `progress` (0 closed … 1 open) drives BOTH the FAB glyph morph and the
 * discs, so they read as a single gesture: on open the discs pop out of the cinnabar
 * FAB one by one (staggered translate-up + scale + fade, starting from behind it)
 * while the glyph pivots; on close they retract back into it. Paper-styled (it
 * floats over the 宣纸 report).
 */

import { kindredPaper, kindredSpacing } from '@zhop/hexastral-tokens/kindred'
import {
  GitBranch,
  GitCommitHorizontal,
  GitCommitVertical,
  type LucideIcon,
  MessageCircle,
  Timeline,
} from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

const FAB_SIZE = 52
const DISC_SIZE = 46
const DISC_GAP = 14

export interface LivingLayerFabProps {
  labels: { timeline: string; whatif: string; chat: string }
  onTimeline: () => void
  onWhatIf: () => void
  /** Optional — the chat disc only appears once the bond has a pair reading. */
  onChat?: () => void
  /** Safe-area bottom inset so the button clears the home indicator. */
  insetBottom: number
}

export function LivingLayerFab({
  labels,
  onTimeline,
  onWhatIf,
  onChat,
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

  // Bottom → top (nearest the FAB first). Chat only when the report can route to it.
  const actions: Array<{ key: string; Icon: LucideIcon; label: string; onPress: () => void }> = [
    { key: 'timeline', Icon: Timeline, label: labels.timeline, onPress: onTimeline },
    { key: 'whatif', Icon: GitBranch, label: labels.whatif, onPress: onWhatIf },
    ...(onChat ? [{ key: 'chat', Icon: MessageCircle, label: labels.chat, onPress: onChat }] : []),
  ]

  return (
    <View
      pointerEvents='box-none'
      style={{
        position: 'absolute',
        right: kindredSpacing.lg,
        bottom: insetBottom + kindredSpacing.lg,
        alignItems: 'center',
        zIndex: 20,
      }}
    >
      {actions.map((action, i) => (
        <FabDisc
          key={action.key}
          progress={progress}
          index={i}
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
    </View>
  )
}

/**
 * The FAB glyph morphs between two git-family icons instead of swapping them:
 * GitCommitHorizontal (collapsed — a node resting on the line) pivots a quarter
 * turn and crossfades into GitCommitVertical (expanded — the same node turned up
 * onto the spine, i.e. "tap to collapse"). Driven by the shared progress so it
 * pivots in lockstep with the discs popping out.
 */
function FabToggleIcon({ progress }: { progress: SharedValue<number> }) {
  // The two glyphs are 90° rotations of each other, so a continuous quarter-turn
  // (crossfading at the midpoint) reads as the node pivoting from the line onto the
  // spine rather than a cut. Horizontal turns away as Vertical turns in.
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

/**
 * One action disc. At rest it sits `rest` px above the FAB; closed it collapses
 * onto the FAB (translateY down + scale + fade) so opening looks like it pops out
 * from behind the cinnabar disc. A per-index stagger window makes them emerge one
 * by one. `pointerEvents` follows `open` so the hidden discs never eat taps.
 */
function FabDisc({
  progress,
  index,
  open,
  Icon,
  label,
  onPress,
}: {
  progress: SharedValue<number>
  index: number
  open: boolean
  Icon: LucideIcon
  label: string
  onPress: () => void
}) {
  const rest = FAB_SIZE + DISC_GAP + index * (DISC_SIZE + DISC_GAP)
  const start = index * 0.12
  const style = useAnimatedStyle(() => {
    const p = interpolate(progress.value, [start, start + 0.55], [0, 1], Extrapolation.CLAMP)
    return {
      opacity: p,
      transform: [{ translateY: (1 - p) * rest }, { scale: 0.4 + 0.6 * p }],
    }
  })

  return (
    <Animated.View
      pointerEvents={open ? 'auto' : 'none'}
      style={[{ position: 'absolute', bottom: rest, left: (FAB_SIZE - DISC_SIZE) / 2 }, style]}
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
