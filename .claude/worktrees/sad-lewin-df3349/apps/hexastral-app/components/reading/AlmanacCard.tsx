/**
 * AlmanacCard — 日历通书展示卡片
 *
 * 显示当日干支、五行关系、吉色/吉方、宜忌。
 */

import { Text, View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { useIosPalette, useTheme } from '@/lib/theme'

interface AlmanacData {
  todayGanZhi: string
  todayElement: string
  dayMasterElement?: string
  elementRelation?: string
  luckyColor: string
  luckyDirection: string
  dos: string[]
  donts: string[]
  overallRating: 1 | 2 | 3 | 4 | 5
}

interface AlmanacCardProps {
  almanac: AlmanacData
}

const RATING_BARS = ['■', '■', '■', '■', '■'] as const

export function AlmanacCard({ almanac }: AlmanacCardProps) {
  const { colors, isDark } = useTheme()
  const { t } = useI18n()

  const ios = useIosPalette()

  return (
    <View
      style={{
        borderWidth: 0.5,
        borderColor: ios.separator,
        backgroundColor: ios.card,
        padding: 16,
        gap: 14,
      }}
    >
      {/* Header row: ganzhi + rating */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '500',
              color: ios.accent,
              letterSpacing: 4,
              textTransform: 'uppercase',
            }}
          >
            {t('almanac_section_title')}
          </Text>
          <Text style={{ fontSize: 26, fontWeight: '300', color: ios.text, marginTop: 2 }}>
            {almanac.todayGanZhi}
          </Text>
          {almanac.elementRelation ? (
            <Text style={{ fontSize: 12, color: ios.secondary, marginTop: 2 }}>
              {almanac.elementRelation}
            </Text>
          ) : null}
        </View>
        {/* Rating bars */}
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text style={{ fontSize: 11, color: ios.secondary, letterSpacing: 1 }}>
            {t('almanac_rating')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 3 }}>
            {RATING_BARS.map((bar, i) => (
              <Text
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length array
                key={i}
                style={{
                  fontSize: 14,
                  color: i < almanac.overallRating ? ios.accent : ios.dim,
                }}
              >
                {bar}
              </Text>
            ))}
          </View>
        </View>
      </View>

      {/* Lucky color + direction */}
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, color: ios.secondary, letterSpacing: 2, marginBottom: 3 }}>
            {t('almanac_lucky_color')}
          </Text>
          <Text style={{ fontSize: 14, color: ios.text }}>{almanac.luckyColor}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, color: ios.secondary, letterSpacing: 2, marginBottom: 3 }}>
            {t('almanac_lucky_direction')}
          </Text>
          <Text style={{ fontSize: 14, color: ios.text }}>{almanac.luckyDirection}</Text>
        </View>
      </View>

      {/* Dos */}
      <View>
        <Text
          style={{
            fontSize: 10,
            color: ios.secondary,
            letterSpacing: 2,
            marginBottom: 6,
          }}
        >
          {t('almanac_dos')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {almanac.dos.map((item) => (
            <View
              key={item}
              style={{
                borderWidth: 0.5,
                borderColor: ios.accent,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text style={{ fontSize: 12, color: ios.accent }}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Donts */}
      <View>
        <Text
          style={{
            fontSize: 10,
            color: ios.secondary,
            letterSpacing: 2,
            marginBottom: 6,
          }}
        >
          {t('almanac_donts')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {almanac.donts.map((item) => (
            <View
              key={item}
              style={{
                borderWidth: 0.5,
                borderColor: ios.dim,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text style={{ fontSize: 12, color: ios.secondary }}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}
