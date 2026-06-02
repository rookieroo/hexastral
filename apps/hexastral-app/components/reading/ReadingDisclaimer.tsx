/**
 * 解读结果免责声明页脚
 *
 * 在所有命理解读结果底部显示
 * - 提醒用户仅供参考
 * - Apple 审核要求的免责声明
 */

import { AlertTriangle } from 'lucide-react-native'
import { Text, useColorScheme, View } from 'react-native'
import type { TranslationKeys } from '@/lib/i18n'
import { useI18n } from '@/lib/i18n'
import { theme } from '@/lib/theme'

interface ReadingDisclaimerProps {
  /** 解读类型，用于定制文案 */
  type?: 'stellar' | 'natal' | 'yiching' | 'physiognomy' | 'general'
}

const typeKeyMap: Record<string, TranslationKeys> = {
  stellar: 'disclaimer_type_stellar',
  natal: 'disclaimer_type_natal',
  yiching: 'disclaimer_type_yiching',
  /** Legacy / reserved — physiognomy SKU removed; copy falls back to general destiny wording. */
  physiognomy: 'disclaimer_type_general',
  general: 'disclaimer_type_general',
}

export function ReadingDisclaimer({ type = 'general' }: ReadingDisclaimerProps) {
  const colorScheme = useColorScheme()
  const colors = colorScheme === 'dark' ? theme.dark : theme.light
  const { t } = useI18n()

  const typeKey = typeKeyMap[type] ?? 'disclaimer_type_general'
  const typeText = t(typeKey)

  return (
    <View
      style={{
        marginTop: 20,
        marginBottom: 16,
        padding: 14,
        borderRadius: 0,
        backgroundColor: colors.surface,
        flexDirection: 'row',
        alignItems: 'flex-start',
      }}
    >
      <AlertTriangle size={16} color='#F59E0B' style={{ marginTop: 2, marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: '#F59E0B',
            marginBottom: 4,
          }}
        >
          {t('disclaimer_title')}
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: colors.textSecondary,
            lineHeight: 16,
          }}
        >
          {t('disclaimer_body', { type: typeText })}
        </Text>
      </View>
    </View>
  )
}

/**
 * 简版免责声明 - 用于空间有限的场景
 */
export function ReadingDisclaimerCompact() {
  const colorScheme = useColorScheme()
  const colors = colorScheme === 'dark' ? theme.dark : theme.light
  const { t } = useI18n()

  return (
    <View
      style={{
        marginTop: 12,
        paddingVertical: 8,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          fontSize: 10,
          color: colors.textSecondary,
          textAlign: 'center',
        }}
      >
        {t('disclaimer_compact')}
      </Text>
    </View>
  )
}
