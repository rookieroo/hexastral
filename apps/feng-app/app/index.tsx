/**
 * Boot redirect.
 *
 * First launch → the `(intro)` cold open (shown once). Returning users hop
 * straight into the home. The (new-site) flow is entered via the home FAB /
 * empty-state CTA. While the seen-flag is loading we hold on the night ground
 * (same 墨 as BootSplash) so there is no flash before the decision.
 */

import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { hasSeenFengIntro } from '@/lib/onboarding'
import { FENG_PALETTE } from '@/lib/theme'

export default function Index() {
  const [seen, setSeen] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    void hasSeenFengIntro().then((v) => {
      if (!cancelled) setSeen(v)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (seen === null) {
    return <View style={{ flex: 1, backgroundColor: FENG_PALETTE.night }} />
  }

  return <Redirect href={seen ? '/(tabs)' : '/(intro)'} />
}
