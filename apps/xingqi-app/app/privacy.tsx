import { useTheme } from '@zhop/core-ui'
import * as Linking from 'expo-linking'
import { Stack } from 'expo-router'
import { Pressable, ScrollView, Text } from 'react-native'

import { privacyPolicyUrl, resolveLocale } from '@/lib/i18n'

export default function FacePrivacyAppendixScreen() {
  const { colors, spacing } = useTheme()
  const locale = resolveLocale()
  const zh = locale.startsWith('zh')
  const url = privacyPolicyUrl(locale)

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>
        {zh ? 'Xingqi 数据处理' : 'Xingqi data handling'}
      </Text>
      <Text style={{ color: colors.secondary, lineHeight: 22 }}>
        {zh
          ? '左掌、右掌与面部原图仅保存在本机，供查看与替换；上传仅用于提取结构化特征，服务器处理完不保留原图。'
          : 'Palm and face originals stay on this device for view/replace. Uploads are only for feature extraction; servers discard source images after processing.'}
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
      <Pressable onPress={() => void Linking.openURL(url)}>
        <Text style={{ color: colors.accent, lineHeight: 22 }}>
          {zh ? '完整隐私附录（网页）→' : 'Full privacy appendix (web) →'}
        </Text>
      </Pressable>
    </ScrollView>
  )
}
