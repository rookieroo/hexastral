import { Button, useTheme } from '@zhop/core-ui'
import { router, Stack } from 'expo-router'
import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

import { recordBiometricConsent } from '@/lib/api'
import { useSatelliteI18n } from '@/lib/i18n'

export default function BiometricConsentScreen() {
  const { colors, spacing } = useTheme()
  const { locale } = useSatelliteI18n()
  const zh = locale.startsWith('zh')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onAgree = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await recordBiometricConsent()
      router.replace('/capture')
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'signin_required') {
        router.push('/(tabs)/me')
        return
      }
      setError(zh ? '同意记录失败，请重试' : 'Could not record consent. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}
    >
      <Stack.Screen options={{ title: zh ? '生物特征同意' : 'Biometric consent', headerShown: true }} />
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '600' }}>
        {zh ? '开始前请先阅读' : 'Before we begin'}
      </Text>
      <Text style={{ color: colors.secondary, fontSize: 15, lineHeight: 22 }}>
        {zh
          ? '我们将在设备上选择左掌、右掌与面部照片，仅用于提取结构化特征并生成文化研习解读。原图在服务器处理完成后不会保存。你可随时在设置中撤回同意。'
          : 'You will capture left palm, right palm, and a clear face photo. We extract structured features for a cultural-study reading. Source images are not kept after processing. You can withdraw consent anytime in Settings.'}
      </Text>
      <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 20 }}>
        {zh
          ? '解读为文化探索与自我反思参考，不构成命运断语或专业建议。'
          : 'Readings are for cultural exploration and reflection — not fate claims or professional advice.'}
      </Text>
      {error ? <Text style={{ color: colors.accent }}>{error}</Text> : null}
      <Button variant='primary' onPress={() => void onAgree()} disabled={busy}>
        {busy ? (zh ? '处理中…' : 'Working…') : zh ? '我已了解并同意' : 'I understand and agree'}
      </Button>
      <Button variant='ghost' onPress={() => router.back()}>
        {zh ? '取消' : 'Cancel'}
      </Button>
    </ScrollView>
  )
}
