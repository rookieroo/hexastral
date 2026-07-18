/**
 * Settings — single full-screen push (not a modal sheet stack).
 * Sign-in pushes to /sign-in (full screen).
 */

import { useTheme } from '@zhop/core-ui'
import {
  clearPortfolioUserId,
  getPortfolioUserId,
  registerPushTokenWithServer,
  requestPushPermission,
} from '@zhop/satellite-runtime'
import * as Linking from 'expo-linking'
import { useFocusEffect, useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { revokeBiometricConsent } from '@/lib/api'
import { setCachedBiometricConsent } from '@/lib/biometric-consent-cache'
import { privacyPolicyUrl, resolveLocale } from '@/lib/i18n'
import { resetOnboarding } from '@/lib/onboarding'
import { getDailyPushEnabled, setDailyPushEnabled } from '@/lib/push-preference'

function Row({
  label,
  onPress,
  danger,
  colors,
  spacing,
}: {
  label: string
  onPress: () => void
  danger?: boolean
  colors: { text: string; accent: string; separator: string }
  spacing: { md: number }
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderWidth: 0.5,
        borderColor: colors.separator,
        padding: spacing.md,
      }}
    >
      <Text style={{ color: danger ? colors.accent : colors.text }}>{label}</Text>
    </Pressable>
  )
}

export default function SettingsScreen() {
  const { colors, spacing } = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const zh = locale.startsWith('zh')
  const [userId, setUserId] = useState<string | null>(null)
  const [dailyPush, setDailyPush] = useState(false)

  useFocusEffect(
    useCallback(() => {
      void getPortfolioUserId().then(setUserId)
      void getDailyPushEnabled().then(setDailyPush)
    }, [])
  )

  const onTogglePush = async (next: boolean) => {
    setDailyPush(next)
    await setDailyPushEnabled(next)
    if (next && userId) {
      const ok = await requestPushPermission()
      if (ok) await registerPushTokenWithServer()
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole='button'>
          <ChevronLeft size={24} color={colors.text} strokeWidth={1.5} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>
          {zh ? '设置' : 'Settings'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.xl,
          gap: spacing.md,
          paddingBottom: insets.bottom + spacing.xl,
        }}
      >
        {!userId ? (
          <Row
            label={zh ? '登录' : 'Sign in'}
            onPress={() => router.push('/sign-in')}
            colors={colors}
            spacing={spacing}
          />
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: 0.5,
            borderColor: colors.separator,
            padding: spacing.md,
          }}
        >
          <Text style={{ color: colors.text, flex: 1 }}>
            {zh ? '复拍与事件提醒' : 'Reminders'}
          </Text>
          <Switch value={dailyPush} onValueChange={(v) => void onTogglePush(v)} />
        </View>

        <Row
          label={zh ? '隐私说明' : 'Privacy'}
          onPress={() => void Linking.openURL(privacyPolicyUrl(locale))}
          colors={colors}
          spacing={spacing}
        />

        {userId ? (
          <Row
            label={zh ? '撤回生物特征同意' : 'Withdraw biometric consent'}
            onPress={() => {
              Alert.alert(
                zh ? '撤回同意' : 'Withdraw consent',
                zh ? '撤回后需重新同意才能解读。' : 'You must consent again before reading.',
                [
                  { text: zh ? '取消' : 'Cancel', style: 'cancel' },
                  {
                    text: zh ? '撤回' : 'Withdraw',
                    style: 'destructive',
                    onPress: () => {
                      void revokeBiometricConsent().catch(() => {
                        Alert.alert(zh ? '失败' : 'Failed')
                      })
                    },
                  },
                ]
              )
            }}
            colors={colors}
            spacing={spacing}
          />
        ) : null}

        <Row
          label={zh ? '服务条款' : 'Terms'}
          onPress={() => void Linking.openURL('https://www.hexastral.com/en/terms')}
          colors={colors}
          spacing={spacing}
        />

        {userId ? (
          <Row
            label={zh ? '退出登录' : 'Sign out'}
            danger
            onPress={() => {
              Alert.alert(zh ? '退出登录' : 'Sign out', undefined, [
                { text: zh ? '取消' : 'Cancel', style: 'cancel' },
                {
                  text: zh ? '退出' : 'Sign out',
                  style: 'destructive',
                  onPress: () => {
                    void clearPortfolioUserId().then(() => {
                      void setCachedBiometricConsent(false)
                      setUserId(null)
                      router.back()
                    })
                  },
                },
              ])
            }}
            colors={colors}
            spacing={spacing}
          />
        ) : null}

        {__DEV__ ? (
          <Row
            label='DEV · reset onboarding'
            onPress={() => {
              void resetOnboarding().then(() => router.replace('/'))
            }}
            colors={colors}
            spacing={spacing}
          />
        ) : null}
      </ScrollView>
    </View>
  )
}
