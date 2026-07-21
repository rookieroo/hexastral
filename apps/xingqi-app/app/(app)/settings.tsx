/**
 * Settings — Yuun-style grouped cards; keep content minimal.
 */

import { useTheme } from '@zhop/core-ui'
import { fetchReadings } from '@zhop/portfolio-client'
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
import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { privacyPolicyUrl, resolveLocale } from '@/lib/i18n'
import { restorePurchases } from '@/lib/iap'
import {
  getIcloudPhotoSyncEnabled,
  setIcloudPhotoSyncEnabled,
  syncReadingPhotosToICloudIfEnabled,
} from '@/lib/icloud-sync-preference'
import { isCjkZh, pickZh } from '@/lib/locale-zh'
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
  const s = (hans: string, hant: string, en: string) =>
    isCjkZh(locale) ? pickZh(locale, hans, hant) : en
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
  const [icloudSync, setIcloudSync] = useState(false)
  const [readingCount, setReadingCount] = useState(0)

  useFocusEffect(
    useCallback(() => {
      void getPortfolioUserId().then(setUserId)
      void getXingqiPushPrefs().then(setPrefs)
      void getIcloudPhotoSyncEnabled().then(setIcloudSync)
      void fetchReadings(PORTFOLIO_TARGET_APP)
        .then((hist) => setReadingCount(hist.readings?.length ?? 0))
        .catch(() => setReadingCount(0))
      if (__DEV__) setDevPro(getDevEntitlementOverride())
    }, [])
  )

  const softGatePro = () => {
    Alert.alert(
      s('需要 Pro', '需要 Pro', 'Pro required'),
      s('订阅后可开启提醒。', '訂閱後可開啟提醒。', 'Subscribe to enable reminders.'),
      [
        { text: s('取消', '取消', 'Cancel'), style: 'cancel' },
        {
          text: s('查看', '查看', 'View'),
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
          Alert.alert(
            'DEV Pro',
            s(
              '服务端授权失败（需已登录）。',
              '服務端授權失敗（需已登入）。',
              'Server grant failed.'
            )
          )
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
          {s('设置', '設定', 'Settings')}
        </Text>

        {!userId ? (
          <SettingsSection>
            <SettingsCard>
              <SettingsRow
                label={s('登录', '登入', 'Sign in')}
                onPress={() => router.push('/sign-in')}
              />
            </SettingsCard>
          </SettingsSection>
        ) : null}

        <SettingsSection title={s('提醒', '提醒', 'REMINDERS')}>
          <SettingsCard>
            <SettingsToggleRow
              label={s('提醒', '提醒', 'Reminders')}
              value={prefs.remindersOn && isPro}
              onValueChange={(v) => void applyReminders(v)}
              badge={isPro ? undefined : 'PRO'}
            />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection title={s('档案', '檔案', 'PROFILE')}>
          <SettingsCard>
            <SettingsRow
              label={s('生辰', '生辰', 'Birth')}
              hint={s(
                '用于形气与八字对照；改后需重新生成报告才生效',
                '用於形氣與八字對照；改後需重新生成報告才生效',
                'Powers form × BaZi contrast; regenerate a report after changes'
              )}
              onPress={() => router.push('/birth' as never)}
              divider
            />
            <SettingsRow
              label={s('历史档案', '歷史檔案', 'History')}
              trailing={readingCount > 0 ? String(readingCount) : undefined}
              onPress={() => router.push('/(app)/archive' as never)}
            />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection title={s('参考', '參考', 'LIBRARY')}>
          <SettingsCard>
            <SettingsRow
              label={s('符号说明', '符號說明', 'Glossary')}
              onPress={() => router.push('/glossary' as never)}
              divider
            />
            <SettingsRow
              label={s('术语表', '術語表', 'Terms')}
              onPress={() => router.push('/terms' as never)}
            />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection title={s('购买', '購買', 'PURCHASES')}>
          <SettingsCard>
            <SettingsRow
              label={
                restoreBusy
                  ? s('恢复中…', '恢復中…', 'Restoring…')
                  : s('恢复购买', '恢復購買', 'Restore purchases')
              }
              onPress={() => {
                if (restoreBusy) return
                setRestoreBusy(true)
                void restorePurchases()
                  .then(() => {
                    Alert.alert(s('已恢复', '已恢復', 'Restored'), undefined, [
                      { text: s('好', '好', 'OK') },
                    ])
                  })
                  .catch(() => {
                    Alert.alert(s('恢复失败', '恢復失敗', 'Restore failed'))
                  })
                  .finally(() => setRestoreBusy(false))
              }}
            />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection title={s('同步', '同步', 'SYNC')}>
          <Text
            style={{
              color: colors.dim,
              fontSize: 12,
              lineHeight: 17,
              marginBottom: 4,
              paddingHorizontal: 4,
            }}
          >
            {s(
              '同一 Apple ID 设备间同步形气照片（仅存于 iCloud，不经 HexAstral 服务器）',
              '同一 Apple ID 裝置間同步形氣照片（僅存於 iCloud，不經 HexAstral 伺服器）',
              'Sync reading photos on the same Apple ID (iCloud only, not HexAstral servers)'
            )}
          </Text>
          <SettingsCard>
            <SettingsToggleRow
              label={s('iCloud 照片同步', 'iCloud 照片同步', 'iCloud photo sync')}
              value={icloudSync}
              onValueChange={(next) => {
                void (async () => {
                  setIcloudSync(next)
                  await setIcloudPhotoSyncEnabled(next)
                  if (next) await syncReadingPhotosToICloudIfEnabled()
                })()
              }}
            />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection title={s('法律', '法律', 'LEGAL')}>
          <SettingsCard>
            <SettingsRow
              label={s('隐私', '隱私', 'Privacy')}
              onPress={() => void Linking.openURL(privacyPolicyUrl(locale))}
              divider
            />
            <SettingsRow
              label={s('服务条款', '服務條款', 'Terms of service')}
              onPress={() => void Linking.openURL('https://www.hexastral.com/en/terms')}
            />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection title={s('账户', '帳戶', 'ACCOUNT')}>
          <SettingsCard>
            <SettingsRow
              label={s('用量与周期', '用量與週期', 'Usage & cadence')}
              hint={s(
                '最近解读、25 天更新建议、本月额度',
                '最近解讀、25 天更新建議、本月額度',
                'Last reading, 25-day refresh, monthly quotas'
              )}
              onPress={() => router.push('/(app)/usage' as never)}
              divider={Boolean(userId)}
            />
            {userId ? (
              <>
                <SettingsRow
                  label={s('撤回生物特征同意', '撤回生物特徵同意', 'Withdraw consent')}
                  onPress={() => {
                    Alert.alert(
                      s('撤回同意', '撤回同意', 'Withdraw consent'),
                      s(
                        '撤回后需重新同意才能解读。',
                        '撤回後需重新同意才能解讀。',
                        'You must consent again before reading.'
                      ),
                      [
                        { text: s('取消', '取消', 'Cancel'), style: 'cancel' },
                        {
                          text: s('撤回', '撤回', 'Withdraw'),
                          style: 'destructive',
                          onPress: () => {
                            void (async () => {
                              try {
                                await revokeBiometricConsent()
                                await clearReadingDraft({ wipePhotos: true })
                              } catch {
                                Alert.alert(s('失败', '失敗', 'Failed'))
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
                  label={s('退出登录', '退出登入', 'Sign out')}
                  danger
                  onPress={() => {
                    Alert.alert(s('退出登录', '退出登入', 'Sign out'), undefined, [
                      { text: s('取消', '取消', 'Cancel'), style: 'cancel' },
                      {
                        text: s('退出', '退出', 'Sign out'),
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
