/**
 * bondQuality — classify a bond as good / peer / hard / plain, from the data the
 * report already computed. Drives the 解缘 (Let go) confirm copy + its swipe-block
 * colour: the product has a stance (a 相生 bond is a real loss to cut; a 相克 one is
 * often the healthier cut), but it's grounded in the chart, never a nudge.
 *
 * Prefer the 五行 relation the user already sees on the row (相生/相克/比和) — honest
 * and consistent. Falls back to the archetype category only before a reading exists.
 */

import type { BondData } from '@zhop/scenario-kindred'
import { elementRelation, hasValidElements } from '@/components/ink/InkCenterpiece'

export type BondQuality = 'good' | 'peer' | 'hard' | 'plain'

export function bondQuality(bond: BondData): BondQuality {
  const a = bond.aElement ?? undefined
  const b = bond.bElement ?? undefined
  if (hasValidElements(a, b)) {
    const rel = elementRelation(a, b)
    if (rel === 'generate') return 'good' // 相生 — mutually nourishing
    if (rel === 'overcome') return 'hard' // 相克 — friction at the root
    return 'peer' // 比和 — same wavelength, cuts both ways
  }
  // No reading yet (pending / incomplete) → lean on the archetype if present.
  switch (bond.archetypeCategory) {
    case 'harmony':
    case 'growth':
      return 'good'
    case 'tension':
    case 'volatile':
    case 'karmic':
      return 'hard'
    default:
      return 'plain'
  }
}
