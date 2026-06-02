/**
 * Single pair (合盘) reading for History detail.
 *
 * Mirrors the response shape of GET /api/pair/:id (apps/hexastral-api/src/routes/pair/pair.ts).
 * The richer interpretation + compatibility blobs are surfaced so detail screens can render
 * the full AI output (overview, dayMaster, branch sections, highlights, warnings, advice…).
 */

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'

export interface PairInterpretation {
  overview?: string
  dayMasterRelation?: string
  yearBranch?: string
  monthBranch?: string
  dayBranch?: string
  highlights?: string
  warnings?: string
  advice?: string
  summary?: string
  archetypeName?: string | null
  archetypeTagline?: string | null
  archetypeCategory?: 'harmony' | 'tension' | 'growth' | 'karmic' | 'volatile' | null
  hookDimension?: 'long_term' | 'communication' | 'attraction' | 'emotional' | null
  shareQuote?: string | null
}

export interface PairCompatibilityDimension {
  key?: string
  name: string
  score: number
  maxScore: number
  note?: string
}

/**
 * Synastry compatibility dimension as rendered by InterpretationSections +
 * BondRadarChart. Phase J · J.3.2: rehomed from `lib/domain/bonds.ts` after
 * the bonds tab was deleted; the four-axis scoring is now solely a pair-
 * reading concern.
 */
export interface BondDimension {
  key: 'long_term' | 'attraction' | 'communication' | 'emotional'
  name: string
  score: number | null // null when locked
  maxScore: number | null // null when locked
  note: string | null // null when locked
  isLocked: boolean
}

export interface PairCompatibility {
  score?: number
  grade?: string
  gradeLabel?: string
  dimensions?: PairCompatibilityDimension[]
  highlights?: string
  warnings?: string
  summary?: string
}

export interface PairPersonInfo {
  solarDate?: string | null
  timeIndex?: number | null
  gender?: '男' | '女' | null
  name?: string | null
}

export interface PairReadingDetail {
  id: string
  score: number | null
  grade: string | null
  archetypeName: string | null
  archetypeTagline: string | null
  archetypeCategory: 'harmony' | 'tension' | 'growth' | 'karmic' | 'volatile' | null
  hookDimension: 'long_term' | 'communication' | 'attraction' | 'emotional' | null
  relationshipCategory: string | null
  customRelationshipLabel: string | null
  interpretation: PairInterpretation
  compatibility: PairCompatibility
  personA: PairPersonInfo
  personB: PairPersonInfo
  bookmarked?: boolean
  rating?: number | null
  createdAt: string
}

async function fetchPairReading(id: string): Promise<PairReadingDetail> {
  const res = await apiClient.api.pair[':id'].$get({ param: { id } })
  if (!res.ok) throw new Error(`pair/:id failed: ${res.status}`)
  const raw = (await res.json()) as Record<string, unknown>

  const interpretation =
    raw.interpretation && typeof raw.interpretation === 'object'
      ? (raw.interpretation as PairInterpretation)
      : {}
  const compatibility =
    raw.compatibility && typeof raw.compatibility === 'object'
      ? (raw.compatibility as PairCompatibility)
      : {}
  const personA =
    raw.personA && typeof raw.personA === 'object' ? (raw.personA as PairPersonInfo) : {}
  const personB =
    raw.personB && typeof raw.personB === 'object' ? (raw.personB as PairPersonInfo) : {}

  return {
    id: String(raw.id ?? id),
    score: typeof raw.score === 'number' ? raw.score : null,
    grade: typeof raw.grade === 'string' ? raw.grade : null,
    archetypeName: typeof raw.archetypeName === 'string' ? raw.archetypeName : null,
    archetypeTagline: typeof raw.archetypeTagline === 'string' ? raw.archetypeTagline : null,
    archetypeCategory: (raw.archetypeCategory as PairReadingDetail['archetypeCategory']) ?? null,
    hookDimension: (raw.hookDimension as PairReadingDetail['hookDimension']) ?? null,
    relationshipCategory:
      typeof raw.relationshipCategory === 'string' ? raw.relationshipCategory : null,
    customRelationshipLabel:
      typeof raw.customRelationshipLabel === 'string' ? raw.customRelationshipLabel : null,
    interpretation,
    compatibility,
    personA,
    personB,
    bookmarked: typeof raw.bookmarked === 'boolean' ? raw.bookmarked : false,
    rating: typeof raw.rating === 'number' ? raw.rating : null,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
  }
}

export function usePairReadingQuery(userId: string | null | undefined, pairId: string | undefined) {
  return useQuery<PairReadingDetail>({
    queryKey: ['pair-reading', userId, pairId],
    queryFn: () => fetchPairReading(pairId!),
    enabled: !!userId && !!pairId,
    staleTime: 60 * 1000,
  })
}
