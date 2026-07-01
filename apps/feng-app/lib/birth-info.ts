import { config } from './config'
import { signRequest } from './hmac'
import { getStoredFengUserId } from './user-session'

/**
 * Fēng birth info — the shape persisted to `/api/portfolio/birth-info`.
 *
 * Modelled on apps/auspice-app/lib/birth.ts: the canonical `birthSolarDate` is
 * always the gregorian form (even when the user entered 农历). We additionally
 * round-trip:
 *   - the precise-time disclosure (`birthClockMinutes` + `birthSolarCalibrate`)
 *     so 真太阳时 calibration survives a reload, and
 *   - the original 农历 input (`birthCalendarType` / `birthLunarInput` /
 *     `birthLunarIsLeap`) so re-editing restores the user's calendar choice
 *     exactly instead of a possibly-leap-ambiguous reverse conversion.
 */
export interface FengBirthInfo {
  birthSolarDate: string
  birthTimeIndex: number
  gender: '男' | '女'
  birthCity?: string
  birthLatitude?: string
  birthLongitude?: string
  birthTimezoneId?: string
  /** Precise birth clock — minutes since midnight 0..1439. null / absent =
   *  时辰-only entry (no 真太阳时 calibration). */
  birthClockMinutes?: number | null
  /** 真太阳时 calibration toggle for the precise clock; `false` = off, otherwise
   *  on. Only meaningful when `birthClockMinutes` is set + a longitude exists. */
  birthSolarCalibrate?: boolean | null
  /** Which calendar the user entered the date in — 'solar' (default) | 'lunar'. */
  birthCalendarType?: 'solar' | 'lunar'
  /** Original 农历 input as YYYY-MM-DD; present ONLY when calendar === 'lunar'. */
  birthLunarInput?: string
  /** Whether the picked 农历 month was a leap month (闰月); calendar === 'lunar' only. */
  birthLunarIsLeap?: boolean
}

interface BirthInfoResponse {
  birthInfo: {
    birthSolarDate: string | null
    birthTimeIndex: number | null
    gender: '男' | '女' | null
    birthCity: string | null
    birthLatitude: string | null
    birthLongitude: string | null
    birthTimezoneId: string | null
    birthClockMinutes: number | null
    birthSolarCalibrate: boolean | null
    birthCalendarType: 'solar' | 'lunar' | null
    birthLunarInput: string | null
    birthLunarIsLeap: boolean | null
  } | null
}

async function signedBirthRequest(method: 'GET' | 'PUT', body?: FengBirthInfo): Promise<Response> {
  const userId = await getStoredFengUserId()
  if (!userId) throw new Error('birth_info_requires_auth')

  const path = '/api/portfolio/birth-info'
  const requestBody = method === 'PUT' ? JSON.stringify(body) : ''
  const signed = await signRequest({
    body: requestBody,
    userId,
    method,
    path,
  })
  if (!signed) throw new Error('birth_info_requires_device_secret')

  return fetch(`${config.apiUrl}${path}`, {
    method,
    headers: {
      ...(method === 'PUT' ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${userId}`,
      ...signed,
    },
    ...(method === 'PUT' ? { body: requestBody } : {}),
  })
}

export async function fetchBirthInfo(): Promise<FengBirthInfo | null> {
  const res = await signedBirthRequest('GET')
  if (!res.ok) throw new Error(`birth_info_fetch_failed:${res.status}`)
  const json = (await res.json()) as BirthInfoResponse
  const row = json.birthInfo
  if (!row?.birthSolarDate || row.birthTimeIndex == null) return null
  const gender = row.gender === '男' || row.gender === '女' ? row.gender : '男'
  return {
    birthSolarDate: row.birthSolarDate,
    birthTimeIndex: row.birthTimeIndex,
    gender,
    birthCity: row.birthCity ?? undefined,
    birthLatitude: row.birthLatitude ?? undefined,
    birthLongitude: row.birthLongitude ?? undefined,
    birthTimezoneId: row.birthTimezoneId ?? undefined,
    birthClockMinutes: row.birthClockMinutes ?? null,
    birthSolarCalibrate: row.birthSolarCalibrate ?? null,
    birthCalendarType: row.birthCalendarType === 'lunar' ? 'lunar' : 'solar',
    birthLunarInput: row.birthLunarInput ?? undefined,
    birthLunarIsLeap: row.birthLunarIsLeap ?? undefined,
  }
}

export async function saveBirthInfo(input: FengBirthInfo): Promise<void> {
  const res = await signedBirthRequest('PUT', input)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`birth_info_save_failed:${res.status}:${text}`)
  }
}
