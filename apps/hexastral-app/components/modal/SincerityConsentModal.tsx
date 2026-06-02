/**
 * 诚心则灵弹窗 (§六B-1)
 *
 * 用户第一次触发任何占卜/排盘功能前显示
 * 独立于 KarmaDisclaimerModal（法律免责），此弹窗强调文化诚意
 * - AsyncStorage key: hexastral_sincerity_consent
 * - 版本号可强制重新显示
 */

import { Sparkles } from 'lucide-react-native'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

interface SincerityConsentModalProps {
  visible: boolean
  onAccept: () => void
}

export function SincerityConsentModal({ visible, onAccept }: SincerityConsentModalProps) {
  const { colors } = useTheme()
  const { t } = useI18n()

  const rules = [
    t('sincerity_rule1'),
    t('sincerity_rule2'),
    t('sincerity_rule3'),
    t('sincerity_rule4'),
  ]

  return (
    <Modal visible={visible} transparent={false} animationType='fade'>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={{
            padding: 24,
            paddingTop: 80,
            paddingBottom: 120,
          }}
        >
          {/* 图标 + 标题 */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 0,
                backgroundColor: '#8B5CF620',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <Sparkles size={40} color='#8B5CF6' />
            </View>
            <Text
              style={{
                fontSize: 26,
                fontWeight: '700',
                color: colors.text,
                marginBottom: 12,
                textAlign: 'center',
              }}
            >
              {t('sincerity_title')}
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: colors.textSecondary,
                textAlign: 'center',
                lineHeight: 22,
                paddingHorizontal: 16,
              }}
            >
              {t('sincerity_subtitle')}
            </Text>
          </View>

          {/* 诚意约定 */}
          <View style={{ marginBottom: 32 }}>
            {rules.map((rule, index) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 0,
                  backgroundColor: colors.card,
                  marginBottom: 10,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: '#8B5CF6',
                    marginRight: 14,
                    marginTop: 4,
                    letterSpacing: 0.5,
                  }}
                >
                  {String(index + 1).padStart(2, '0')}
                </Text>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: colors.text,
                    lineHeight: 21,
                  }}
                >
                  {rule}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* 同意按钮 — 固定底部 */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: 24,
            paddingBottom: 40,
            backgroundColor: colors.background,
            borderTopWidth: 0.5,
            borderTopColor: colors.border,
          }}
        >
          <Pressable
            onPress={onAccept}
            style={{
              alignItems: 'center',
              paddingVertical: 16,
              borderRadius: 0,
              backgroundColor: '#8B5CF6',
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#fff' }}>
              {t('sincerity_accept')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}
