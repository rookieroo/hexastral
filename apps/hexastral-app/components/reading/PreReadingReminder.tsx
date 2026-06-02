/**
 * 解读前提醒 (§六B-2)
 *
 * 所有解读表单（yiching/stellar/fengshui/natal/physiognomy）
 * 提交按钮上方显示的一行小字提醒
 */

import { Sparkles } from 'lucide-react-native'
import { Text, useColorScheme, View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { ACTIVE_OPACITY, theme } from '@/lib/theme'

export function PreReadingReminder() {
  const colorScheme = useColorScheme()
  const colors = colorScheme === 'dark' ? theme.dark : theme.light
  const { t } = useI18n()
  const accentAlpha = Math.round(ACTIVE_OPACITY * 255)
    .toString(16)
    .padStart(2, '0')
  const borderAlpha = Math.round(ACTIVE_OPACITY * 2 * 255)
    .toString(16)
    .padStart(2, '0')

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 12,
        borderRadius: 0,
        backgroundColor: `${colors.accent}${accentAlpha}`,
        borderWidth: 0.5,
        borderColor: `${colors.accent}${borderAlpha}`,
      }}
    >
      <Sparkles size={14} color={colors.accent} style={{ marginTop: 2, marginRight: 8 }} />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '600',
            color: colors.accent,
            marginBottom: 2,
          }}
        >
          {t('pre_reading_title')}
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: colors.textSecondary,
            lineHeight: 16,
          }}
        >
          {t('pre_reading_body')}
        </Text>
      </View>
    </View>
  )
}
