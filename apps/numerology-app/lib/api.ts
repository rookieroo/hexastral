/**
 * Meihua (梅花易数) compute client — Phase K pivot.
 *
 * The "Numerology" satellite engine is now 邵雍先天数法 plum-blossom cast,
 * not Western Pythagorean life-path. ASO target stays "numerology" (loanword
 * for Eastern-numerology positioning) but every output field is hexagram-shaped.
 *
 * Routes through the shared portfolio pipeline (`runAuto` →
 * `/api/portfolio/preview/numerology` or `/api/portfolio/linked/numerology`),
 * so linked users get readings indexed into `portfolio-memory` and recallable
 * from HexAstral chat.
 */

import { runAuto } from '@zhop/portfolio-client'
import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from './growth-config'

export interface MeihuaNuclearHexagram {
  /** 6 lines bottom→top, 1=yang, 0=yin */
  lines: number[]
  upperNumber: number
  lowerNumber: number
}

export interface MeihuaReading {
  /** Optional user question stored at cast time */
  question: string | null
  /** 6 hexagram lines bottom→top, 1=yang ━, 0=yin ╌ */
  lines: number[]
  /** Changing-line indices (0-based from bottom). Plum-blossom has exactly one. */
  changingLines: number[]
  /** Subject vs object trigrams (邵雍先天数 1-8) */
  upperNumber: number
  lowerNumber: number
  /** 1-6, from bottom */
  changingLineNumber: number
  /** 体卦先天数 — the trigram NOT containing the changing line (the asker) */
  bodyTrigramNumber: number
  /** 用卦先天数 — the trigram CONTAINING the changing line (the matter at hand) */
  useTrigramNumber: number
  /** 互卦 — derived from lines 2,3,4 (lower) and 3,4,5 (upper) */
  nuclearHexagram: MeihuaNuclearHexagram
  /** ISO timestamp when the cast was rolled */
  castAt: string
  /** AI narration — null in v1.0, populated when AI prompt layer ships */
  interpretation: string | null
}

export interface MeihuaComputeResult {
  /** `'preview'` for guests, `'linked'` for signed-in users. */
  mode: 'preview' | 'linked'
  readingId: string
  reading: MeihuaReading
  /** Server-suggested flagship to upsell — typically `'yuan'`, `'feng'`, or `'cycle'`.
   *  Type kept in sync with `FlagshipKey` from `@zhop/portfolio-client/routing`. */
  suggestedFlagship: 'yuan' | 'feng' | 'cycle' | 'hexastral' | null
}

function isReading(v: unknown): v is MeihuaReading {
  if (!v || typeof v !== 'object') return false
  const r = v as Record<string, unknown>
  return (
    Array.isArray(r.lines) &&
    r.lines.length === 6 &&
    typeof r.upperNumber === 'number' &&
    typeof r.lowerNumber === 'number' &&
    typeof r.changingLineNumber === 'number' &&
    typeof r.bodyTrigramNumber === 'number' &&
    typeof r.useTrigramNumber === 'number'
  )
}

/**
 * Cast a 梅花 hexagram. Anonymous users get `mode: 'preview'`; users who
 * signed in via Apple get `mode: 'linked'` with the cast persisted to their
 * portfolio history (and indexed into portfolio-memory for HexAstral chat
 * recall).
 *
 * Throws `PortfolioQuotaExceededError` / `PortfolioSessionExpiredError` /
 * `PortfolioBannedError` from `@zhop/portfolio-client`.
 */
export async function castMeihuaReading(input: {
  question?: string
  observedNumber?: number
  locale?: string
}): Promise<MeihuaComputeResult> {
  const res = await runAuto({
    target: PORTFOLIO_TARGET_APP,
    anonymousStoragePrefix: PORTFOLIO_STORAGE_PREFIX,
    input: {
      ...(input.question ? { question: input.question } : {}),
      ...(input.observedNumber !== undefined ? { observedNumber: input.observedNumber } : {}),
    },
    locale: input.locale ?? 'en',
  })

  if (res.mode === 'refused') {
    throw new Error(res.reason || 'meihua_refused')
  }

  if (!isReading(res.output)) {
    throw new Error('meihua_invalid_response')
  }

  return {
    mode: res.mode,
    readingId: res.readingId,
    reading: res.output,
    suggestedFlagship: res.suggestedFlagship ?? null,
  }
}
