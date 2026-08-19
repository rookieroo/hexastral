/**
 * 印匣 — account / device case. Grouped cards; keep content minimal.
 */

import { useTheme } from '@zhop/core-ui'
import { fetchReadings } from '@zhop/portfolio-client'
import {
  clearPortfolioUserId,
  type DevEntitlementOverride,
  getDevEntitlementOverride,
  getPortfolioUserId,
  hasEntitlement,
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
import { fetchBiometricConsent, revokeBiometricConsent } from '@/lib/api'
import { setCachedBiometricConsent } from '@/lib/biometric-consent-cache'
import { cycleDevEntitlementOverride, devEntitlementLabel } from '@/lib/dev-pro-toggle'
import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { privacyPolicyUrl, resolveLocale } from '@/lib/i18n'
import { restorePurchases } from '@/lib/iap'
import { sealCaseCopy } from '@/lib/living-copy'
import { pickUi } from '@/lib/locale-zh'
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
  const s = (hans: string, hant: string, en: string, ja?: string) =>
    pickUi(locale, hans, hant, en, ja)
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
  const [readingCount, setReadingCount] = useState(0)

  useFocusEffect(
    useCallback(() => {
      void getPortfolioUserId().then(setUserId)
      void getXingqiPushPrefs().then(setPrefs)
      void fetchReadings(PORTFOLIO_TARGET_APP)
        .then((hist) => setReadingCount(hist.readings?.length ?? 0))
        .catch(() => setReadingCount(0))
      if (__DEV__) setDevPro(getDevEntitlementOverride())
    }, [])
  )

  const softGatePro = () => {
    Alert.alert(
      s('需要 Pro', '需要 Pro', 'Pro required', 'Pro が必要です'),
      s(
        '订阅后可开启提醒。',
        '訂閱後可開啟提醒。',
        'Subscribe to enable reminders.',
        'リマインダーを使うには購読が必要です。'
      ),
      [
        { text: s('取消', '取消', 'Cancel', 'キャンセル'), style: 'cancel' },
        {
          text: s('查看', '查看', 'View', '見る'),
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
    void cycleDevEntitlementOverride().then(setDevPro)
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
          {sealCaseCopy(locale).title}
        </Text>

        <SettingsSection>
          <SettingsCard>
            <SettingsRow
              label={
                readingCount > 0
                  ? sealCaseCopy(locale).refreshPeriod
                  : sealCaseCopy(locale).newPeriod
              }
              onPress={() => {
                void (async () => {
                  try {
                    const ok = await fetchBiometricConsent()
                    if (!ok) {
                      router.push('/consent')
                      return
                    }
                  } catch {
                    router.push('/consent')
                    return
                  }
                  router.push('/capture' as never)
                })()
              }}
            />
          </SettingsCard>
        </SettingsSection>

        {!userId ? (
          <SettingsSection>
            <SettingsCard>
              <SettingsRow
                label={s('登录', '登入', 'Sign in', 'ログイン')}
                onPress={() => router.push('/sign-in')}
              />
            </SettingsCard>
          </SettingsSection>
        ) : null}

        <SettingsSection title={s('提醒', '提醒', 'REMINDERS', 'リマインダー')}>
          <SettingsCard>
            <SettingsToggleRow
              label={s('提醒', '提醒', 'Reminders', 'リマインダー')}
              value={prefs.remindersOn && isPro}
              onValueChange={(v) => void applyReminders(v)}
              badge={isPro ? undefined : 'PRO'}
            />
          </SettingsCard>
          <Text
            style={{
              color: colors.dim,
              fontSize: 12,
              lineHeight: 17,
              marginTop: 8,
              paddingHorizontal: 4,
            }}
          >
            {s(
              '自我观察提示，非医疗建议。',
              '自我觀察提示，非醫療建議。',
              'For self-observation only — not medical advice.',
              '自己観察のためのヒントであり、医療アドバイスではありません。'
            )}
          </Text>
        </SettingsSection>

        <SettingsSection title={s('档案', '檔案', 'PROFILE', 'プロフィール')}>
          <SettingsCard>
            <SettingsRow
              label={s('生辰', '生辰', 'Birth', '生辰')}
              hint={s(
                '用于形气与八字对照；改后需重新生成报告才生效',
                '用於形氣與八字對照；改後需重新生成報告才生效',
                'Powers form-qi × BaZi contrast; regenerate a report after changes',
                '形気と八字の対照に使います。変更後はレポートを再生成してください。'
              )}
              onPress={() => router.push('/birth' as never)}
              divider
            />
            <SettingsRow
              label={s('历史档案', '歷史檔案', 'History', '履歴')}
              trailing={readingCount > 0 ? String(readingCount) : undefined}
              onPress={() => router.push('/(app)/archive' as never)}
            />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection title={s('参考', '參考', 'LIBRARY', '参考')}>
          <SettingsCard>
            <SettingsRow
              label={s('符号说明', '符號說明', 'Glossary', '記号の説明')}
              onPress={() => router.push('/glossary' as never)}
              divider
            />
            <SettingsRow
              label={s('术语表', '術語表', 'Terms', '用語集')}
              onPress={() => router.push('/terms' as never)}
            />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection title={s('购买', '購買', 'PURCHASES', '購入')}>
          <SettingsCard>
            <SettingsRow
              label={
                restoreBusy
                  ? s('恢复中…', '恢復中…', 'Restoring…', '復元中…')
                  : s('恢复购买', '恢復購買', 'Restore purchases', '購入を復元')
              }
              onPress={() => {
                if (restoreBusy) return
                setRestoreBusy(true)
                void restorePurchases()
                  .then(() => {
                    Alert.alert(s('已恢复', '已恢復', 'Restored', '復元しました'), undefined, [
                      { text: s('好', '好', 'OK', 'OK') },
                    ])
                  })
                  .catch(() => {
                    Alert.alert(s('恢复失败', '恢復失敗', 'Restore failed', '復元に失敗しました'))
                  })
                  .finally(() => setRestoreBusy(false))
              }}
            />
          </SettingsCard>
        </SettingsSection>

        {/* iCloud photo sync is not implemented yet — hide the empty promise. */}

        <SettingsSection title={s('法律', '法律', 'LEGAL', '規約')}>
          <SettingsCard>
            <SettingsRow
              label={s('隐私', '隱私', 'Privacy', 'プライバシー')}
              onPress={() => void Linking.openURL(privacyPolicyUrl(locale))}
              divider
            />
            <SettingsRow
              label={s('服务条款', '服務條款', 'Terms of service', '利用規約')}
              onPress={() => void Linking.openURL('https://www.hexastral.com/en/terms')}
            />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection title={s('账户', '帳戶', 'ACCOUNT', 'アカウント')}>
          <SettingsCard>
            <SettingsRow
              label={s('用量与周期', '用量與週期', 'Usage & cadence', '用量と周期')}
              hint={s(
                '最近解读、25 天更新建议、本月额度',
                '最近解讀、25 天更新建議、本月額度',
                'Last reading, 25-day refresh, monthly quotas',
                '直近の解読、25日更新の目安、今月の枠'
              )}
              onPress={() => router.push('/(app)/usage' as never)}
              divider={Boolean(userId)}
            />
            {userId ? (
              <>
                <SettingsRow
                  label={s(
                    '撤回照片与特征处理同意',
                    '撤回照片與特徵處理同意',
                    'Withdraw photo & feature consent',
                    '写真と特徴処理の同意を撤回'
                  )}
                  onPress={() => {
                    Alert.alert(
                      s('撤回同意', '撤回同意', 'Withdraw consent', '同意を撤回'),
                      s(
                        '撤回后需重新同意才能继续形气解读；本机照片草稿也会清除。',
                        '撤回後需重新同意才能繼續形氣解讀；本機照片草稿也會清除。',
                        'You must consent again before a form-qi reading. On-device photo drafts are cleared.',
                        '撤回後は形気リーディングの前に再度同意が必要です。端末内の写真下書きも削除されます。'
                      ),
                      [
                        {
                          text: s('取消', '取消', 'Cancel', 'キャンセル'),
                          style: 'cancel',
                        },
                        {
                          text: s('撤回', '撤回', 'Withdraw', '撤回する'),
                          style: 'destructive',
                          onPress: () => {
                            void (async () => {
                              try {
                                await revokeBiometricConsent()
                                await clearReadingDraft({ wipePhotos: true })
                              } catch {
                                Alert.alert(s('失败', '失敗', 'Failed', '失敗しました'))
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
                  label={s('退出登录', '退出登入', 'Sign out', 'ログアウト')}
                  danger
                  onPress={() => {
                    Alert.alert(s('退出登录', '退出登入', 'Sign out', 'ログアウト'), undefined, [
                      { text: s('取消', '取消', 'Cancel', 'キャンセル'), style: 'cancel' },
                      {
                        text: s('退出', '退出', 'Sign out', 'ログアウト'),
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
                trailing={devEntitlementLabel(devPro)}
                onPress={cycleDevPro}
                divider
              />
              <SettingsRow
                label='Reset onboarding'
                onPress={() => {
                  void resetOnboarding().then(() => router.replace('/'))
                }}
                divider
              />
              <SettingsRow
                label='Clear consent (dev)'
                onPress={() => {
                  void (async () => {
                    try {
                      await setCachedBiometricConsent(false)
                      await clearReadingDraft({ wipePhotos: true })
                      if (userId) {
                        try {
                          await revokeBiometricConsent()
                        } catch {
                          // Local reset is enough for dev loops; server revoke may fail offline.
                        }
                      }
                      Alert.alert('DEV', 'Consent cleared')
                    } catch {
                      Alert.alert('DEV', 'Failed to clear consent')
                    }
                  })()
                }}
              />
            </SettingsCard>
          </SettingsSection>
        ) : null}
      </ScrollView>
    </View>
  )
}
