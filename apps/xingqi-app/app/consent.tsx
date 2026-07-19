import { Button, useTheme } from '@zhop/core-ui'
import { router, Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { XingqiLoader } from '@/components/XingqiLoader'
import { fetchBiometricConsent, recordBiometricConsent } from '@/lib/api'
import { resolveLocale } from '@/lib/i18n'
import { isCjkZh, pickZh } from '@/lib/locale-zh'

export default function BiometricConsentScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const s = (hans: string, hant: string, en: string) =>
    isCjkZh(locale) ? pickZh(locale, hans, hant) : en
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
      setError(s('同意记录失败，请重试', '同意記錄失敗，請重試', 'Could not record consent. Try again.'))
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
        <XingqiLoader label={s('加载中', '載入中', 'Loading')} />
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
        {s('开始前请先阅读', '開始前請先閱讀', 'Before we begin')}
      </Text>
      <Text style={{ color: colors.secondary, fontSize: 15, lineHeight: 22 }}>
        {s(
          '我们将在设备上选择左掌、右掌与面部高清照片，提取结构化特征，并结合你的生辰计算八字大运流年，生成密封的六章形气简报。原图在服务器处理完成后不会保存。',
          '我們將在裝置上選擇左掌、右掌與面部高清照片，提取結構化特徵，並結合你的生辰計算八字大運流年，生成密封的六章形氣簡報。原圖在伺服器處理完成後不會保存。',
          'You will capture sharp left palm, right palm, and face photos. We extract structured features, compute BaZi DaYun/LiuNian from your birth data, and produce a sealed six-chapter form brief. Source images are not kept after processing.'
        )}
      </Text>
      <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 20 }}>
        {s(
          '这是文化研习简报（位点依据 · 三轴窗口 · 气机对照），不是聊天式看图说话，也不构成命运断语或专业建议。你可随时在设置中撤回同意。',
          '這是文化研習簡報（位點依據 · 三軸窗口 · 氣機對照），不是聊天式看圖說話，也不構成命運斷語或專業建議。你可隨時在設定中撤回同意。',
          'A cultural-study brief (locus citations · three-axis windows · qi contrast) — not chatty photo-reading, fate claims, or professional advice. Withdraw consent anytime in Settings.'
        )}
      </Text>
      {error ? <Text style={{ color: colors.accent }}>{error}</Text> : null}
      <Button variant='primary' onPress={() => void onAgree()} disabled={busy}>
        {busy
          ? s('处理中…', '處理中…', 'Working…')
          : s('我已了解并同意', '我已瞭解並同意', 'I understand and agree')}
      </Button>
      <Button variant='ghost' onPress={() => router.back()}>
        {s('取消', '取消', 'Cancel')}
      </Button>
    </ScrollView>
  )
}
