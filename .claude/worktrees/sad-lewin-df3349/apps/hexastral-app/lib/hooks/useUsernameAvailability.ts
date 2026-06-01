/**
 * useUsernameAvailability — debounced username uniqueness check
 *
 * Fires GET /api/user/check-username?username=<value> after a 450ms idle window.
 * Returns { status: 'idle' | 'checking' | 'available' | 'taken' | 'invalid' }.
 */

import { useEffect, useRef, useState } from 'react'
import { apiClient } from '@/lib/api'

export type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

const DEBOUNCE_MS = 450
const MIN_LENGTH = 2
const MAX_LENGTH = 30
const VALID_PATTERN = /^[a-z0-9_]+$/

export function useUsernameAvailability(
  username: string | undefined,
  /** Current saved username — skip check when unchanged */
  currentUsername: string | undefined
): UsernameStatus {
  const [status, setStatus] = useState<UsernameStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestRef = useRef<string>('')

  useEffect(() => {
    const value = (username ?? '').trim()
    const baseline = (currentUsername ?? '').trim()

    // If unchanged or empty, clear state immediately (trimmed compare avoids false taken)
    if (!value || value === baseline) {
      if (timerRef.current) clearTimeout(timerRef.current)
      setStatus('idle')
      return
    }

    // Client-side format validation
    if (value.length < MIN_LENGTH || value.length > MAX_LENGTH || !VALID_PATTERN.test(value)) {
      if (timerRef.current) clearTimeout(timerRef.current)
      setStatus('invalid')
      return
    }

    setStatus('checking')
    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      latestRef.current = value
      try {
        const resp = await apiClient.api.user['check-username'].$get({
          query: { username: value },
        })
        // Only update if this response is still the latest
        if (latestRef.current !== value) return
        if (!resp.ok) {
          setStatus('idle')
          return
        }
        const data = (await resp.json()) as { available: boolean; reason?: string }
        if (data.reason === 'invalid') {
          setStatus('invalid')
        } else {
          setStatus(data.available ? 'available' : 'taken')
        }
      } catch {
        if (latestRef.current === value) setStatus('idle')
      }
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [username, currentUsername])

  return status
}
