/**
 * Home photo strip — face hero + two palm tiles. Tap opens the fullscreen
 * locus viewer (or capture, when a slot is empty). Sized to carry visual weight
 * so the home does not leave a dead middle void under a short verdict.
 */

import { Plus } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'

import type { CapturePart } from '@/lib/reading-draft'
import { resolveReadingPhotoUri } from '@/lib/reading-photos'

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

  const tile = (part: CapturePart, label: string, opts: { flex?: number; aspectRatio: number }) => {
    const uri = uris[part]
    return (
      <Pressable
        key={part}
        onPress={() => onPressPart(part, Boolean(uri))}
        accessibilityRole='button'
        accessibilityLabel={label}
        style={{ flex: opts.flex, gap: 6 }}
      >
        <View
          style={{
            width: '100%',
            aspectRatio: opts.aspectRatio,
            backgroundColor: colors.bg,
            borderWidth: 0.5,
            borderColor: colors.separator,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {uri ? (
            <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode='cover' />
          ) : (
            <Plus size={22} color={colors.dim} strokeWidth={1.5} />
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
          {label}
        </Text>
      </Pressable>
    )
  }

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
      {/* Face carries the row; palms sit underneath — fills home without a middle void. */}
      {tile('face', labels.face, { aspectRatio: 1.35 })}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {tile('palm_l', labels.palmL, { flex: 1, aspectRatio: 1 })}
        {tile('palm_r', labels.palmR, { flex: 1, aspectRatio: 1 })}
      </View>
    </View>
  )
}
