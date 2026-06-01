import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { BirthInfo } from '@/lib/domain/birthInfo'
import { getBirthInfo, saveBirthInfo } from '@/lib/domain/birthInfo'

/**
 * Read birth info, with server hydration when local is empty.
 *
 * Fresh installs / cache clears / device switches leave AsyncStorage empty even
 * when the server has the user's birth fields. Without hydration the home tab
 * shows "前往排盘" and the auto-generation effect never fires.
 */
async function fetchBirthInfo(userId: string | null | undefined): Promise<BirthInfo | null> {
  const local = await getBirthInfo()
  // Short-circuit when local already carries both solarDate AND displayName.
  // If displayName is missing we still hit the server so onboarding-set
  // `users.name` populates the cache (fixes greeting falling back to anon).
  if (local.solarDate && local.displayName) return local

  // Local empty — try server (signed-in users only; guests have no server record)
  if (!userId || userId.startsWith('guest_')) {
    return local.solarDate ? local : null
  }

  try {
    const resp = await apiClient.api.user[':userId'].$get({ param: { userId } })
    if (!resp.ok) return null
    const json = (await resp.json()) as {
      data?: {
        birthSolarDate?: string | null
        birthTimeIndex?: number | null
        birthGender?: string | null
        birthCity?: string | null
        birthLongitude?: string | number | null
        birthLatitude?: string | number | null
        birthTimezoneId?: string | null
        name?: string | null
        displayName?: string | null
      }
    }
    const u = json.data
    if (!u?.birthSolarDate) return null

    const merged: BirthInfo = {
      solarDate: u.birthSolarDate,
      timeIndex: u.birthTimeIndex ?? undefined,
      gender: (u.birthGender as '男' | '女' | undefined) ?? undefined,
      birthCity: u.birthCity ?? undefined,
      longitude: u.birthLongitude != null ? Number(u.birthLongitude) : undefined,
      latitude: u.birthLatitude != null ? Number(u.birthLatitude) : undefined,
      timezoneId: u.birthTimezoneId ?? undefined,
      // Greeting & local cache prefer 昵称 (displayName); fall back to 姓名 only
      // when no nickname has been set so existing users see SOMETHING addressable.
      displayName: u.displayName ?? u.name ?? undefined,
    }
    await saveBirthInfo(merged)
    return merged
  } catch (err) {
    if (__DEV__) console.warn('[useBirthInfoQuery] server hydration failed', err)
    return null
  }
}

export function useBirthInfoQuery(userId?: string | null) {
  return useQuery<BirthInfo | null>({
    queryKey: ['birth-info', userId ?? null],
    queryFn: () => fetchBirthInfo(userId),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  })
}

/** Call after user saves new birth info to bust the cache. */
export function useInvalidateBirthInfo() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['birth-info'] })
}
