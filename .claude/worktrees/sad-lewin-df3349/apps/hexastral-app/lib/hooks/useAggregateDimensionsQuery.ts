/**
 * useAggregateDimensionsQuery
 *
 * Fetches bond details for all active scored bonds in parallel and averages
 * their dimension scores to produce a synthetic BondDimension[] for the
 * aggregate radar chart shown in the Friends tab header.
 *
 * Returns null when:
 *   - userId is not set
 *   - fewer than 2 fully-unlocked (all 4 dimensions scored) bonds exist
 *   - data is still loading
 */

import { useQueries } from '@tanstack/react-query'
import type { BondData, BondDimension } from '@/lib/domain/bonds'
import { fetchBondDetail } from '@/lib/domain/bonds'

const DIMENSION_KEYS: BondDimension['key'][] = [
  'long_term',
  'attraction',
  'communication',
  'emotional',
]

export function useAggregateDimensionsQuery(
  userId: string | null,
  bonds: BondData[]
): BondDimension[] | null {
  // Only query for active bonds that have a score (fully processed)
  const eligibleBonds = bonds.filter((b) => b.status === 'active' && b.score != null)

  const results = useQueries({
    queries: eligibleBonds.map((bond) => ({
      queryKey: ['bond-detail', userId, bond.id],
      queryFn: () => fetchBondDetail(userId!, bond.id),
      enabled: !!userId,
      staleTime: 5 * 60_000,
    })),
  })

  // Wait until all queries are settled (some may not have dimensions yet)
  const allDone = results.every((r) => !r.isLoading)
  if (!allDone) return null

  // Keep only fully-unlocked bonds (all 4 dimensions have a score)
  const fullyUnlocked = results
    .map((r) => r.data)
    .filter(
      (d): d is NonNullable<typeof d> =>
        !!d?.dimensions && d.dimensions.every((dim) => dim.score != null)
    )

  if (fullyUnlocked.length < 2) return null

  // Average scores per dimension key
  return DIMENSION_KEYS.map((key) => {
    const scores = fullyUnlocked
      .map((d) => d.dimensions?.find((dim) => dim.key === key))
      .filter((dim): dim is BondDimension => !!dim && dim.score != null)

    const avgScore =
      scores.length > 0
        ? Math.round(scores.reduce((sum, dim) => sum + (dim.score ?? 0), 0) / scores.length)
        : 0

    const firstMatch = scores[0]
    return {
      key,
      name: firstMatch?.name ?? key,
      score: avgScore,
      maxScore: firstMatch?.maxScore ?? 100,
      note: null,
      isLocked: false,
    } satisfies BondDimension
  })
}
