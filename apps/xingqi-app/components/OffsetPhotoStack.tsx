/**
 * Offset polaroid stack — compact ghost deck (home empty) or fanned studio.
 */

import { useTheme } from '@zhop/core-ui'
import { Plus } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { LocalPhoto } from '@/components/LocalPhoto'
import { PolaroidChrome, polaroidLift } from '@/components/PolaroidChrome'
import { PolaroidGhost } from '@/components/PolaroidGhost'

import type { CapturePart } from '@/lib/reading-draft'
import { resolveReadingPhotoUri } from '@/lib/reading-photos'
import {
  POLAROID_CARD_H,
  POLAROID_CARD_W,
  POLAROID_FAN_W,
  POLAROID_STACK_H,
  polaroidPoses,
} from '@/lib/stack-layout'

const PARTS: CapturePart[] = ['palm_l', 'palm_r', 'face']

export function OffsetPhotoStack({
  readingId,
  uris: urisProp,
  revision = 0,
  labels,
  activePart,
  spread = 1,
  compact = false,
  onPressPart,
}: {
  readingId?: string
  uris?: Partial<Record<CapturePart, string>>
  revision?: number
  labels: { palmL: string; palmR: string; face: string }
  activePart?: CapturePart
  spread?: number
  compact?: boolean
  onPressPart?: (part: CapturePart, hasPhoto: boolean) => void
}) {
  const { colors, isDark } = useTheme()
  const [boxW, setBoxW] = useState(POLAROID_FAN_W)
  const [loaded, setLoaded] = useState<Partial<Record<CapturePart, string>>>({})
  const fanW = compact ? POLAROID_FAN_W : boxW
  const cardW = compact ? POLAROID_CARD_W : Math.min(148, Math.round(boxW * 0.42))
  const cardH = compact ? POLAROID_CARD_H : Math.round(cardW * 1.26)
  const uris = urisProp ?? loaded
  const poses = polaroidPoses(spread, fanW, cardW)

  useEffect(() => {
    if (urisProp) return
    let cancelled = false
    void (async () => {
      const next: Partial<Record<CapturePart, string>> = {}
      for (const part of PARTS) {
        const uri = await resolveReadingPhotoUri(readingId, part, { fallbackLive: true })
        if (uri) next[part] = uri
      }
      if (!cancelled) setLoaded(next)
    })()
    return () => {
      cancelled = true
    }
  }, [readingId, revision, urisProp])

  const labelFor = (part: CapturePart) =>
    part === 'palm_l' ? labels.palmL : part === 'palm_r' ? labels.palmR : labels.face

  return (
    <View
      onLayout={(e) => {
        if (!compact) setBoxW(e.nativeEvent.layout.width)
      }}
      style={{
        height: compact ? POLAROID_STACK_H : cardH + 52,
        width: compact ? POLAROID_FAN_W : '100%',
        alignSelf: 'center',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {PARTS.map((part) => {
        const uri = uris[part]
        const pose = poses[part]
        return (
          <View
            key={part}
            style={{
              position: 'absolute',
              left: pose.left,
              top: pose.top,
              zIndex: activePart === part ? 4 : pose.z,
              width: cardW,
              height: cardH,
              ...polaroidLift(isDark),
            }}
          >
            <View style={{ flex: 1, transform: [{ rotate: `${pose.rotateDeg}deg` }] }}>
              <PolaroidChrome
                active={activePart === part}
                interactive={!compact}
                accessibilityLabel={labelFor(part)}
                onPress={() => onPressPart?.(part, Boolean(uri))}
              >
                {uri ? (
                  <LocalPhoto uri={uri} style={{ width: '100%', height: '100%' }} />
                ) : compact ? (
                  <PolaroidGhost />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={22} color={colors.dim} strokeWidth={1.5} />
                  </View>
                )}
              </PolaroidChrome>
            </View>
          </View>
        )
      })}
    </View>
  )
}
