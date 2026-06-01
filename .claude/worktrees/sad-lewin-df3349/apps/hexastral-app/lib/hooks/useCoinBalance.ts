import AsyncStorage from '@react-native-async-storage/async-storage'
import { useQuery } from '@tanstack/react-query'
import { config } from '@/lib/config'
import { signRequest } from '@/lib/hmac'

interface BalanceData {
  credits: number
  subscriptionStatus: string | null
}

async function fetchBalance(userId: string): Promise<BalanceData> {
  const path = '/api/user/balance'
  const url = `${config.apiUrl}${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${userId}`,
  }
  const sig = await signRequest({ body: '', userId, method: 'GET', path })
  if (sig) Object.assign(headers, sig)

  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Balance fetch failed: ${res.status}`)
  return (await res.json()) as BalanceData
}

/**
 * useCoinBalance — 从 API 拉取权威铜钱余额并同步到本地缓存。
 * 每次挂载时自动刷新，焦点恢复时也会重新验证。
 */
export function useCoinBalance(userId: string | null | undefined) {
  return useQuery<BalanceData>({
    queryKey: ['coinBalance', userId],
    queryFn: async () => {
      const data = await fetchBalance(userId!)
      // Sync authoritative balance to local AsyncStorage for offline preflight
      await AsyncStorage.setItem('hexastral_coins_balance', String(data.credits))
      return data
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 s — balance changes on every spend
    refetchOnWindowFocus: true,
  })
}
