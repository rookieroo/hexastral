import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { BondData, BondInviteCredits } from '@/lib/domain/bonds'
import { fetchBondCredits, fetchBonds, giftBond, unlockBond } from '@/lib/domain/bonds'

export function useBondsQuery(userId: string | null | undefined) {
  return useQuery<BondData[]>({
    queryKey: ['bonds', userId],
    queryFn: () => fetchBonds(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useBondCreditsQuery(userId: string | null | undefined) {
  return useQuery<BondInviteCredits>({
    queryKey: ['bond-credits', userId],
    queryFn: () => fetchBondCredits(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useUnlockBond(userId: string | null | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (bondId: string) => unlockBond(userId!, bondId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bonds', userId] }),
  })
}

export function useGiftBond(userId: string | null | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (bondId: string) => giftBond(userId!, bondId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bonds', userId] }),
  })
}
