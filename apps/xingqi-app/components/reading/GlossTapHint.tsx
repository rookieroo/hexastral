/**
 * One-time tip: dotted terms are tappable (shallow brief; deep uses ReadingPrimer).
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import type { Locale } from '@/lib/i18n'
import { glossTapHintCopy } from '@/lib/living-copy'

const KEY = 'xingqi_gloss_tap_hint_v1'

export async function hasSeenGlossTapHint(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1'
  } catch {
    return false
  }
}

export async function markGlossTapHintSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1')
  } catch {
    // ignore
  }
}

export function GlossTapHint({
  visible,
  locale,
  colors,
  onOpenTerms,
  onDismiss,
}: {
  visible: boolean
  locale: string
  colors: { card: string; text: string; secondary: string; accent: string; separator: string }
  onOpenTerms: () => void
  onDismiss: () => void
}) {
  if (!visible) return null
  const loc = (['zh', 'zh-Hant', 'en', 'ja'].includes(locale) ? locale : 'en') as Locale
  const copy = glossTapHintCopy(loc)
  return (
    <View
      style={{
        borderWidth: 0.5,
        borderColor: colors.separator,
        backgroundColor: colors.card,
        paddingVertical: 12,
        paddingHorizontal: 14,
        gap: 10,
      }}
    >
      <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 19 }}>{copy.body}</Text>
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        <Pressable
          onPress={() => {
            onOpenTerms()
            onDismiss()
          }}
          accessibilityRole='button'
          accessibilityLabel={copy.terms}
        >
          <Text
            style={{
              fontFamily: 'IBMPlexMono',
              color: colors.accent,
              fontSize: 12,
              letterSpacing: 0.6,
            }}
          >
            {copy.terms}
          </Text>
        </Pressable>
        <Pressable onPress={onDismiss} accessibilityRole='button' accessibilityLabel={copy.dismiss}>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{copy.dismiss}</Text>
        </Pressable>
      </View>
    </View>
  )
}

export function useGlossTapHint(ready: boolean): { show: boolean; dismiss: () => void } {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!ready) return
    let cancelled = false
    void (async () => {
      const seen = await hasSeenGlossTapHint()
      if (!cancelled && !seen) setShow(true)
    })()
    return () => {
      cancelled = true
    }
  }, [ready])

  return {
    show,
    dismiss: () => {
      setShow(false)
      void markGlossTapHintSeen()
    },
  }
}
