import type { FourPillars } from '@zhop/astro-core'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8787' : 'https://api.hexastral.com')

export interface PersonInput {
  solarDate: string // YYYY-MM-DD
  timeIndex: number // 0-12
  isLunar?: boolean
  isLeapMonth?: boolean
  useTrueSolarTime?: boolean
  exactTime?: string
  gender: 'male' | 'female'
  name?: string
  birthCity?: string
  latitude?: number
  longitude?: number
  timezone?: string
}

export interface BasicChartResult {
  pillars: FourPillars
  dayMaster: string
  monthBranch: string
  coldReading: string
}

export interface CompatibilityPreviewResult {
  score: number
  grade: string
  personA: { dayMaster: string; pillars: FourPillars }
  personB: { dayMaster: string; pillars: FourPillars }
  highlights: string[]
}

/** 计算个人基础命盘（供 H5 Onboarding 预览使用，经过 Hono Turnstile 校验） */
export async function computeBasicChart(
  person: PersonInput,
  turnstileToken: string
): Promise<BasicChartResult> {
  const res = await fetch(`${API_URL}/api/onboarding/chart/basic`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Platform': 'web',
      'X-Turnstile-Token': turnstileToken,
    },
    body: JSON.stringify(person),
  })

  if (!res.ok) {
    throw new Error('Failed to compute basic chart')
  }

  return res.json()
}

/** 计算双人配对预览（供 H5 合盘模式使用，经过 Hono Turnstile 校验） */
export async function computeCompatibilityPreview(
  personA: PersonInput,
  personB: PersonInput,
  turnstileToken: string
): Promise<CompatibilityPreviewResult> {
  const res = await fetch(`${API_URL}/api/onboarding/chart/compatibility`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Platform': 'web',
      'X-Turnstile-Token': turnstileToken,
    },
    body: JSON.stringify({ personA, personB }),
  })

  if (!res.ok) {
    throw new Error('Failed to compute compatibility preview')
  }

  return res.json()
}
