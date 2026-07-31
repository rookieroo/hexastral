/**
 * Side-effects that need a mounted expo-router Stack (under KindredClientGate).
 * Keeping these in root layout fired router.push while the gate still showed only
 * BootSplash → "action was not handled by any navigator".
 */

import { type Href, router, useRootNavigationState } from 'expo-router'
import { useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { attemptKindredDdlRestore } from '@/lib/ddl'
import { attachTimelineTapHandler, configureTimelineNotifications } from '@/lib/timeline-push'

export function KindredRouteBoot(): null {
  const { userId, isLoading } = useAuth()
  const navState = useRootNavigationState()
  const navReady = Boolean(navState?.key)
  const sessionReady = Boolean(userId) && !isLoading

  useEffect(() => {
    if (!navReady || !sessionReady) return
    void attemptKindredDdlRestore().then((claim) => {
      if (claim) {
        router.push(`/accept/${encodeURIComponent(claim.token)}` as Href)
      }
    })
  }, [navReady, sessionReady])

  useEffect(() => {
    if (!navReady) return
    configureTimelineNotifications()
    return attachTimelineTapHandler((route) => router.push(route as Href))
  }, [navReady])

  return null
}
