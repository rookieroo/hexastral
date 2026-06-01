import type { NatalInterpretation as NatalInterpretationType } from '@zhop/hexastral-client'
import { Text, View } from 'react-native'
import type { BaziScenarioColors, BaziScenarioTranslate } from './types'

interface Props {
  interpretation: NatalInterpretationType
  colors: BaziScenarioColors
  t: BaziScenarioTranslate
}

export function NatalInterpretationCard({ interpretation, colors, t }: Props) {
  const sections = [
    { label: t('natal_overview'), value: interpretation.overview },
    { label: t('natal_personality'), value: interpretation.personality },
    { label: t('natal_career'), value: interpretation.career },
    { label: t('natal_relationship'), value: interpretation.relationship },
    { label: t('natal_wealth'), value: interpretation.wealth },
    { label: t('natal_health'), value: interpretation.health },
    { label: t('natal_yearly_tips'), value: interpretation.luckyYears },
    { label: t('natal_advice'), value: interpretation.advice },
  ].filter(({ value }) => !!value)

  if (sections.length === 0) return null

  return (
    <View style={{ marginBottom: 20 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '500',
          color: colors.accent,
          letterSpacing: 4,
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        {t('natal_ai_reading')}
      </Text>
      {sections.map(({ label, value }) => (
        <View key={label} style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '500',
              color: colors.accent,
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            {label}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '300', color: colors.text, lineHeight: 22 }}>
            {value}
          </Text>
        </View>
      ))}
    </View>
  )
}
