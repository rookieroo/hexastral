import { config } from './config'
import { PORTFOLIO_TARGET_APP } from './growth-config'
import { signRequest } from './hmac'
import { getOrCreateAnonymousInstallId } from './install-id'
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

export type BirthSyncAccessStatus =
  | 'available'
  | 'empty'
  | 'multi_device_disabled'
  | 'cross_app_disabled'

export interface BirthSyncPreferences {
  multiDeviceSyncEnabled: boolean
  crossAppSyncEnabled: boolean
  sourceApp: string | null
  ownerInstallationId: string | null
  birthUpdatedAt: string | null
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
  status: BirthSyncAccessStatus
  sync: BirthSyncPreferences
}

async function getBirthCallerContext(): Promise<{ targetApp: string; installationId: string }> {
  const installationId = await getOrCreateAnonymousInstallId()
  return { targetApp: PORTFOLIO_TARGET_APP, installationId }
}

function birthInfoQueryString(ctx: { targetApp: string; installationId: string }): string {
  const params = new URLSearchParams({
    targetApp: ctx.targetApp,
    installationId: ctx.installationId,
  })
  return `?${params.toString()}`
}

async function signedBirthRequest(
  method: 'GET' | 'PUT',
  opts: { path: string; body?: string }
): Promise<Response> {
  const userId = await getStoredFengUserId()
  if (!userId) throw new Error('birth_info_requires_auth')

  const requestBody = opts.body ?? ''
  const signed = await signRequest({
    body: requestBody,
    userId,
    method,
    path: opts.path.split('?')[0] ?? opts.path,
  })
  if (!signed) throw new Error('birth_info_requires_device_secret')

  return fetch(`${config.apiUrl}${opts.path}`, {
    method,
    headers: {
      ...(requestBody.length > 0 ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${userId}`,
      ...signed,
    },
    ...(requestBody.length > 0 ? { body: requestBody } : {}),
  })
}

export async function fetchBirthInfo(): Promise<FengBirthInfo | null> {
  const ctx = await getBirthCallerContext()
  const path = `/api/portfolio/birth-info${birthInfoQueryString(ctx)}`
  const res = await signedBirthRequest('GET', { path })
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
  const ctx = await getBirthCallerContext()
  const path = '/api/portfolio/birth-info'
  const res = await signedBirthRequest('PUT', {
    path,
    body: JSON.stringify({ ...input, ...ctx }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`birth_info_save_failed:${res.status}:${text}`)
  }
}
