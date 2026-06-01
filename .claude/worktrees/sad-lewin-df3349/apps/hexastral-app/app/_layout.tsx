import '../global.css'

import { ThemeProvider } from '@react-navigation/native'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import * as Linking from 'expo-linking'
import { router, Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useColorScheme } from 'nativewind'
import { useCallback, useEffect, useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from '@/lib/auth'
import { ToastHost } from '@/components/feedback/ToastHost'
import type { DDLPayload } from '@/lib/domain/ddl'
import { attemptDDLRestore, setDDLToken } from '@/lib/domain/ddl'
import { initializeSubscriptions } from '@/lib/domain/subscription'
import { usePushAttribution } from '@/lib/hooks/usePushAttribution'
import { useI18n } from '@/lib/i18n'
import { queryClient, queryPersister } from '@/lib/query-client'
import { initSentry, wrapWithSentry } from '@/lib/sentry'
import { NAV_THEME, useIosPalette } from '@/lib/theme'
import { configureNotificationHandlers, registerPushToken } from '@/lib/ux/pushNotifications'

initSentry()

/** Extract DDL token from a deep link URL (hexastral://launch?ddl=TOKEN) */
function extractDDLToken(url: string | null): string | null {
  if (!url) return null
  try {
    const parsed = Linking.parse(url)
    const token = parsed.queryParams?.ddl
    if (typeof token === 'string' && token.length > 0) return token
    return null
  } catch {
    return null
  }
}

async function handleDDLFromURL(url: string | null): Promise<void> {
  const token = extractDDLToken(url)
  if (token) {
    await setDDLToken(token)
  }
}

/** Inner layout that has access to auth + i18n context */
function RootLayoutInner() {
  const { colorScheme } = useColorScheme()
  const { userId } = useAuth()
  const { t, locale } = useI18n()
  const [pendingPush, setPendingPush] = useState<{ userId: string; locale: string } | null>(null)

  const ios = useIosPalette()

  // Capture push notification taps for IAP conversion attribution
  usePushAttribution()

  /** DDL 成功后：展示推送前说明 Modal 而不是直接调用系统弹窗 */
  const handleDDLSuccess = useCallback(
    async (payload: DDLPayload) => {
      if (!userId) return

      // Queue push registration — shown via pre-permission modal first
      setPendingPush({ userId, locale })

      const params = new URLSearchParams()
      if (payload.mode) params.set('mode', payload.mode)
      if (payload.dayMaster) params.set('dayMaster', payload.dayMaster)
      if (payload.score !== undefined) params.set('score', String(payload.score))
      router.push(`/ddl-welcome?${params.toString()}`)
    },
    [userId, locale]
  )

  useEffect(() => {
    initializeSubscriptions()
    configureNotificationHandlers()

    // DDL: 检查冷启动 URL → 缓存 token → 还原 H5 Onboarding 数据
    async function initDDL() {
      // Cold start: check if app was opened via deep link
      const initialUrl = await Linking.getInitialURL()
      await handleDDLFromURL(initialUrl)

      const payload = await attemptDDLRestore()

      if (payload && __DEV__) {
        console.error('[DDL] Restored payload:', JSON.stringify(payload))
      }

      if (payload && userId) {
        await handleDDLSuccess(payload)
      }
    }

    initDDL()

    // Warm start: listen for deep links while app is in foreground
    const subscription = Linking.addEventListener('url', async ({ url }) => {
      await handleDDLFromURL(url)
      const payload = await attemptDDLRestore()
      if (payload && userId) {
        if (__DEV__) console.error('[DDL] Restored payload (warm):', JSON.stringify(payload))
        await handleDDLSuccess(payload)
      }
    })

    return () => subscription.remove()
  }, [userId, handleDDLSuccess])

  return (
    <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <GestureHandlerRootView
        style={{ flex: 1, backgroundColor: NAV_THEME[colorScheme ?? 'light'].colors.background }}
      >
        <Stack screenOptions={{ headerShown: false, gestureEnabled: true }} />

        {/* 推送前说明 Modal — 系统弹窗前先展示价值说明，提高同意率 */}
        <Modal
          visible={pendingPush !== null}
          transparent
          animationType='fade'
          onRequestClose={() => setPendingPush(null)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: 'flex-end',
              backgroundColor: 'rgba(0,0,0,0.6)',
            }}
          >
            <View
              style={{
                backgroundColor: ios.card,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 32,
                paddingBottom: 52,
              }}
            >
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: '700',
                  color: ios.text,
                  marginBottom: 16,
                }}
              >
                {t('push_pre_title')}
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: ios.secondary,
                  lineHeight: 24,
                  marginBottom: 32,
                }}
              >
                {t('push_pre_body')}
              </Text>
              <Pressable
                onPress={() => {
                  const config = pendingPush
                  setPendingPush(null)
                  if (config) {
                    registerPushToken(config.userId, config.locale).catch((err) => {
                      if (__DEV__) console.error('[Push] Registration failed:', err)
                    })
                  }
                }}
                style={{
                  backgroundColor: ios.tint,
                  borderRadius: 0,
                  paddingVertical: 16,
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: ios.tintFg, fontSize: 17, fontWeight: '600' }}>
                  {t('push_pre_allow')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setPendingPush(null)}
                style={{ alignItems: 'center', paddingVertical: 12 }}
              >
                <Text style={{ color: ios.secondary, fontSize: 15 }}>{t('push_pre_skip')}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        <ToastHost />
      </GestureHandlerRootView>
    </ThemeProvider>
  )
}

export default wrapWithSentry(function RootLayout() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootLayoutInner />
        </AuthProvider>
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  )
})
