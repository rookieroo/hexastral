/**
 * Present Moment — 此刻 / 当下能量
 *
 * 复用 fateReading.aiReading.yearOverview / consensus.fusedConclusion
 * 强调"此时此刻你正在经历什么"，附 `查看完整命盘 ›` 文字链。
 */

import { useRouter } from 'expo-router'
import { Text, TouchableOpacity, View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

interface PresentMomentProps {
  fateId?: string | null
  yearOverview?: string | null
  fusedConclusion?: string | null
}

export function PresentMoment({ fateId, yearOverview, fusedConclusion }: PresentMomentProps) {
  const { colors } = useTheme()
  const { t } = useI18n()
  const router = useRouter()

  const body = yearOverview ?? fusedConclusion
  if (!body) return null

  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '500',
          color: colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 8,
        }}
      >
        {t('you_present_moment_title')}
      </Text>
      <View
        style={{
          marginHorizontal: 16,
          backgroundColor: colors.card,
          borderWidth: 0.5,
          borderColor: colors.border,
          padding: 16,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: '300',
            color: colors.text,
            lineHeight: 22,
          }}
          numberOfLines={4}
        >
          {body}
        </Text>
        {fateId ? (
          <TouchableOpacity
            onPress={() => router.push('/report' as never)}
            activeOpacity={0.6}
            style={{ marginTop: 12 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '400',
                color: colors.accent,
                letterSpacing: 1,
              }}
            >
              {t('you_present_moment_view_full')} ›
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  )
}
