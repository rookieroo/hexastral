/**
 * Open a portfolio reading — brief card only when `brief` exists; else five chapters.
 * Nav-locked so double-taps (wheel / archive / job done) cannot stack the same screen.
 */

import { router } from 'expo-router'

import { markReadingOpened } from '@/lib/reading-job'
import { shouldOpenBriefCard } from '@/lib/reading-brief'
import { getReducedMotion } from '@/lib/reduced-motion'
import { clearFlight } from '@/lib/shared-element-flight'

export type ReadingPart = 'face' | 'palm_l' | 'palm_r'

let openLockUntil = 0
let lastOpenKey = ''

/**
 * Map a tapped capture part to the report chapter that owns it — mirrors
 * `locus.tsx openChapter` so the report opens on the right card.
 */
function chapterForPart(part?: ReadingPart): string | undefined {
  if (!part) return undefined
  return part === 'face' ? 'face' : 'palms'
}

export function openReadingScreen(opts: {
  readingId: string
  resultJson?: string | null
  /** Prefer replace when completing a job. */
  replace?: boolean
  /** Tapped capture part — deep-links the report to that chapter / active card. */
  part?: ReadingPart
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
  if (getReducedMotion()) clearFlight()
  const key = `${opts.replace ? 'r' : 'p'}:${pathname}:${opts.readingId}`
  const now = Date.now()
  if (key === lastOpenKey && now < openLockUntil) return
  lastOpenKey = key
  openLockUntil = now + 800
  markReadingOpened(opts.readingId)

  const nav = opts.replace ? router.replace : router.push
  const params: { readingId: string; payload?: string; chapter?: string; part?: string } = {
    readingId: opts.readingId,
  }
  if (opts.resultJson?.trim()) {
    params.payload = encodeURIComponent(opts.resultJson)
  }
  const chapter = chapterForPart(opts.part)
  if (chapter) params.chapter = chapter
  if (opts.part) params.part = opts.part
  nav({ pathname, params } as never)
}
