/**
 * RitualLoading — 仪式感全屏 Loading（Labor Illusion）
 *
 * 3 步骤渐变动画，最少显示 4 秒，包装 AI 生成等待时间：
 *   Step 1 (0–2s): 对齐天干地支
 *   Step 2 (2–4s): 载入星宫十二宫
 *   Step 3 (4s+):  双盘合参演算
 */

import { Compass, Layers, Sparkles } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { Animated, Text, View } from 'react-native'
import { HexastralPlanetLogo, useLunarPhase } from '@/components/branding/HexastralPlanetLogo'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

const STEP_DURATION = 2000

interface StepConfig {
  key: 'ritual_aligning_stems' | 'ritual_mapping_palaces' | 'ritual_synthesizing'
  Icon: typeof Compass
}

const STEPS: StepConfig[] = [
  { key: 'ritual_aligning_stems', Icon: Compass },
  { key: 'ritual_mapping_palaces', Icon: Layers },
  { key: 'ritual_synthesizing', Icon: Sparkles },
]

interface RitualLoadingProps {
  visible: boolean
  /** Called once the minimum display duration (4s) has elapsed */
  onMinDurationMet?: () => void
}

export function RitualLoading({ visible, onMinDurationMet }: RitualLoadingProps) {
  const { colors } = useTheme()
  const { t } = useI18n()
  const lunarPhase = useLunarPhase()

  const [stepIndex, setStepIndex] = useState(0)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const minDurationFired = useRef(false)

  // Reset on visibility change
  useEffect(() => {
    if (visible) {
      setStepIndex(0)
      minDurationFired.current = false
      fadeAnim.setValue(0)
    }
  }, [visible, fadeAnim])

  // Step progression timer
  useEffect(() => {
    if (!visible) return

    // Fade in current step
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start()

    if (stepIndex >= STEPS.length - 1) {
      // Final step reached — fire min duration callback
      if (!minDurationFired.current) {
        minDurationFired.current = true
        onMinDurationMet?.()
      }
      return
    }

    const timer = setTimeout(() => {
      // Fade out, then advance
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setStepIndex((prev) => prev + 1)
      })
    }, STEP_DURATION)

    return () => clearTimeout(timer)
  }, [visible, stepIndex, fadeAnim, onMinDurationMet])

  if (!visible) return null

  const step = STEPS[stepIndex]
  if (!step) return null
  const StepIcon = step.Icon

  return (
    <View
      style={{
        ...({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const),
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
        gap: 32,
      }}
    >
      {/* Spinning planet logo */}
      <HexastralPlanetLogo size={40} phase={lunarPhase} />

      {/* Step content */}
      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', gap: 16 }}>
        <StepIcon size={24} color={colors.accent} strokeWidth={1} />
        <Text
          style={{
            fontSize: 13,
            fontWeight: '300',
            color: colors.textSecondary,
            letterSpacing: 2,
            textAlign: 'center',
          }}
        >
          {t(step.key)}
        </Text>
      </Animated.View>
    </View>
  )
}
