import type { FourPillarsShiShen } from '@zhop/hexastral-client'
import { Text, View } from 'react-native'
import type { BaziScenarioColors, BaziScenarioI18nKey, BaziScenarioTranslate } from './types'

const PILLAR_SHORT_KEYS: Record<'year' | 'month' | 'day' | 'hour', BaziScenarioI18nKey> = {
  year: 'natal_pillar_year_short',
  month: 'natal_pillar_month_short',
  day: 'natal_pillar_day_short',
  hour: 'natal_pillar_hour_short',
}

type RawShiShenEntry = { name?: string; abbr?: string }
type RawShiShen = {
  year?: RawShiShenEntry
  month?: RawShiShenEntry
  hour?: RawShiShenEntry
  yearBranchHidden?: RawShiShenEntry[]
  monthBranchHidden?: RawShiShenEntry[]
  dayBranchHidden?: RawShiShenEntry[]
  hourBranchHidden?: RawShiShenEntry[]
}

interface Props {
  shishen: FourPillarsShiShen
  colors: BaziScenarioColors
  t: BaziScenarioTranslate
}

export function NatalShiShenGrid({ shishen, colors, t }: Props) {
  const raw = shishen as unknown as RawShiShen

  const pillars: Array<{
    key: 'year' | 'month' | 'day' | 'hour'
    stem: string
    branchMain: string
    branchMid?: string
  }> = [
    {
      key: 'hour',
      stem: raw.hour?.abbr ?? (shishen.hour as unknown as Record<string, string>)?.stem ?? '',
      branchMain:
        raw.hourBranchHidden?.[0]?.abbr ??
        (shishen.hour as unknown as Record<string, string>)?.branchMain ??
        '',
      branchMid:
        raw.hourBranchHidden?.[1]?.abbr ??
        (shishen.hour as unknown as Record<string, string>)?.branchMid,
    },
    {
      key: 'day',
      stem: '日',
      branchMain:
        raw.dayBranchHidden?.[0]?.abbr ??
        (shishen.day as unknown as Record<string, string>)?.branchMain ??
        '',
      branchMid:
        raw.dayBranchHidden?.[1]?.abbr ??
        (shishen.day as unknown as Record<string, string>)?.branchMid,
    },
    {
      key: 'month',
      stem: raw.month?.abbr ?? (shishen.month as unknown as Record<string, string>)?.stem ?? '',
      branchMain:
        raw.monthBranchHidden?.[0]?.abbr ??
        (shishen.month as unknown as Record<string, string>)?.branchMain ??
        '',
      branchMid:
        raw.monthBranchHidden?.[1]?.abbr ??
        (shishen.month as unknown as Record<string, string>)?.branchMid,
    },
    {
      key: 'year',
      stem: raw.year?.abbr ?? (shishen.year as unknown as Record<string, string>)?.stem ?? '',
      branchMain:
        raw.yearBranchHidden?.[0]?.abbr ??
        (shishen.year as unknown as Record<string, string>)?.branchMain ??
        '',
      branchMid:
        raw.yearBranchHidden?.[1]?.abbr ??
        (shishen.year as unknown as Record<string, string>)?.branchMid,
    },
  ]

  return (
    <View
      style={{
        borderWidth: 0.5,
        borderColor: colors.border,
        padding: 20,
        marginBottom: 20,
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: '600',
          color: colors.text,
          marginBottom: 16,
          textAlign: 'center',
        }}
      >
        {t('natal_ten_gods_distribution')}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        {pillars.map(({ key, stem, branchMain, branchMid }) => {
          const shortKey = PILLAR_SHORT_KEYS[key]
          return (
            <View key={key} style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>
                {shortKey ? t(shortKey) : key}
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.primary }}>{stem}</Text>
              {branchMain ? (
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                  {branchMain}
                </Text>
              ) : null}
              {branchMid ? (
                <Text style={{ fontSize: 10, color: colors.textSecondary }}>{branchMid}</Text>
              ) : null}
            </View>
          )
        })}
      </View>
    </View>
  )
}
