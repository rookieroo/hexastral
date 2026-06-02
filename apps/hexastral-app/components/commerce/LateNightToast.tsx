/**
 * 深夜提醒 Toast — B5
 *
 * 23:00 ~ 02:59 期间占卜时，自动弹出顶部 Toast 柔性提醒
 * 非阻塞（不会阻止操作），3 秒后自动消失
 * 每次 session 仅提醒一次（通过 ref 控制）
 */

import { Moon } from 'lucide-react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, Text, useColorScheme, View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { theme } from '@/lib/theme'

const SHOW_DURATION = 4000
const ANIMATE_DURATION = 300
const LATE_START = 23 // 23:00
const LATE_END = 3 // 03:00 (exclusive)

function isLateNight(): boolean {
  const hour = new Date().getHours()
  return hour >= LATE_START || hour < LATE_END
}

/**
 * Hook: 每次 session 中最多展示一次深夜 Toast
 * 返回 { showIfNeeded, visible, dismiss }
 */
export function useLateNightToast() {
  const shownRef = useRef(false)
  const [visible, setVisible] = useState(false)

  const showIfNeeded = useCallback((): boolean => {
    if (shownRef.current) return false
    if (!isLateNight()) return false
    shownRef.current = true
    setVisible(true)
    return true
  }, [])

  const dismiss = useCallback(() => setVisible(false), [])

  return { showIfNeeded, visible, dismiss }
}

interface LateNightToastProps {
  visible: boolean
  onDismiss: () => void
}

export function LateNightToast({ visible, onDismiss }: LateNightToastProps) {
  const colorScheme = useColorScheme()
  const colors = colorScheme === 'dark' ? theme.dark : theme.light
  const { t } = useI18n()
  const translateY = useRef(new Animated.Value(-100)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: ANIMATE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: ANIMATE_DURATION,
          useNativeDriver: true,
        }),
      ]).start()

      // Auto dismiss
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: ANIMATE_DURATION,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: ANIMATE_DURATION,
            useNativeDriver: true,
          }),
        ]).start(() => onDismiss())
      }, SHOW_DURATION)

      return () => clearTimeout(timer)
    }
  }, [visible, translateY, opacity, onDismiss])

  if (!visible) return null

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 60,
        left: 16,
        right: 16,
        zIndex: 999,
        transform: [{ translateY }],
        opacity,
      }}
    >
      <View
        style={{
          backgroundColor: `${colors.primary}F0`,
          borderRadius: 0,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Moon size={20} color='#FFFFFF' />
        <Text
          style={{
            flex: 1,
            fontSize: 13,
            color: '#FFFFFF',
            lineHeight: 19,
          }}
        >
          {t('guard_late_night')}
        </Text>
      </View>
    </Animated.View>
  )
}
