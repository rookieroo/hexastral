/**
 * LivingLayerFab — the report's bottom-right entry into the per-bond LIVING LAYER:
 * Timeline (key 合盘 time nodes) + What-if (the timing of real decisions —
 * marriage, a child, going long-distance…). These are the subscription surfaces
 * (2026-06: chapters open free via invite, so the paywall lives here + chat), so
 * they get a prominent floating entry instead of a buried row-swipe.
 *
 * A floating button expands upward to the two entries. Icons match auspice-app
 * (Timeline = GitCommitVertical, What-if = GitBranch) so the two products read as
 * one family. Paper-styled (it floats over the 宣纸 report).
 */

import { kindredPaper, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import { GitBranch, GitCommitVertical, GitFork, type LucideIcon, X } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated'

export interface LivingLayerFabProps {
  labels: { timeline: string; whatif: string }
  onTimeline: () => void
  onWhatIf: () => void
  /** Safe-area bottom inset so the button clears the home indicator. */
  insetBottom: number
}

export function LivingLayerFab({ labels, onTimeline, onWhatIf, insetBottom }: LivingLayerFabProps) {
  const [open, setOpen] = useState(false)
  return (
    <View
      pointerEvents='box-none'
      style={{
        position: 'absolute',
        right: kindredSpacing.lg,
        bottom: insetBottom + kindredSpacing.lg,
        alignItems: 'flex-end',
        gap: kindredSpacing.sm,
        zIndex: 20,
      }}
    >
      {open ? (
        <>
          <FabPill
            Icon={GitCommitVertical}
            label={labels.timeline}
            delay={0}
            onPress={() => {
              setOpen(false)
              onTimeline()
            }}
          />
          <FabPill
            Icon={GitBranch}
            label={labels.whatif}
            delay={40}
            onPress={() => {
              setOpen(false)
              onWhatIf()
            }}
          />
        </>
      ) : null}
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole='button'
        accessibilityState={{ expanded: open }}
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: kindredPaper.cinnabar,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#3c2415',
          shadowOpacity: 0.22,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
        }}
      >
        {open ? (
          <X color={kindredPaper.ctaText} size={22} strokeWidth={1.8} />
        ) : (
          // git-family glyph: branching futures = the Timeline + What-if layer
          // (reads as one family with auspice's git icons; rotated so the fork
          // opens upward toward the two pills it reveals).
          <GitFork
            color={kindredPaper.ctaText}
            size={22}
            strokeWidth={1.8}
            style={{ transform: [{ rotate: '180deg' }] }}
          />
        )}
      </Pressable>
    </View>
  )
}

function FabPill({
  Icon,
  label,
  onPress,
  delay,
}: {
  Icon: LucideIcon
  label: string
  onPress: () => void
  delay: number
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(160).delay(delay)}
      exiting={FadeOutDown.duration(120)}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole='button'
        accessibilityLabel={label}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: kindredSpacing.sm,
          paddingVertical: 10,
          paddingHorizontal: kindredSpacing.md,
          borderRadius: 22,
          backgroundColor: kindredPaper.bg,
          borderWidth: 0.5,
          borderColor: kindredPaper.hair,
          shadowColor: '#3c2415',
          shadowOpacity: 0.16,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        <Icon color={kindredPaper.cinnabar} size={18} strokeWidth={1.8} />
        <Text style={[kindredType.caption, { color: kindredPaper.ink, fontWeight: '600' }]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  )
}
