/**
 * Per-route model + prompt-version registry.
 *
 * These strings are persisted as the provenance tag on each stored row AND feed
 * the contextHash, so bumping either field automatically invalidates all stored
 * chapters/signals at the next read, triggering a lazy regen via markCurrentAndInsert.
 *
 * They are cache-version tags only — svc-astro selects the actual model by `tier`
 * (see @zhop/ai-vision/router), not by these strings. Bump them whenever the
 * underlying model OR prompt changes so stale content regenerates.
 *
 * 2026-05: migrated off Gemini text → unified CF Workers AI router. Readings/reports
 * run flagship (Kimi K2.6 → Qwen3 → GLM); signal/reveal run standard (Qwen3 → GLM).
 * Bumped to force regen of all Gemini-era cached content.
 */

import type { ChapterSlug } from './chart-context'

export const SIGNAL_MODEL = 'cf-standard@2026-05'
export const SIGNAL_PROMPT_VERSION = 'v1.0'

export const REVEAL_MODEL = 'cf-standard@2026-05'
export const REVEAL_PROMPT_VERSION = 'v1.0'

interface ChapterModelMeta {
  model: string
  promptVersion: string
}

// All 6 chapters now route to the flagship CF tier (Kimi K2.6) for uniform premium
// quality — the former Pro/Flash split is retired (CF cost makes it unnecessary).
// The two consts are kept only so a future per-group prompt bump stays independent.
const TERMINAL_PRO: ChapterModelMeta = {
  model: 'cf-flagship@2026-05',
  // v1.1 — adds rich dual-chart facts block (Ba Zi pillars + 紫微 palaces +
  // 大运/流年) to the chapter prompt to eliminate `[具体X]` placeholder leak.
  promptVersion: 'v1.1',
}

const TIMEBOUND_FLASH: ChapterModelMeta = {
  model: 'cf-flagship@2026-05',
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

// 流年深读 (本月运势 Pro LLM depth). Stored in report_chapters under the synthetic
// 'monthly_depth' key; this tag feeds its per-month contextHash, so bumping the
// promptVersion force-regenerates every cached monthly depth at the next read.
export const MONTHLY_DEPTH_MODEL: ChapterModelMeta = {
  model: 'cf-flagship@2026-05',
  promptVersion: 'v1.0',
}
