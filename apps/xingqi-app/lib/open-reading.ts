/**
 * Open a portfolio reading — brief card only when `brief` exists; else five chapters.
 * Nav-locked so double-taps (wheel / archive / job done) cannot stack the same screen.
 */

import { router } from 'expo-router'

import { markReadingOpened } from '@/lib/reading-job'
import { shouldOpenBriefCard } from '@/lib/reading-brief'

let openLockUntil = 0
let lastOpenKey = ''

export function openReadingScreen(opts: {
  readingId: string
  resultJson?: string | null
  /** Prefer replace when completing a job. */
  replace?: boolean
}): void {
  let useBrief = false
  if (opts.resultJson?.trim()) {
    try {
      const output = JSON.parse(opts.resultJson) as Record<string, unknown>
      useBrief = shouldOpenBriefCard(output)
    } catch {
      useBrief = false
    }
  }
  const pathname = useBrief ? '/brief' : '/result'
  const key = `${opts.replace ? 'r' : 'p'}:${pathname}:${opts.readingId}`
  const now = Date.now()
  if (key === lastOpenKey && now < openLockUntil) return
  lastOpenKey = key
  openLockUntil = now + 800
  markReadingOpened(opts.readingId)

  const nav = opts.replace ? router.replace : router.push
  const params: { readingId: string; payload?: string } = { readingId: opts.readingId }
  if (opts.resultJson?.trim()) {
    params.payload = encodeURIComponent(opts.resultJson)
  }
  nav({ pathname, params } as never)
}
