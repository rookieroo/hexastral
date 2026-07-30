/**
 * Birth profile for Life axis / What-if — portfolio birth-info + draft fallback.
 */

import { getOrCreateAnonymousInstallId, getPortfolioBirthInfo } from '@zhop/satellite-runtime'

import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from './growth-config'
import { getReadingDraft, hydrateReadingDraft } from './reading-draft'

export type XingqiBirth = {
  date: string
  /** 0–23, or -1 when 时辰 unknown */
  hour: number
  gender: 'M' | 'F'
}

async function birthCallerContext() {
  const installationId = await getOrCreateAnonymousInstallId(PORTFOLIO_STORAGE_PREFIX)
  return { targetApp: PORTFOLIO_TARGET_APP, installationId }
}

export async function loadXingqiBirth(): Promise<XingqiBirth | null> {
  try {
    const ctx = await birthCallerContext()
    const remote = await getPortfolioBirthInfo(ctx)
    if (remote.birthInfo?.birthSolarDate && remote.birthInfo.gender) {
      const { birthTimeIndex } = remote.birthInfo
      const hour =
        typeof birthTimeIndex === 'number' && birthTimeIndex >= 0 ? (birthTimeIndex * 2) % 24 : -1
      return {
        date: remote.birthInfo.birthSolarDate,
        hour,
        gender: remote.birthInfo.gender === '女' ? 'F' : 'M',
      }
    }
  } catch {
    // fall through to draft
  }

  await hydrateReadingDraft()
  const d = getReadingDraft()
  if (!d.solarDate || !d.gender) return null
  const hour = typeof d.timeIndex === 'number' && d.timeIndex >= 0 ? (d.timeIndex * 2) % 24 : -1
  return {
    date: d.solarDate,
    hour,
    gender: d.gender === '女' ? 'F' : 'M',
  }
}
