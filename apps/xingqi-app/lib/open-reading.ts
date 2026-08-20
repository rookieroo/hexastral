/**
 * Open a portfolio reading — brief card only when `brief` exists; else five chapters.
 */

import { router } from 'expo-router'

import { shouldOpenBriefCard } from '@/lib/reading-brief'

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
  const nav = opts.replace ? router.replace : router.push
  const params: { readingId: string; payload?: string } = { readingId: opts.readingId }
  if (opts.resultJson?.trim()) {
    params.payload = encodeURIComponent(opts.resultJson)
  }
  nav({ pathname, params } as never)
}
