/**
 * Shared types for Xingqi Life axis (mirrors Auspice TimelinePayload shape).
 */

export type PersonalFit = '吉' | '平' | '凶'

export type PillarUnit = { stem: string; branch: string; element: string }

export type PeriodFit = {
  fit: PersonalFit
  reasons: string[]
  ziwei?: { tone: 'harmony' | 'tension' | 'growth' | 'neutral' }
}

export type LiunianRow = PeriodFit & {
  year: number
  pillar: PillarUnit
  age: number
  isCurrent: boolean
}

export type DayunRow = PeriodFit & {
  index: number
  pillar: PillarUnit
  startYear: number
  endYear: number
  startAge: number
  endAge: number
  isCurrent: boolean
  liunian: LiunianRow[]
}

export type LiuyueRow = PeriodFit & {
  year: number
  month: number
  pillar: PillarUnit
  isCurrent: boolean
}

export type TimelinePayload = {
  schemaVersion: number
  computedAt: string
  birth: { date: string; hour: number; gender: 'M' | 'F' }
  pillars: {
    year: PillarUnit
    month: PillarUnit
    day: PillarUnit
    hour: PillarUnit | null
  }
  dayun: DayunRow[]
  currentDayunIndex: number
  liunian: LiunianRow[]
  currentLiunianIndex: number
  liuyue: LiuyueRow[]
}

export type DrilldownYear = {
  gz: string
  year: number
  fit: PersonalFit
  isCurrent: boolean
  age?: number
  element?: string
}

export type LiuyueCell = {
  month: number
  label: string
  stem: string
  branch: string
  element: string
  fit: PersonalFit
}

export type NodeDetail = {
  heading: string
  body: string
  fit: PersonalFit | null
}
