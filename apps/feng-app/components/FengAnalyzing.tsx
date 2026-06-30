/**
 * FengAnalyzing — the staged transition Loader for the long analysis wait.
 *
 * The 罗盘 (LuopanLoader) turns while the pipeline's stages tick over
 * (地图 → 形势 → 演算 → синтез). Mirrors Yuel's GeneratingStages idea but in
 * feng's idiom — the wait itself carries the surveying ritual. Pure SVG +
 * reanimated (no Skia). Parent supplies localized step labels + statuses so this
 * stays generic.
 */

import { Check } from 'lucide-react-native'
import { useEffect } from 'react'
import { Text, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { FENG_PAPER, spacing } from '@/lib/theme'
import { LuopanLoader } from './LuopanLoader'

export type FengStepStatus = 'done' | 'active' | 'pending'

export interface FengAnalyzingStep {
  label: string
  status: FengStepStatus
}

interface FengAnalyzingProps {
  steps: FengAnalyzingStep[]
  /** Caption under the 罗盘. */
  label?: string
}

export function FengAnalyzing({ steps, label }: FengAnalyzingProps) {
  return (
    <View style={{ alignItems: 'center', gap: spacing.xl, paddingVertical: spacing.xl }}>
      <LuopanLoader size={156} label={label} />
      <View style={{ gap: spacing.sm, alignSelf: 'stretch', paddingHorizontal: spacing.xl }}>
        {steps.map((step) => (
          <StepRow key={step.label} step={step} />
        ))}
      </View>
    </View>
  )
}

function StepRow({ step }: { step: FengAnalyzingStep }) {
  const pulse = useSharedValue(1)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (step.status !== 'active' || reduceMotion) {
      pulse.value = 1
      return
    }
    pulse.value = withRepeat(withTiming(0.35, { duration: 700 }), -1, true)
  }, [step.status, reduceMotion, pulse])

  const dotStyle = useAnimatedStyle(() => ({ opacity: step.status === 'active' ? pulse.value : 1 }))

  const isDone = step.status === 'done'
  const isActive = step.status === 'active'
  const tone = isDone ? FENG_PAPER.cinnabar : isActive ? FENG_PAPER.bronze : FENG_PAPER.muted

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <View style={{ width: 18, alignItems: 'center', justifyContent: 'center' }}>
        {isDone ? (
          <Check color={FENG_PAPER.cinnabar} size={15} />
        ) : (
          <Animated.View
            style={[
              {
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: tone,
              },
              dotStyle,
            ]}
          />
        )}
      </View>
      <Text
        style={{
          color: tone,
          fontSize: 14,
          fontWeight: isActive ? '600' : '400',
        }}
      >
        {step.label}
      </Text>
    </View>
  )
}
