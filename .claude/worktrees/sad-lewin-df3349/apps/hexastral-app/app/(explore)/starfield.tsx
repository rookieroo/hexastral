/**
 * /starfield — Full-screen bonds constellation with semantic zoom.
 *
 * Pushed as a stack screen from the bonds tab.
 */

import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useCallback } from 'react'
import { BondsStarfield } from '@/components/bonds/BondsStarfield'
import { useAuth } from '@/lib/auth'
import { useProfile } from '@/lib/domain/profile'
import { useBondsQuery } from '@/lib/hooks/useBondsQuery'

export default function StarfieldScreen() {
  const router = useRouter()
  const { userId } = useAuth()
  const { avatarIndex, photoUri } = useProfile(userId)
  const { data: bonds = [] } = useBondsQuery(userId)

  const handleClose = useCallback(() => {
    router.back()
  }, [router])

  const handleNodePress = useCallback(
    (id: string) => {
      Haptics.selectionAsync()
      router.push(`/bond-detail?id=${encodeURIComponent(id)}`)
    },
    [router]
  )

  return (
    <BondsStarfield
      bonds={bonds}
      onClose={handleClose}
      onNodePress={handleNodePress}
      avatarIndex={avatarIndex}
      userAvatarUri={photoUri}
    />
  )
}
