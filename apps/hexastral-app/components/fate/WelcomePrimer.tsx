import { useEffect, useRef } from 'react'
import { Animated, Pressable, Text } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { storage } from '@/lib/storage'
import { useIosPalette } from '@/lib/theme'

const KEY = 'fate_last_seen_at'

export function shouldShowWelcomePrimer(): boolean {
  return !storage.getString(KEY)
}

export function markWelcomePrimerSeen(): void {
  storage.set(KEY, new Date().toISOString())
}

export function WelcomePrimer({
  name,
  onDismiss,
}: {
  name?: string | null
  onDismiss?: () => void
}) {
  const ios = useIosPalette()
  const { t } = useI18n()
  const opacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => {
        onDismiss?.()
      })
    }, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss, opacity])

  const dismissNow = () => {
    Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      onDismiss?.()
    })
  }

  return (
    <Pressable onPress={dismissNow}>
      <Animated.View
        style={{
          opacity,
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: 4,
        }}
      >
        <Text
          style={{
            color: ios.secondary,
            fontSize: 11,
            lineHeight: 18,
            letterSpacing: 0.5,
            fontWeight: '300',
          }}
        >
          {name ? `${t('welcome_primer_title')} · ${name}` : t('welcome_primer_title')}
        </Text>
      </Animated.View>
    </Pressable>
  )
}
