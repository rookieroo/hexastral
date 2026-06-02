/**
 * 解读结果底部免责语 (§六B-3)
 *
 * 在所有解读结果页底部固定展示
 * 内容来自 API response `disclaimer` 字段或直接使用 i18n key
 */

import { Scale } from 'lucide-react-native'
import { Text, useColorScheme, View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { theme } from '@/lib/theme'

export function ReadingResultFooter() {
  const colorScheme = useColorScheme()
  const colors = colorScheme === 'dark' ? theme.dark : theme.light
  const { t } = useI18n()

  return (
    <View
      style={{
        marginTop: 24,
        marginBottom: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 0,
        backgroundColor: colors.surface,
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderWidth: 0.5,
        borderColor: colors.border,
      }}
    >
      <Scale size={14} color={colors.textSecondary} style={{ marginTop: 2, marginRight: 10 }} />
      <Text
        style={{
          flex: 1,
          fontSize: 11,
          color: colors.textSecondary,
          lineHeight: 17,
        }}
      >
        {t('result_footer')}
      </Text>
    </View>
  )
}
