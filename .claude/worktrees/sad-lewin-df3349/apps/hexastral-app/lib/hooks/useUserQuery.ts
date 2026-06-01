import { useQuery } from '@tanstack/react-query'
import { config } from '@/lib/config'
import { signRequest } from '@/lib/hmac'

interface UserData {
  id: string
  /** 真实姓名 — 占卜与命理参数，不对外公开 */
  name: string | null
  /** 公开昵称 — Profile 可编辑，用于公开页与问候语 */
  displayName: string | null
  avatarKey: string | null
  email: string | null
  credits: number
  subscriptionStatus: string | null
  totalReadings: number
  // Profile redesign — fate signature & granular visibility
  fateSignature?: string | null
  fateSignatureStyle?: string | null
  fateSignatureCustomPrompt?: string | null
  fateSignatureGeneratedAt?: string | null
  fateSignatureExplanation?: string | null
  publicVisibilityJson?: string | null
  // Locale + onboarding-baked static traits (deep-refactor Phase 4.8)
  locale?: string | null
  dayMasterStem?: string | null
  dayMasterStrength?: string | null
  favorableElement?: string | null
  unfavorableElement?: string | null
  ziweiMingPalaceStar?: string | null
  birthBranch?: string | null
  /** Public profile handle — required before chart can be public */
  username?: string | null
  chartPublic?: boolean
  notifPrefsJson?: string | null
}

async function fetchUser(userId: string): Promise<UserData> {
  const path = `/api/user/${userId}`
  const url = `${config.apiUrl}${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${userId}`,
  }
  const sig = await signRequest({ body: '', userId, method: 'GET', path })
  if (sig) Object.assign(headers, sig)

  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`User fetch failed: ${res.status}`)
  const json = (await res.json()) as { data: UserData }
  return json.data
}

export function useUserQuery(userId: string | null | undefined) {
  return useQuery<UserData>({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}
