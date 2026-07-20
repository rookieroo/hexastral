/**
 * Notification tap → deep-link into capture (recapture), result (reading_ready), or home.
 */

import { fetchReadingById } from '@zhop/portfolio-client'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'

import { PORTFOLIO_TARGET_APP } from './growth-config'
import { markReadingOpened, wasReadingOpenedRecently } from './reading-job'

type Kind = 'recapture' | 'event' | 'reading_ready' | 'reading_failed' | string

function readKind(data: Record<string, unknown> | undefined): Kind | undefined {
  if (!data) return undefined
  const kind = data.kind
  return typeof kind === 'string' ? kind : undefined
}

function readString(data: Record<string, unknown> | undefined, key: string): string | undefined {
  if (!data) return undefined
  const v = data[key]
  return typeof v === 'string' && v.length > 0 ? v : undefined
}

/**
 * Mount once in root layout. Handles cold-start + foreground taps.
 */
export function useXingqiNotificationDeepLink(): void {
  const router = useRouter()

  useEffect(() => {
    let Notifications: {
      addNotificationResponseReceivedListener: (
        cb: (response: {
          notification: { request: { content: { data?: Record<string, unknown> } } }
        }) => void
      ) => { remove: () => void }
      getLastNotificationResponseAsync: () => Promise<{
        notification: { request: { content: { data?: Record<string, unknown> } } }
      } | null>
    } | null = null
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      Notifications = require('expo-notifications')
    } catch {
      return
    }
    if (!Notifications) return

    const open = (data: Record<string, unknown> | undefined) => {
      const kind = readKind(data)
      if (!kind) return

      if (kind === 'event' || kind === 'timeline') {
        router.push('/timeline' as never)
        return
      }

      if (kind === 'reading_ready') {
        const readingId = readString(data, 'readingId')
        if (!readingId) {
          router.push('/(app)' as never)
          return
        }
        // Home/paywall already opened this report from job completion — ignore the tap.
        if (wasReadingOpenedRecently(readingId)) return
        void (async () => {
          try {
            const detail = await fetchReadingById(PORTFOLIO_TARGET_APP, readingId)
            const resultJson = detail.reading?.resultJson
            markReadingOpened(readingId)
            if (resultJson) {
              router.replace({
                pathname: '/result',
                params: {
                  readingId,
                  payload: encodeURIComponent(resultJson),
                },
              } as never)
              return
            }
          } catch {
            // fall through to readingId-only navigation
          }
          markReadingOpened(readingId)
          router.replace({
            pathname: '/result',
            params: { readingId },
          } as never)
        })()
        return
      }

      if (kind === 'recapture') {
        router.push('/capture' as never)
        return
      }

      router.push('/(app)' as never)
    }

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      open(response.notification.request.content.data)
    })

    void Notifications.getLastNotificationResponseAsync().then((last) => {
      if (last) open(last.notification.request.content.data)
    })

    return () => sub.remove()
  }, [router])
}
