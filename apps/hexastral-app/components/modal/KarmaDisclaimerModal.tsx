/**
 * 因果免责声明弹窗
 *
 * App 首次启动时弹出，用户需同意方可继续使用
 * - Apple 审核要求的命理类 App 免责声明
 * - 用户同意后存储到 AsyncStorage
 * - 保护用户免于过度依赖命理预测
 */

import { AlertTriangle, CheckCircle, Scale } from 'lucide-react-native'
import { Modal, ScrollView, Text, View } from 'react-native'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

interface KarmaDisclaimerModalProps {
  visible: boolean
  onAccept: () => void
}

export function KarmaDisclaimerModal({ visible, onAccept }: KarmaDisclaimerModalProps) {
  const { colors } = useTheme()
  const { t } = useI18n()

  return (
    <Modal visible={visible} transparent={false} animationType='fade'>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={{
            padding: 24,
            paddingTop: 60,
            paddingBottom: 120,
          }}
        >
          {/* 图标 + 标题 */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 0,
                backgroundColor: '#F59E0B20',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <Scale size={36} color='#F59E0B' />
            </View>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '700',
                color: colors.text,
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              {t('karma_title')}
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: colors.textSecondary,
                textAlign: 'center',
                lineHeight: 22,
              }}
            >
              {t('karma_welcome')}
            </Text>
          </View>

          {/* 免责条款 */}
          <View style={{ marginBottom: 24 }}>
            <DisclaimerSection
              icon={<AlertTriangle size={20} color='#EF4444' />}
              title={t('karma_section1_title')}
              content={t('karma_section1_body')}
              colors={colors}
            />
            <DisclaimerSection
              icon={<AlertTriangle size={20} color='#F59E0B' />}
              title={t('karma_section2_title')}
              content={t('karma_section2_body')}
              colors={colors}
            />
            <DisclaimerSection
              icon={<AlertTriangle size={20} color='#3B82F6' />}
              title={t('karma_section3_title')}
              content={t('karma_section3_body')}
              colors={colors}
            />
            <DisclaimerSection
              icon={<CheckCircle size={20} color='#22C55E' />}
              title={t('karma_section4_title')}
              content={t('karma_section4_body')}
              colors={colors}
            />
          </View>

          {/* 法律声明 */}
          <View
            style={{
              padding: 16,
              borderRadius: 0,
              backgroundColor: colors.surface,
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: colors.textSecondary,
                lineHeight: 18,
                textAlign: 'center',
              }}
            >
              {t('karma_legal')}
            </Text>
          </View>
        </ScrollView>

        {/* 同意按钮 - 固定在底部 */}
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
          <Button variant='default' size='lg' onPress={onAccept}>
            {t('karma_accept')}
          </Button>
        </View>
      </View>
    </Modal>
  )
}

// ==================== 子组件 ====================

interface DisclaimerSectionProps {
  icon: React.ReactNode
  title: string
  content: string
  colors: {
    text: string
    textSecondary: string
    card: string
    border: string
  }
}

function DisclaimerSection({ icon, title, content, colors }: DisclaimerSectionProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        padding: 16,
        borderRadius: 0,
        backgroundColor: colors.card,
        marginBottom: 12,
        borderWidth: 0.5,
        borderColor: colors.border,
      }}
    >
      <View style={{ marginRight: 12, marginTop: 2 }}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
          {title}
        </Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20 }}>{content}</Text>
      </View>
    </View>
  )
}
