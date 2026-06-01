import type { ChartInterpretation, ChartMeta } from '@zhop/hexastral-client'
import { Text, View } from 'react-native'
import type { ZiweiScenarioColors, ZiweiScenarioTranslate } from './types'

interface Props {
  meta: ChartMeta
  interpretation: ChartInterpretation | null
  colors: ZiweiScenarioColors
  t: ZiweiScenarioTranslate
}

export function StellarOverviewCard({ meta, interpretation, colors, t }: Props) {
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 0,
        padding: 20,
        marginBottom: 16,
        borderWidth: 0.5,
        borderColor: colors.border,
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: '600',
          color: colors.primary,
          marginBottom: 8,
          textAlign: 'center',
        }}
      >
        {meta.fiveElementsClass}
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: colors.textSecondary,
          textAlign: 'center',
          marginBottom: 4,
        }}
      >
        {meta.chineseDate}
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: colors.textSecondary,
          textAlign: 'center',
          marginBottom: 12,
        }}
      >
        {t('stellar_soul_star')} {meta.soul} · {t('stellar_body_star')} {meta.body}
      </Text>
      {interpretation ? (
        <View style={{ backgroundColor: `${colors.primary}15`, borderRadius: 0, padding: 12 }}>
          <Text
            style={{
              fontSize: 15,
              color: colors.primary,
              textAlign: 'center',
              fontWeight: '500',
            }}
          >
            {interpretation.summary}
          </Text>
        </View>
      ) : null}
    </View>
  )
}
