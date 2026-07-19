/**
 * Settings — Yuun-style grouped cards; keep content minimal.
 */

import { useTheme } from '@zhop/core-ui'
import {
  clearPortfolioUserId,
  type DevEntitlementOverride,
  getDevEntitlementOverride,
  getPortfolioUserId,
  hasEntitlement,
  setDevEntitlementOverride,
  useEntitlements,
} from '@zhop/satellite-runtime'
import * as Linking from 'expo-linking'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Alert, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  SettingsCard,
  SettingsRow,
  SettingsSection,
  SettingsToggleRow,
} from '@/components/settings/SettingsSection'
import { revokeBiometricConsent } from '@/lib/api'
import { setCachedBiometricConsent } from '@/lib/biometric-consent-cache'
import { devSetServerPro } from '@/lib/dev-tools'
import { privacyPolicyUrl, resolveLocale } from '@/lib/i18n'
import { restorePurchases } from '@/lib/iap'
import { resetOnboarding } from '@/lib/onboarding'
import { getXingqiPushPrefs, setXingqiPushPrefs, type XingqiPushPrefs } from '@/lib/push-preference'
import { cancelXingqiPush, scheduleXingqiPush } from '@/lib/push-schedule'
import { clearReadingDraft } from '@/lib/reading-draft'
import { registerXingqiServerPush, unregisterXingqiServerPush } from '@/lib/server-push'

export default function SettingsScreen() {
  const { colors, spacing } = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const zh = locale.startsWith('zh')
  const entitlements = useEntitlements()
  const isPro =
    hasEntitlement(entitlements, 'faceoracle_pro') || hasEntitlement(entitlements, 'universe_pro')
  const [userId, setUserId] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<XingqiPushPrefs>({
    remindersOn: false,
    recaptureOn: true,
    eventsOn: true,
  })
  const [devPro, setDevPro] = useState<DevEntitlementOverride>(
    __DEV__ ? getDevEntitlementOverride() : null
  )
  const [restoreBusy, setRestoreBusy] = useState(false)

  useFocusEffect(
    useCallback(() => {
      void getPortfolioUserId().then(setUserId)
      void getXingqiPushPrefs().then(setPrefs)
      if (__DEV__) setDevPro(getDevEntitlementOverride())
    }, [])
  )

  const softGatePro = () => {
    Alert.alert(
      zh ? '需要 Pro' : 'Pro required',
      zh ? '订阅后可开启提醒。' : 'Subscribe to enable reminders.',
      [
        { text: zh ? '取消' : 'Cancel', style: 'cancel' },
        {
          text: zh ? '查看' : 'View',
          onPress: () => router.push('/(commerce)/paywall' as never),
        },
      ]
    )
  }

  const applyReminders = async (next: boolean) => {
    if (next && !isPro) {
      softGatePro()
      return
    }
    const merged: XingqiPushPrefs = {
      remindersOn: next,
      recaptureOn: prefs.recaptureOn,
      eventsOn: prefs.eventsOn,
    }
    if (next) {
      merged.recaptureOn = true
      merged.eventsOn = true
    }
    setPrefs(merged)
    await setXingqiPushPrefs(merged)
    if (!merged.remindersOn) {
      await unregisterXingqiServerPush()
      await cancelXingqiPush()
      return
    }
    if (!isPro) return
    const serverOk = await registerXingqiServerPush({ locale, isPro: true, prefs: merged })
    if (!serverOk) {
      await scheduleXingqiPush({ locale, isPro: true, events: [], preferServer: false })
    }
  }

  const cycleDevPro = () => {
    const next: DevEntitlementOverride = devPro === null ? 'pro' : devPro === 'pro' ? 'free' : null
    setDevEntitlementOverride(next)
    setDevPro(next)
    if (next === 'pro') {
      void devSetServerPro(true).then((ok) => {
        if (!ok) {
          Alert.alert('DEV Pro', zh ? '服务端授权失败（需已登录）。' : 'Server grant failed.')
        }
      })
    } else if (next === 'free') {
      void devSetServerPro(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          gap: spacing.xl,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '600' }}>
          {zh ? '设置' : 'Settings'}
        </Text>

        {!userId ? (
          <SettingsSection>
            <SettingsCard>
              <SettingsRow label={zh ? '登录' : 'Sign in'} onPress={() => router.push('/sign-in')} />
            </SettingsCard>
          </SettingsSection>
        ) : null}

        <SettingsSection title={zh ? '提醒' : 'REMINDERS'}>
          <SettingsCard>
            <SettingsToggleRow
              label={zh ? '提醒' : 'Reminders'}
              value={prefs.remindersOn && isPro}
              onValueChange={(v) => void applyReminders(v)}
              badge={isPro ? undefined : 'PRO'}
            />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection title={zh ? '参考' : 'LIBRARY'}>
          <SettingsCard>
            <SettingsRow
              label={zh ? '符号说明' : 'Glossary'}
              onPress={() => router.push('/glossary' as never)}
              divider
            />
            <SettingsRow
              label={zh ? '术语表' : 'Terms'}
              onPress={() => router.push('/terms' as never)}
            />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection title={zh ? '购买' : 'PURCHASES'}>
          <SettingsCard>
            <SettingsRow
              label={
                restoreBusy
                  ? zh
                    ? '恢复中…'
                    : 'Restoring…'
                  : zh
                    ? '恢复购买'
                    : 'Restore purchases'
              }
              onPress={() => {
                if (restoreBusy) return
                setRestoreBusy(true)
                void restorePurchases()
                  .then(() => {
                    Alert.alert(zh ? '已恢复' : 'Restored', undefined, [
                      { text: zh ? '好' : 'OK' },
                    ])
                  })
                  .catch(() => {
                    Alert.alert(zh ? '恢复失败' : 'Restore failed')
                  })
                  .finally(() => setRestoreBusy(false))
              }}
            />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection title={zh ? '法律' : 'LEGAL'}>
          <SettingsCard>
            <SettingsRow
              label={zh ? '隐私' : 'Privacy'}
              onPress={() => void Linking.openURL(privacyPolicyUrl(locale))}
              divider
            />
            <SettingsRow
              label={zh ? '服务条款' : 'Terms of service'}
              onPress={() => void Linking.openURL('https://www.hexastral.com/en/terms')}
            />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection title={zh ? '账户' : 'ACCOUNT'}>
          <SettingsCard>
            <SettingsRow
              label={zh ? '用量与周期' : 'Usage & cadence'}
              hint={
                zh
                  ? '最近解读、25 天更新建议、本月额度'
                  : 'Last reading, 25-day refresh, monthly quotas'
              }
              onPress={() => router.push('/(app)/usage' as never)}
              divider={Boolean(userId)}
            />
            {userId ? (
              <>
                <SettingsRow
                  label={zh ? '撤回生物特征同意' : 'Withdraw consent'}
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
                            void (async () => {
                              try {
                                await revokeBiometricConsent()
                                await clearReadingDraft({ wipePhotos: true })
                              } catch {
                                Alert.alert(zh ? '失败' : 'Failed')
                              }
                            })()
                          },
                        },
                      ]
                    )
                  }}
                  divider
                />
                <SettingsRow
                  label={zh ? '退出登录' : 'Sign out'}
                  danger
                  onPress={() => {
                    Alert.alert(zh ? '退出登录' : 'Sign out', undefined, [
                      { text: zh ? '取消' : 'Cancel', style: 'cancel' },
                      {
                        text: zh ? '退出' : 'Sign out',
                        style: 'destructive',
                        onPress: () => {
                          void (async () => {
                            await unregisterXingqiServerPush()
                            await cancelXingqiPush()
                            await clearPortfolioUserId()
                            void setCachedBiometricConsent(false)
                            void clearReadingDraft({ wipePhotos: true })
                            setUserId(null)
                            router.back()
                          })()
                        },
                      },
                    ])
                  }}
                />
              </>
            ) : null}
          </SettingsCard>
        </SettingsSection>

        {__DEV__ ? (
          <SettingsSection title='DEV'>
            <SettingsCard>
              <SettingsRow
                label='Force entitlement'
                trailing={devPro === null ? 'Off' : devPro === 'pro' ? 'PRO' : 'FREE'}
                onPress={cycleDevPro}
                divider
              />
              <SettingsRow
                label='Reset onboarding'
                onPress={() => {
                  void resetOnboarding().then(() => router.replace('/'))
                }}
              />
            </SettingsCard>
          </SettingsSection>
        ) : null}
      </ScrollView>
    </View>
  )
}
