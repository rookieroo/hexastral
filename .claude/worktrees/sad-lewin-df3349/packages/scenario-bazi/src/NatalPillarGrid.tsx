import type { NatalPillar } from '@zhop/hexastral-client'
import { Text, View } from 'react-native'
import { stemAccent } from './baziStemAccent'
import type { BaziScenarioColors, BaziScenarioI18nKey, BaziScenarioTranslate } from './types'

const PILLAR_NAME_KEYS: Record<'year' | 'month' | 'day' | 'hour', BaziScenarioI18nKey> = {
  year: 'natal_pillar_year',
  month: 'natal_pillar_month',
  day: 'natal_pillar_day',
  hour: 'natal_pillar_hour',
}

interface Props {
  pillars: {
    year: NatalPillar
    month: NatalPillar
    day: NatalPillar
    hour: NatalPillar
  }
  colors: BaziScenarioColors
  t: BaziScenarioTranslate
}

export function NatalPillarGrid({ pillars, colors, t }: Props) {
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
        {t('natal_four_pillars')}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        {(['hour', 'day', 'month', 'year'] as const).map((pillar) => {
          const p = pillars[pillar]
          const stemColor = stemAccent(p.stem, colors.text)
          const nameKey = PILLAR_NAME_KEYS[pillar]
          return (
            <View key={pillar} style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>
                {nameKey ? t(nameKey) : pillar}
              </Text>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: '600',
                  color: stemColor,
                  marginBottom: 4,
                }}
              >
                {p.stem}
              </Text>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: '600',
                  color: colors.text,
                  marginBottom: 8,
                }}
              >
                {p.branch}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>{p.nayin}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}
