import type { NatalGeJu } from '@zhop/hexastral-client'
import { Text, View } from 'react-native'
import { elementAccent, stemAccent } from './baziStemAccent'
import type { BaziScenarioColors, BaziScenarioTranslate } from './types'

interface Props {
  dayMaster: string
  geju: NatalGeJu
  colors: BaziScenarioColors
  t: BaziScenarioTranslate
}

export function NatalGejuCard({ dayMaster, geju, colors, t }: Props) {
  return (
    <View
      style={{
        borderWidth: 0.5,
        borderColor: colors.border,
        padding: 20,
        marginBottom: 20,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <View>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t('natal_day_master')}</Text>
          <Text
            style={{
              fontSize: 24,
              fontWeight: '600',
              color: stemAccent(dayMaster, colors.text),
            }}
          >
            {dayMaster}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            {t('natal_day_master_strength')}
          </Text>
          <Text style={{ fontSize: 18, fontWeight: '500', color: colors.text }}>
            {geju.dayMasterStrength}
          </Text>
        </View>
      </View>
      <View style={{ borderTopWidth: 0.5, borderTopColor: colors.border, paddingTop: 12 }}>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
          {t('natal_primary_pattern')}
        </Text>
        <Text style={{ fontSize: 18, fontWeight: '500', color: colors.primary }}>{geju.primary}</Text>
        {geju.secondary ? (
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
            {t('natal_secondary_pattern')}
            {geju.secondary}
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
        <View>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t('natal_favorable_god')}</Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '500',
              color: elementAccent(geju.favorableElement?.[0] ?? '', colors.accent),
            }}
          >
            {geju.favorableElement}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t('natal_unfavorable_god')}</Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '500',
              color: elementAccent(geju.unfavorableElement?.[0] ?? '', colors.textSecondary),
            }}
          >
            {geju.unfavorableElement}
          </Text>
        </View>
      </View>
    </View>
  )
}
