/**
 * One-time primer for first Xingqi report open.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'

import type { Locale } from '@/lib/i18n'
import { primerCopy } from '@/lib/living-copy'

const KEY = 'xingqi_reading_primer_v3'

export async function hasSeenReadingPrimer(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1'
  } catch {
    return false
  }
}

export async function markReadingPrimerSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1')
  } catch {
    // ignore
  }
}

export function ReadingPrimer({
  visible,
  locale,
  colors,
  onClose,
  onOpenGlossary,
}: {
  visible: boolean
  locale: string
  colors: { bg: string; text: string; secondary: string; accent: string }
  onClose: () => void
  onOpenGlossary?: () => void
}) {
  const loc = (['zh', 'zh-Hant', 'en', 'ja'].includes(locale) ? locale : 'en') as Locale
  const copy = primerCopy(loc)
  return (
    <Modal visible={visible} transparent animationType='fade' onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: '#000000cc',
          justifyContent: 'center',
          paddingHorizontal: 28,
        }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.bg,
            padding: 24,
            gap: 14,
            borderWidth: 0.5,
            borderColor: colors.secondary,
          }}
        >
          <Text style={{ fontFamily: 'CrimsonPro', color: colors.text, fontSize: 24 }}>
            {copy.title}
          </Text>
          <Text style={{ color: colors.secondary, fontSize: 15, lineHeight: 22 }}>{copy.body}</Text>
          <Pressable
            onPress={() => {
              onOpenGlossary?.()
              onClose()
            }}
          >
            <Text
              style={{
                fontFamily: 'IBMPlexMono',
                color: colors.accent,
                fontSize: 12,
                letterSpacing: 1,
              }}
            >
              {copy.glossary}
            </Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            style={{
              marginTop: 8,
              backgroundColor: colors.accent,
              paddingVertical: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.bg, fontWeight: '600' }}>{copy.begin}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export function useReadingPrimer(ready: boolean): { show: boolean; dismiss: () => void } {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!ready) return
    let cancelled = false
    void (async () => {
      const seen = await hasSeenReadingPrimer()
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
      void markReadingPrimerSeen()
    },
  }
}
