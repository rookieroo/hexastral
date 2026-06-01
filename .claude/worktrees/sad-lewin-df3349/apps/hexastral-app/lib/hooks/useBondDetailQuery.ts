import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchBondDetail, giftBond, unlockBond, updateBondStage } from '@/lib/domain/bonds'

export function useBondDetailQuery(userId: string | null, bondId: string | null) {
  return useQuery({
    queryKey: ['bond-detail', userId, bondId],
    queryFn: () => fetchBondDetail(userId!, bondId!),
    enabled: !!userId && !!bondId,
    staleTime: 60_000, // 1 min — refresh after unlock/gift
  })
}

export function useUnlockBondMutation(userId: string | null, bondId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => unlockBond(userId!, bondId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bond-detail', userId, bondId] })
      queryClient.invalidateQueries({ queryKey: ['bonds', userId] })
    },
  })
}

export function useGiftBondMutation(userId: string | null, bondId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => giftBond(userId!, bondId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bond-detail', userId, bondId] })
      queryClient.invalidateQueries({ queryKey: ['bonds', userId] })
    },
  })
}

type RelationshipStage = 'crush' | 'dating' | 'committed' | 'engaged' | 'married' | 'ex'

export function useUpdateBondStageMutation(userId: string | null, bondId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (stage: RelationshipStage) => updateBondStage(userId!, bondId!, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bond-detail', userId, bondId] })
      queryClient.invalidateQueries({ queryKey: ['bonds', userId] })
    },
  })
}
