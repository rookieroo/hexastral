/**
 * 解读前引导弹窗 — 底部抽屉样式 (Apple Sheet)
 *
 * 首次执行某类占卜前自动弹出；页面上 ⓘ 按钮可随时重开。
 * 支持不同占卜类型显示定制化星象引导文字。
 *
 * Props:
 *   type    – 占卜类型，决定显示哪段引导语
 *   visible – 是否显示
 *   onConfirm – 点击确认或背景时关闭的回调
 */

import { Sparkles, Star } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

export type BeforeReadingType = 'yiching' | 'stellar'

interface BeforeReadingModalProps {
  visible: boolean
  onConfirm: () => void
  type?: BeforeReadingType
}

const TYPE_CONFIG: Record<
  BeforeReadingType,
  { bodyKey: string; icon: (color: string) => ReactNode; accentColor: string }
> = {
  yiching: {
    bodyKey: 'before_reading_modal_body_yiching',
    icon: (color) => <Sparkles size={22} color={color} />,
    accentColor: '#B8860B',
  },
  stellar: {
    bodyKey: 'before_reading_modal_body_stellar',
    icon: (color) => <Star size={22} color={color} />,
    accentColor: '#71717A',
  },
}

export function BeforeReadingModal({
  visible,
  onConfirm,
  type = 'yiching',
}: BeforeReadingModalProps) {
  const { colors, isDark } = useTheme()
  const { t } = useI18n()

  const config = TYPE_CONFIG[type]
  const bodyText = t(config.bodyKey as Parameters<typeof t>[0])

  return (
    <Modal visible={visible} transparent animationType='slide' statusBarTranslucent>
      {/* Backdrop — tap to dismiss */}
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}
        onPress={onConfirm}
      >
        {/* Sheet — intercept touch so backdrop tap doesn't propagate */}
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: isDark ? '#18181B' : '#FFFFFF',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: 40,
          }}
        >
          {/* Apple-style drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: isDark ? '#52525B' : '#A1A1AA',
              }}
            />
          </View>

          <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 }}>
            {/* Header row: accent icon + title */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              {config.icon(config.accentColor)}
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: '600',
                  color: colors.text,
                  letterSpacing: 0.3,
                }}
              >
                {t('before_reading_modal_title')}
              </Text>
            </View>

            {/* Type-specific body */}
            <Text
              style={{
                fontSize: 15,
                color: colors.textSecondary,
                lineHeight: 24,
                marginBottom: 28,
              }}
            >
              {bodyText}
            </Text>

            {/* Confirm button */}
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => ({
                backgroundColor: config.accentColor,
                borderRadius: 0,
                paddingVertical: 16,
                alignItems: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text
                style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF', letterSpacing: 0.5 }}
              >
                {t('before_reading_modal_confirm')}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
