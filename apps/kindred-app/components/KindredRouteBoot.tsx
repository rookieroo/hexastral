/**
 * Side-effects that need a mounted expo-router Stack (under KindredClientGate).
 * Keeping these in root layout fired router.push while the gate still showed only
 * BootSplash → "action was not handled by any navigator".
 */

import { type Href, router } from 'expo-router'
import { useEffect } from 'react'
import { attemptKindredDdlRestore } from '@/lib/ddl'
import { attachTimelineTapHandler, configureTimelineNotifications } from '@/lib/timeline-push'

export function KindredRouteBoot(): null {
  useEffect(() => {
    void attemptKindredDdlRestore().then((claim) => {
      if (claim) {
        router.push({ pathname: '/accept/[token]', params: { token: claim.token } })
      }
    })
  }, [])

  useEffect(() => {
    configureTimelineNotifications()
    return attachTimelineTapHandler((route) => router.push(route as Href))
  }, [])

  return null
}
