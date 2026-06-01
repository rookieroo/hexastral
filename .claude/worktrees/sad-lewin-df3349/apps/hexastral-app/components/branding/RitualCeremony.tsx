/**
 * RitualCeremony — 默念仪式倒计时
 *
 * Solo 模式: "请默念对方名字三遍" → 三 → 二 → 一 → 完成转场
 * 设计语言: 水墨粗野主义 — 暗底、居中、大号汉字、scale+fade 动画
 * 总时长: ~4s (1s 指引 + 3×0.9s 倒计时 + 0.3s 过渡)
 */

import { useCallback, useEffect, useRef } from 'react'
import { Animated, Text, View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { hapticMedium, hapticSuccess } from '@/lib/ux/haptics'

interface RitualCeremonyProps {
  targetName: string
  onComplete: () => void
}

const COUNTDOWN_KEYS = ['bond_ritual_three', 'bond_ritual_two', 'bond_ritual_one'] as const

const STEP_DURATION = 900
const INSTRUCTION_DURATION = 1200

export function RitualCeremony({ targetName, onComplete }: RitualCeremonyProps) {
  const { colors } = useTheme()
  const { t } = useI18n()

  const instructionOpacity = useRef(new Animated.Value(0)).current
  const countOpacity = useRef(new Animated.Value(0)).current
  const countScale = useRef(new Animated.Value(0.6)).current
  const countIndex = useRef(0)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const showCountdownStep = useCallback(() => {
    const idx = countIndex.current
    if (idx >= COUNTDOWN_KEYS.length) {
      hapticSuccess()
      // Brief gold flash then transition
      Animated.timing(countOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onCompleteRef.current())
      return
    }

    hapticMedium()
    countOpacity.setValue(0)
    countScale.setValue(0.6)

    Animated.parallel([
      Animated.timing(countOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(countScale, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Hold, then fade out
      setTimeout(() => {
        Animated.timing(countOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          countIndex.current = idx + 1
          showCountdownStep()
        })
      }, STEP_DURATION - 450)
    })
  }, [countOpacity, countScale])

  useEffect(() => {
    // Phase 1: Show instruction
    Animated.timing(instructionOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      // Hold instruction, then start countdown
      setTimeout(() => {
        Animated.timing(instructionOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          showCountdownStep()
        })
      }, INSTRUCTION_DURATION)
    })
  }, [instructionOpacity, showCountdownStep])

  // Determine which countdown character to show
  const countKey = COUNTDOWN_KEYS[countIndex.current] ?? COUNTDOWN_KEYS[0]

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
      }}
    >
      {/* Instruction phase */}
      <Animated.View
        style={{
          position: 'absolute',
          opacity: instructionOpacity,
          alignItems: 'center',
          paddingHorizontal: 40,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: '300',
            color: colors.textSecondary,
            letterSpacing: 3,
            textAlign: 'center',
            lineHeight: 28,
          }}
        >
          {t('bond_ritual_instruction')}
        </Text>
        <Text
          style={{
            fontSize: 24,
            fontWeight: '300',
            color: colors.accent,
            marginTop: 16,
            letterSpacing: 2,
          }}
        >
          {targetName}
        </Text>
      </Animated.View>

      {/* Countdown phase */}
      <Animated.View
        style={{
          position: 'absolute',
          opacity: countOpacity,
          transform: [{ scale: countScale }],
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 72,
            fontWeight: '200',
            color: colors.text,
            letterSpacing: 8,
          }}
        >
          {t(countKey)}
        </Text>
      </Animated.View>
    </View>
  )
}
