import { useCallback, useEffect, useState } from 'react'
import { resolvePortfolioApiUrl } from './api-url'
import { signRequest } from './hmac'
import { getPortfolioUserId } from './session'

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
  birthCity?: string
  birthLatitude?: string
  birthLongitude?: string
  birthTimezoneId?: string
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
  if (!signed) throw new Error('Birth info request requires deviceSecret.')

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

export async function getPortfolioBirthInfo(
  opts: BirthCallerContext
): Promise<PortfolioBirthInfoResponse> {
  const path = `${BIRTH_INFO_PATH}${birthInfoQueryString(opts)}`
  const res = await signedBirthRequest('GET', { path })
  if (!res.ok) throw new Error(`Birth info fetch failed: ${res.status}`)
  return (await res.json()) as PortfolioBirthInfoResponse
}

export async function saveAndCacheBirthInfo(
  input: PortfolioBirthInfo & BirthCallerContext
): Promise<void> {
  const res = await signedBirthRequest('PUT', {
    path: BIRTH_INFO_PATH,
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(`Birth info save failed: ${res.status}`)
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

export function usePortfolioBirthInfo(opts: BirthCallerContext): {
  birthInfo: PortfolioBirthInfo | null
  status: BirthSyncAccessStatus | null
  sync: BirthSyncPreferences | null
  loading: boolean
  refresh: () => Promise<void>
  save: (input: PortfolioBirthInfo) => Promise<void>
} {
  const [birthInfo, setBirthInfo] = useState<PortfolioBirthInfo | null>(null)
  const [status, setStatus] = useState<BirthSyncAccessStatus | null>(null)
  const [sync, setSync] = useState<BirthSyncPreferences | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const next = await getPortfolioBirthInfo(opts)
      setBirthInfo(next.birthInfo)
      setStatus(next.status)
      setSync(next.sync)
    } finally {
      setLoading(false)
    }
  }, [opts.targetApp, opts.installationId])

  const save = useCallback(
    async (input: PortfolioBirthInfo) => {
      await saveAndCacheBirthInfo({
        ...input,
        targetApp: opts.targetApp,
        installationId: opts.installationId,
      })
      setBirthInfo(input)
    },
    [opts.targetApp, opts.installationId]
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { birthInfo, status, sync, loading, refresh, save }
}
