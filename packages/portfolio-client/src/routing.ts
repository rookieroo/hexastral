/**
 * Satellite → flagship funnel routing.
 *
 * `questionType` is the explicit signal we ask the user before showing a
 * reading result (see `SatelliteQuestionTypePicker`). It maps to one of the
 * three flagships. When omitted, fall back to the satellite target's default.
 *
 * Server returns `suggestedFlagship` in the run response; clients can also
 * compute it locally (e.g., before the round-trip) by calling
 * `routePortfolioToFlagship(target, questionType)`.
 */

import type { PortfolioTarget } from './types'

export type QuestionType = 'relationship' | 'home_office' | 'career_wealth' | 'self_daily'
export type FlagshipKey = 'kindred' | 'feng' | 'auspice' | 'hexastral'

export const QUESTION_TYPES: readonly QuestionType[] = [
  'relationship',
  'home_office',
  'career_wealth',
  'self_daily',
] as const

const QUESTION_TO_FLAGSHIP: Record<QuestionType, FlagshipKey> = {
  relationship: 'kindred',
  home_office: 'feng',
  career_wealth: 'hexastral',
  self_daily: 'auspice',
}

const TARGET_DEFAULT_FLAGSHIP: Record<PortfolioTarget, FlagshipKey> = {
  faceoracle: 'hexastral',
  starpalace: 'hexastral',
  soulmatch: 'kindred',
  fengshui: 'feng',
  dreamoracle: 'hexastral',
  eightpillars: 'hexastral',
  coincast: 'hexastral',
  numerology: 'hexastral',
}

export function routeQuestionToFlagship(q: QuestionType | null | undefined): FlagshipKey | null {
  if (!q) return null
  return QUESTION_TO_FLAGSHIP[q] ?? null
}

export function routePortfolioToFlagship(
  target: PortfolioTarget,
  questionType: QuestionType | null | undefined
): FlagshipKey {
  const explicit = routeQuestionToFlagship(questionType)
  if (explicit) return explicit
  return TARGET_DEFAULT_FLAGSHIP[target]
}
