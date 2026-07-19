/**
 * Birth profile for Life axis / What-if — portfolio birth-info + draft fallback.
 */

import { getPortfolioBirthInfo } from '@zhop/satellite-runtime'

import { getReadingDraft, hydrateReadingDraft } from './reading-draft'

export type XingqiBirth = {
  date: string
  /** 0–23, or -1 when 时辰 unknown */
  hour: number
  gender: 'M' | 'F'
}

export async function loadXingqiBirth(): Promise<XingqiBirth | null> {
  try {
    const remote = await getPortfolioBirthInfo()
    if (remote?.birthSolarDate && remote.gender) {
      const hour =
        typeof remote.birthTimeIndex === 'number' && remote.birthTimeIndex >= 0
          ? (remote.birthTimeIndex * 2) % 24
          : -1
      return {
        date: remote.birthSolarDate,
        hour,
        gender: remote.gender === '女' ? 'F' : 'M',
      }
    }
  } catch {
    // fall through to draft
  }

  await hydrateReadingDraft()
  const d = getReadingDraft()
  if (!d.solarDate || !d.gender) return null
  const hour =
    typeof d.timeIndex === 'number' && d.timeIndex >= 0 ? (d.timeIndex * 2) % 24 : -1
  return {
    date: d.solarDate,
    hour,
    gender: d.gender === '女' ? 'F' : 'M',
  }
}
