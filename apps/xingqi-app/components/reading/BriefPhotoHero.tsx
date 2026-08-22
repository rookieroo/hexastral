/**
 * Brief card hero — face (or tapped part) snapshot on a compact 宣纸 plate.
 * Flight target for wheel → shallow brief handoff.
 */

import { useTheme } from '@zhop/core-ui'
import type { RefObject } from 'react'
import { Dimensions, View } from 'react-native'

import { InkCenterpiece } from '@/components/reading/InkCenterpiece'
import type { CapturePart } from '@/lib/reading-draft'

export function BriefPhotoHero({
  part,
  uri,
  seed,
  heroRef,
  plateRef,
  deferEntrance,
}: {
  part: CapturePart
  uri: string
  seed: number
  heroRef: RefObject<View | null>
  plateRef: RefObject<View | null>
  deferEntrance?: boolean
}) {
  const { spacing } = useTheme()
  const width = Dimensions.get('window').width - spacing.xl * 2

  return (
    <View style={{ alignItems: 'center', marginBottom: 4 }}>
      <InkCenterpiece
        chapter='face'
        seed={seed}
        width={width}
        washOnly
        photos={[{ part, uri }]}
        photoRefs={{ [part]: heroRef }}
        plateRef={plateRef}
        deferEntrance={deferEntrance}
      />
    </View>
  )
}
