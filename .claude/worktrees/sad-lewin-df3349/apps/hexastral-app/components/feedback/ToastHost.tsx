/**
 * ToastHost — top-anchored stack of dismissable toast banners.
 *
 * Mounted once at the root layout. Subscribes to the global toast bus
 * (`lib/ux/toast.ts`) and renders up to 3 active toasts at a time, each
 * auto-dismissing after `AUTO_DISMISS_MS`. Tap to dismiss early.
 *
 * Visual: Ink-Brutalism flat card with a left-edge color accent that
 * encodes the toast kind (error / info / success). No emojis, no animations
 * beyond opacity fade.
 */

import { useEffect, useRef, useState } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useIosPalette } from '@/lib/theme'
import { subscribeToast, type ToastPayload } from '@/lib/ux/toast'

const AUTO_DISMISS_MS = 4500
const MAX_VISIBLE = 3

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastPayload[]>([])

  useEffect(() => {
    const unsubscribe = subscribeToast((toast) => {
      setToasts((prev) => {
        const next = [...prev, toast]
        return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next
      })
    })
    return unsubscribe
  }, [])

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  if (toasts.length === 0) return null

  return (
    <SafeAreaView pointerEvents='box-none' style={StyleSheet.absoluteFill} edges={['top']}>
      <View pointerEvents='box-none' style={styles.stack}>
        {toasts.map((toast) => (
          <ToastBanner key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </View>
    </SafeAreaView>
  )
}

interface BannerProps {
  toast: ToastPayload
  onDismiss: () => void
}

function ToastBanner({ toast, onDismiss }: BannerProps) {
  const ios = useIosPalette()
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 160,
      useNativeDriver: true,
    }).start()
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [opacity, onDismiss])

  const accent =
    toast.kind === 'error'
      ? '#DC2626'
      : toast.kind === 'success'
        ? '#16A34A'
        : ios.accent

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          opacity,
          backgroundColor: ios.card,
          borderColor: ios.separator,
        },
      ]}
    >
      <Pressable onPress={onDismiss} style={styles.bannerInner}>
        <View style={[styles.accentBar, { backgroundColor: accent }]} />
        <Text
          numberOfLines={3}
          style={[styles.message, { color: ios.text }]}
        >
          {toast.message}
        </Text>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  stack: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  banner: {
    borderWidth: 0.5,
    borderRadius: 0,
  },
  bannerInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 48,
  },
  accentBar: {
    width: 3,
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
})
