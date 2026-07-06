import { getBirthInfo, saveBirthInfo } from '@zhop/portfolio-client'
import { getPortfolioUserId } from '@zhop/satellite-runtime'

/**
 * CoinCast birth info — portfolio SSOT (`/api/portfolio/birth-info`).
 * Shape matches Fēng / Yuun / Yuel single-page birth forms.
 */
export interface CoincastBirthInfo {
  birthSolarDate: string
  birthTimeIndex: number
  gender: '男' | '女'
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

export async function fetchBirthInfo(): Promise<CoincastBirthInfo | null> {
  const userId = await getPortfolioUserId()
  if (!userId) return null

  const { birthInfo } = await getBirthInfo()
  const row = birthInfo
  if (!row?.birthSolarDate || row.birthTimeIndex == null) return null

  const gender = row.gender === '男' || row.gender === '女' ? row.gender : '男'
  return {
    birthSolarDate: row.birthSolarDate,
    birthTimeIndex: row.birthTimeIndex,
    gender,
    birthCity: row.birthCity,
    birthLatitude: row.birthLatitude,
    birthLongitude: row.birthLongitude,
    birthTimezoneId: row.birthTimezoneId,
    birthClockMinutes: row.birthClockMinutes ?? null,
    birthSolarCalibrate: row.birthSolarCalibrate ?? null,
    birthCalendarType: row.birthCalendarType === 'lunar' ? 'lunar' : 'solar',
    birthLunarInput: row.birthLunarInput,
    birthLunarIsLeap: row.birthLunarIsLeap,
  }
}

export async function saveCoincastBirthInfo(input: CoincastBirthInfo): Promise<void> {
  await saveBirthInfo({
    birthSolarDate: input.birthSolarDate,
    birthTimeIndex: input.birthTimeIndex,
    gender: input.gender,
    birthCity: input.birthCity,
    birthLatitude: input.birthLatitude,
    birthLongitude: input.birthLongitude,
    birthTimezoneId: input.birthTimezoneId,
    birthClockMinutes: input.birthClockMinutes ?? undefined,
    birthSolarCalibrate: input.birthSolarCalibrate ?? undefined,
    birthCalendarType: input.birthCalendarType,
    birthLunarInput: input.birthLunarInput,
    birthLunarIsLeap: input.birthLunarIsLeap,
  })
}
