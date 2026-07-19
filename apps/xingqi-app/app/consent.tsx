import { Button, useTheme } from '@zhop/core-ui'
import { router, Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { XingqiLoader } from '@/components/XingqiLoader'
import { fetchBiometricConsent, recordBiometricConsent } from '@/lib/api'
import { resolveLocale } from '@/lib/i18n'

export default function BiometricConsentScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const zh = locale.startsWith('zh')
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const ok = await fetchBiometricConsent()
        if (cancelled) return
        if (ok) {
          router.replace('/capture')
          return
        }
      } catch {
        // show disclosure
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

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
        router.push('/sign-in')
        return
      }
      setError(zh ? '同意记录失败，请重试' : 'Could not record consent. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (checking) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <XingqiLoader label={zh ? '加载中' : 'Loading'} />
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.xl,
        paddingBottom: insets.bottom + spacing.xl,
        paddingHorizontal: spacing.xl,
        gap: spacing.lg,
      }}
    >
      <Stack.Screen
        options={{ headerShown: false, gestureEnabled: true, fullScreenGestureEnabled: true }}
      />
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
