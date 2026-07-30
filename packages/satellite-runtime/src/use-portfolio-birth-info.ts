import { resolvePortfolioApiUrl } from './api-url'
import { signRequest } from './hmac'
import {
  getPortfolioUserId,
  invalidatePortfolioSession,
  repairPortfolioCredentialMismatch,
} from './session'

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

export interface PortfolioBirthInfo {
  birthSolarDate: string
  /** null = unknown 时辰 (Yuun). */
  birthTimeIndex: number | null
  gender?: '男' | '女'
  /** null clears a previously saved city (时辰-only mode). */
  birthCity?: string | null
  birthLatitude?: string | null
  birthLongitude?: string | null
  birthTimezoneId?: string | null
  birthClockMinutes?: number | null
  birthSolarCalibrate?: boolean | null
  birthCalendarType?: 'solar' | 'lunar'
  birthLunarInput?: string
  birthLunarIsLeap?: boolean
}

export interface BirthCallerContext {
  targetApp: string
  installationId: string
}

export interface PortfolioBirthInfoResponse {
  birthInfo: PortfolioBirthInfo | null
  status: BirthSyncAccessStatus
  sync: BirthSyncPreferences
}

const BIRTH_INFO_PATH = '/api/portfolio/birth-info'
const BIRTH_SYNC_PREFERENCES_PATH = '/api/portfolio/birth-sync-preferences'

function birthInfoQueryString(opts: BirthCallerContext): string {
  const params = new URLSearchParams({
    targetApp: opts.targetApp,
    installationId: opts.installationId,
  })
  return `?${params.toString()}`
}

async function signedBirthRequest(
  method: 'GET' | 'PUT' | 'PATCH',
  opts: { path: string; body?: string }
): Promise<Response> {
  await repairPortfolioCredentialMismatch()
  const userId = await getPortfolioUserId()
  if (!userId) throw new Error('Birth info requires authenticated user.')

  const url = `${resolvePortfolioApiUrl()}${opts.path}`
  const requestBody = opts.body ?? ''
  const signed = await signRequest({
    body: requestBody,
    userId,
    method,
    path: opts.path.split('?')[0] ?? opts.path,
  })
  if (!signed) {
    await invalidatePortfolioSession()
    throw new Error('Birth info request requires deviceSecret.')
  }

  return fetch(url, {
    method,
    headers: {
      ...(requestBody.length > 0 ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${userId}`,
      ...signed,
    },
    ...(requestBody.length > 0 ? { body: requestBody } : {}),
  })
}

async function birthErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const raw: unknown = await res.json()
    if (raw && typeof raw === 'object') {
      const topLevelError = 'error' in raw ? raw.error : undefined
      if (topLevelError && typeof topLevelError === 'object') {
        const nestedMessage =
          'message' in topLevelError && typeof topLevelError.message === 'string'
            ? topLevelError.message
            : null
        if (nestedMessage) return `${fallback}: ${res.status} ${nestedMessage}`

        const nestedCode =
          'code' in topLevelError && typeof topLevelError.code === 'string'
            ? topLevelError.code
            : null
        if (nestedCode) return `${fallback}: ${res.status} ${nestedCode}`
      }

      const code = 'code' in raw && typeof raw.code === 'string' ? raw.code : null
      if (code) return `${fallback}: ${res.status} ${code}`

      const detail =
        typeof topLevelError === 'string'
          ? topLevelError
          : 'message' in raw && typeof raw.message === 'string'
            ? raw.message
            : null
      if (detail) return `${fallback}: ${res.status} ${detail}`
    }
  } catch {
    // body may be empty / non-JSON
  }
  return `${fallback}: ${res.status}`
}

export async function getPortfolioBirthInfo(
  opts: BirthCallerContext
): Promise<PortfolioBirthInfoResponse> {
  const path = `${BIRTH_INFO_PATH}${birthInfoQueryString(opts)}`
  const res = await signedBirthRequest('GET', { path })
  if (!res.ok) throw new Error(await birthErrorMessage(res, 'Birth info fetch failed'))
  return (await res.json()) as PortfolioBirthInfoResponse
}

export async function saveAndCacheBirthInfo(
  input: PortfolioBirthInfo & BirthCallerContext
): Promise<void> {
  const res = await signedBirthRequest('PUT', {
    path: BIRTH_INFO_PATH,
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await birthErrorMessage(res, 'Birth info save failed'))
}

export async function updateBirthSyncPreferences(input: {
  targetApp: string
  installationId: string
  multiDeviceSyncEnabled?: boolean
  crossAppSyncEnabled?: boolean
}): Promise<{ ok: boolean; sync: BirthSyncPreferences }> {
  const res = await signedBirthRequest('PATCH', {
    path: BIRTH_SYNC_PREFERENCES_PATH,
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(`Birth sync preferences update failed: ${res.status}`)
  return (await res.json()) as { ok: boolean; sync: BirthSyncPreferences }
}
