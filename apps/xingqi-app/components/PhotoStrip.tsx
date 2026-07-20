/**
 * Home photo strip — 3 square thumbnails (左掌/右掌/面). Tap opens the
 * fullscreen locus viewer (or capture, when a slot is empty). Replaces the
 * cramped in-card tab+pinch explorer.
 */

import { Plus } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'

import type { CapturePart } from '@/lib/reading-draft'
import { resolveReadingPhotoUri } from '@/lib/reading-photos'

type Segment = { part: CapturePart; label: string }

export function PhotoStrip({
  readingId,
  sectionLabel,
  labels,
  colors,
  spacing,
  onPressPart,
}: {
  readingId: string
  sectionLabel: string
  labels: { palmL: string; palmR: string; face: string }
  colors: {
    text: string
    dim: string
    accent: string
    secondary: string
    separator: string
    bg: string
  }
  spacing: { md: number; lg: number; sm: number; xl: number }
  onPressPart: (part: CapturePart, hasPhoto: boolean) => void
}) {
  const [uris, setUris] = useState<Partial<Record<CapturePart, string>>>({})

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const parts: CapturePart[] = ['palm_l', 'palm_r', 'face']
      const next: Partial<Record<CapturePart, string>> = {}
      for (const part of parts) {
        const uri = await resolveReadingPhotoUri(readingId, part, { fallbackLive: true })
        if (uri) next[part] = uri
      }
      if (!cancelled) setUris(next)
    })()
    return () => {
      cancelled = true
    }
  }, [readingId])

  const segments: Segment[] = [
    { part: 'palm_l', label: labels.palmL },
    { part: 'palm_r', label: labels.palmR },
    { part: 'face', label: labels.face },
  ]

  return (
    <View style={{ gap: spacing.sm }}>
      <Text
        style={{
          fontFamily: 'IBMPlexMono',
          color: colors.dim,
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
        }}
      >
        {sectionLabel}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {segments.map((seg) => {
          const uri = uris[seg.part]
          return (
            <Pressable
              key={seg.part}
              onPress={() => onPressPart(seg.part, Boolean(uri))}
              accessibilityRole='button'
              accessibilityLabel={seg.label}
              style={{ flex: 1, gap: 6 }}
            >
              <View
                style={{
                  width: '100%',
                  aspectRatio: 1,
                  backgroundColor: colors.bg,
                  borderWidth: 0.5,
                  borderColor: colors.separator,
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {uri ? (
                  <Image
                    source={{ uri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode='cover'
                  />
                ) : (
                  <Plus size={20} color={colors.dim} strokeWidth={1.5} />
                )}
              </View>
              <Text
                style={{
                  color: colors.dim,
                  fontSize: 11,
                  letterSpacing: 0.4,
                  textAlign: 'center',
                }}
              >
                {seg.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
