/**
 * Per-route model + prompt-version registry.
 *
 * The contextHash incorporates these values so that bumping either field
 * automatically invalidates all stored chapters/signals at the next read,
 * triggering a lazy regen via markCurrentAndInsert.
 *
 * When you bump these, deploy the corresponding svc-astro prompt change
 * simultaneously — never bump model/prompt without the matching prompt update.
 */

import type { ChapterSlug } from './chart-context'

export const SIGNAL_MODEL = 'gemini-2.5-flash-lite@2026-04'
export const SIGNAL_PROMPT_VERSION = 'v1.0'

export const REVEAL_MODEL = 'gemini-2.5-flash-lite@2026-04'
export const REVEAL_PROMPT_VERSION = 'v1.0'

interface ChapterModelMeta {
  model: string
  promptVersion: string
}

const TERMINAL_PRO: ChapterModelMeta = {
  model: 'gemini-3-pro@2026-04',
  // v1.1 — adds rich dual-chart facts block (Ba Zi pillars + 紫微 palaces +
  // 大运/流年) to the chapter prompt to eliminate `[具体X]` placeholder leak.
  promptVersion: 'v1.1',
}

const TIMEBOUND_FLASH: ChapterModelMeta = {
  model: 'gemini-3-flash@2026-04',
  // v1.1 — see TERMINAL_PRO note.
  promptVersion: 'v1.1',
}

export const CHAPTER_MODEL_REGISTRY: Record<ChapterSlug, ChapterModelMeta> = {
  ch1_personality: TERMINAL_PRO,
  ch2_dimensions_static: TERMINAL_PRO,
  ch2_dimensions_dynamic: TIMEBOUND_FLASH,
  ch3_stellar: TERMINAL_PRO,
  ch4_timeline: TIMEBOUND_FLASH,
  ch5_hidden: TIMEBOUND_FLASH,
  ch6_action: TIMEBOUND_FLASH,
}
