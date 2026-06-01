/**
 * Guard 拦截反馈弹窗 — Ink Brutalism
 *
 * 当 API 返回 guard_blocked 时显示，展示文化风格的拦截原因 (guardKey → i18n)
 */

import { ShieldAlert, X } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'
import { BaseModal } from '@/components/modal/BaseModal'
import type { TranslationKeys } from '@/lib/i18n'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

interface GuardBlockModalProps {
  visible: boolean
  /** API 返回的 guardKey (如 'guard_chart', 'guard_duplicate') */
  guardKey?: string
  onDismiss: () => void
}

export function GuardBlockModal({ visible, guardKey, onDismiss }: GuardBlockModalProps) {
  const { colors } = useTheme()
  const { t } = useI18n()

  // Resolve translated body — fall back to guard_chart message if key not found
  const resolvedKey = (guardKey ?? 'guard_chart') as TranslationKeys
  const title = t('guard_blocked_title')
  const body = t(resolvedKey) || t('guard_chart' as TranslationKeys)

  return (
    <BaseModal visible={visible} onDismiss={onDismiss} position='center'>
      <View
        style={{
          width: '100%',
          maxWidth: 340,
          backgroundColor: colors.card,
          borderWidth: 0.5,
          borderColor: colors.border,
          padding: 24,
          alignItems: 'center',
        }}
      >
        {/* 关闭 */}
        <Pressable
          onPress={onDismiss}
          style={{ position: 'absolute', top: 16, right: 16 }}
          hitSlop={12}
        >
          <X size={20} color={colors.textSecondary} strokeWidth={1.5} />
        </Pressable>

        {/* 图标 */}
        <View
          style={{
            width: 48,
            height: 48,
            borderWidth: 0.5,
            borderColor: colors.border,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
            marginTop: 8,
          }}
        >
          <ShieldAlert size={24} color={colors.accent} strokeWidth={1.5} />
        </View>

        {/* 标题 */}
        <Text
          style={{
            fontSize: 15,
            fontWeight: '500',
            color: colors.text,
            marginBottom: 12,
            textAlign: 'center',
            letterSpacing: 0.5,
          }}
        >
          {title}
        </Text>

        {/* 内容 */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: '300',
            color: colors.textSecondary,
            lineHeight: 20,
            textAlign: 'center',
            marginBottom: 24,
            paddingHorizontal: 4,
          }}
        >
          {body}
        </Text>

        {/* CTA — Ink Brutalism flat button */}
        <Pressable
          onPress={onDismiss}
          style={({ pressed }) => ({
            borderWidth: 0.5,
            borderColor: colors.text,
            paddingVertical: 10,
            paddingHorizontal: 32,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '400',
              color: colors.text,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            {t('confirm')}
          </Text>
        </Pressable>
      </View>
    </BaseModal>
  )
}
