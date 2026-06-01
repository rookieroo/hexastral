import type { NatalGeJu, NatalPillar } from '@zhop/hexastral-client'

/** Keys referenced by scenario-bazi UI — host `t` should accept at least this set. */
export type BaziScenarioI18nKey =
  | 'natal_four_pillars'
  | 'natal_pillar_year'
  | 'natal_pillar_month'
  | 'natal_pillar_day'
  | 'natal_pillar_hour'
  | 'natal_pillar_year_short'
  | 'natal_pillar_month_short'
  | 'natal_pillar_day_short'
  | 'natal_pillar_hour_short'
  | 'natal_overview'
  | 'natal_personality'
  | 'natal_career'
  | 'natal_relationship'
  | 'natal_wealth'
  | 'natal_health'
  | 'natal_yearly_tips'
  | 'natal_advice'
  | 'natal_ai_reading'
  | 'natal_day_master'
  | 'natal_day_master_strength'
  | 'natal_primary_pattern'
  | 'natal_secondary_pattern'
  | 'natal_favorable_god'
  | 'natal_unfavorable_god'
  | 'natal_ten_gods_distribution'

export type BaziScenarioTranslate = (
  key: BaziScenarioI18nKey,
  params?: Record<string, string | number>,
) => string

export type BaziScenarioColors = {
  background: string
  text: string
  textSecondary: string
  border: string
  accent: string
  primary: string
  card?: string
  surfaceSecondary?: string
}

export type GanZhiLike = { stem: string; branch: string }

function isGanZhiLike(v: unknown): v is GanZhiLike {
  return (
    typeof v === 'object' &&
    v !== null &&
    'stem' in v &&
    'branch' in v &&
    typeof (v as GanZhiLike).stem === 'string' &&
    typeof (v as GanZhiLike).branch === 'string'
  )
}

/** Map simplified four-pillars JSON (e.g. portfolio preview) into NatalPillar grid cells. */
export function mapUnknownToNatalPillars(raw: unknown): {
  year: NatalPillar
  month: NatalPillar
  day: NatalPillar
  hour: NatalPillar
} | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>
  const pillars = o.pillars
  if (typeof pillars !== 'object' || pillars === null) return null
  const p = pillars as Record<string, unknown>
  const mapOne = (v: unknown): NatalPillar | null => {
    if (!isGanZhiLike(v)) return null
    return { stem: v.stem, branch: v.branch, nayin: '' }
  }
  const year = mapOne(p.year)
  const month = mapOne(p.month)
  const day = mapOne(p.day)
  const hour = mapOne(p.hour)
  if (!year || !month || !day || !hour) return null
  return { year, month, day, hour }
}

/** Minimal geju card when only day-master element string is known (satellite preview). */
export function syntheticGejuFromDayMasterToken(dayMaster: string): NatalGeJu {
  return {
    primary: dayMaster,
    secondary: undefined,
    category: 'preview',
    dayMasterStrength: '—',
    favorableElement: dayMaster,
    unfavorableElement: '—',
    description: '',
  }
}
