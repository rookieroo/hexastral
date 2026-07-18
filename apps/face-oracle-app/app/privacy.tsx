import { useTheme } from '@zhop/core-ui'
import { Stack } from 'expo-router'
import { ScrollView, Text } from 'react-native'

import { useSatelliteI18n } from '@/lib/i18n'

export default function FacePrivacyAppendixScreen() {
  const { colors, spacing } = useTheme()
  const { locale } = useSatelliteI18n()
  const zh = locale.startsWith('zh')

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }}
    >
      <Stack.Screen
        options={{ title: zh ? '隐私说明' : 'Privacy appendix', headerShown: true }}
      />
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>
        {zh ? 'Face Oracle 数据处理' : 'Face Oracle data handling'}
      </Text>
      <Text style={{ color: colors.secondary, lineHeight: 22 }}>
        {zh
          ? '我们处理左掌、右掌与面部照片，仅用于提取结构化特征。原图在服务器请求结束后不落库。'
          : 'We process left palm, right palm, and face photos only to extract structured features. Source images are not stored after the request completes.'}
      </Text>
      <Text style={{ color: colors.secondary, lineHeight: 22 }}>
        {zh
          ? '生辰信息用于形气与八字对照，保存在你的账户出生资料中。'
          : 'Birth details power physiognomy × BaZi contrast and are stored with your account birth profile.'}
      </Text>
      <Text style={{ color: colors.secondary, lineHeight: 22 }}>
        {zh
          ? '每次解读会更新前瞻事件表；Pro 订阅可用其驱动本地/推送提醒（宜留意的时间窗、月度复拍）。'
          : 'Each reading refreshes a forward event table. Pro may use it for local/push reminders (windows worth noting, monthly re-capture).'}
      </Text>
      <Text style={{ color: colors.secondary, lineHeight: 22 }}>
        {zh
          ? '完整隐私政策：hexastral.com 上的 FaceOracle Privacy 页面。可随时撤回生物特征同意。'
          : 'Full policy: FaceOracle Privacy on hexastral.com. You may withdraw biometric consent anytime.'}
      </Text>
    </ScrollView>
  )
}
