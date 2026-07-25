/**
 * /calendar — legacy deep-link. Month now expands inline on Today (week ↔ month).
 * Redirect preserves old notification / share URLs that still point here.
 */

import { type Href, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect } from 'react'
import { View } from 'react-native'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export default function CalendarRedirect() {
  const router = useRouter()
  const params = useLocalSearchParams<{ day?: string }>()

  useEffect(() => {
    const candidate = Array.isArray(params.day) ? params.day[0] : params.day
    const day = typeof candidate === 'string' && DATE_RE.test(candidate) ? candidate : undefined
    router.replace(day ? ({ pathname: '/(tabs)', params: { day } } as Href) : ('/(tabs)' as Href))
  }, [params.day, router])

  return <View />
}
