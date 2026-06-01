import { config } from './config'
import { getStoredFengUserId } from './user-session'
import { signRequest } from './hmac'

export interface FengBirthInfo {
  birthSolarDate: string
  birthTimeIndex: number
  gender: '男' | '女'
  birthCity?: string
  birthLatitude?: string
  birthLongitude?: string
  birthTimezoneId?: string
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
  } | null
}

async function signedBirthRequest(
  method: 'GET' | 'PUT',
  body?: FengBirthInfo
): Promise<Response> {
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
  }
}

export async function saveBirthInfo(input: FengBirthInfo): Promise<void> {
  const res = await signedBirthRequest('PUT', input)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`birth_info_save_failed:${res.status}:${text}`)
  }
}
