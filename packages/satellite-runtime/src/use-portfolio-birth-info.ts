import { useCallback, useEffect, useState } from 'react'
import { resolvePortfolioApiUrl } from './api-url'
import { signRequest } from './hmac'
import { getPortfolioUserId } from './session'

export interface PortfolioBirthInfo {
  birthSolarDate: string
  birthTimeIndex: number
  gender?: '男' | '女'
  birthCity?: string
  birthLatitude?: string
  birthLongitude?: string
  birthTimezoneId?: string
}

interface BirthInfoResponse {
  birthInfo: PortfolioBirthInfo | null
}

async function signedBirthRequest(
  method: 'GET' | 'PUT',
  body?: PortfolioBirthInfo
): Promise<Response> {
  const userId = await getPortfolioUserId()
  if (!userId) throw new Error('Birth info requires authenticated user.')

  const path = '/api/portfolio/birth-info'
  const url = `${resolvePortfolioApiUrl()}${path}`
  const requestBody = method === 'PUT' ? JSON.stringify(body) : ''
  const signed = await signRequest({
    body: requestBody,
    userId,
    method,
    path,
  })
  if (!signed) throw new Error('Birth info request requires deviceSecret.')

  return fetch(url, {
    method,
    headers: {
      ...(method === 'PUT' ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${userId}`,
      ...signed,
    },
    ...(method === 'PUT' ? { body: requestBody } : {}),
  })
}

export async function getPortfolioBirthInfo(): Promise<PortfolioBirthInfo | null> {
  const res = await signedBirthRequest('GET')
  if (!res.ok) throw new Error(`Birth info fetch failed: ${res.status}`)
  const json = (await res.json()) as BirthInfoResponse
  return json.birthInfo
}

export async function saveAndCacheBirthInfo(input: PortfolioBirthInfo): Promise<void> {
  const res = await signedBirthRequest('PUT', input)
  if (!res.ok) throw new Error(`Birth info save failed: ${res.status}`)
}

export function usePortfolioBirthInfo(): {
  birthInfo: PortfolioBirthInfo | null
  loading: boolean
  refresh: () => Promise<void>
  save: (input: PortfolioBirthInfo) => Promise<void>
} {
  const [birthInfo, setBirthInfo] = useState<PortfolioBirthInfo | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const next = await getPortfolioBirthInfo()
      setBirthInfo(next)
    } finally {
      setLoading(false)
    }
  }, [])

  const save = useCallback(async (input: PortfolioBirthInfo) => {
    await saveAndCacheBirthInfo(input)
    setBirthInfo(input)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { birthInfo, loading, refresh, save }
}
