/**
 * 印匣 — account / device case. Grouped cards; keep content minimal.
 */

import { useTheme } from '@zhop/core-ui'
import { fetchReadings } from '@zhop/portfolio-client'
import {
  clearPortfolioUserId,
  type DevEntitlementOverride,
  getDevEntitlementOverride,
  getDeviceSecret,
  getPortfolioUserId,
  hasEntitlement,
  useEntitlements,
} from '@zhop/satellite-runtime'
import * as Linking from 'expo-linking'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Alert, Platform, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  SettingsCard,
  SettingsRow,
  SettingsSection,
  SettingsToggleRow,
} from '@/components/settings/SettingsSection'
import { deleteSyelAccount } from '@/lib/account-delete'
import { fetchBiometricConsent, revokeBiometricConsent } from '@/lib/api'
import { cycleDevEntitlementOverride, devEntitlementLabel } from '@/lib/dev-pro-toggle'
import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { setHomeCaptureHandoff } from '@/lib/home-capture-handoff'
import { privacyPolicyUrl, resolveLocale } from '@/lib/i18n'
import { restorePurchases } from '@/lib/iap'
import {
  getIcloudPhotoSyncEnabled,
  isSyelIcloudBridgeAvailable,
  pullReadingPhotosFromICloudIfEnabled,
  syncReadingPhotosToICloudIfEnabled,
} from '@/lib/icloud-sync'
import { setIcloudPhotoSyncEnabled } from '@/lib/icloud-sync-preference'
import { deepNextReadingCopy, sealCaseCopy } from '@/lib/living-copy'
import { pickUi } from '@/lib/locale-zh'
import { resetOnboarding } from '@/lib/onboarding'
import { getXingqiPushPrefs, setXingqiPushPrefs, type XingqiPushPrefs } from '@/lib/push-preference'
import { cancelXingqiPush, scheduleXingqiPush } from '@/lib/push-schedule'
import { getDeepNextReading, setDeepNextReading } from '@/lib/reading-preference'
import { registerXingqiServerPush, unregisterXingqiServerPush } from '@/lib/server-push'
import { clearLocalPhotosOnly, wipeLocalSyelData } from '@/lib/wipe-local-data'

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
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [readingCount, setReadingCount] = useState(0)
  const [deepNext, setDeepNext] = useState(false)
  const [icloudOn, setIcloudOn] = useState(false)
  const icloudBridge = Platform.OS === 'ios' && isSyelIcloudBridgeAvailable()
  const deepCopy = deepNextReadingCopy(locale)

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const id = await getPortfolioUserId()
        const secret = await getDeviceSecret()
        setUserId(id && secret ? id : null)
      })()
      void getXingqiPushPrefs().then(setPrefs)
      void fetchReadings(PORTFOLIO_TARGET_APP)
        .then((hist) => setReadingCount(hist.readings?.length ?? 0))
        .catch(() => setReadingCount(0))
      void getDeepNextReading().then((on) => {
        // Opt-in only; never show ON until the user flips it while Pro.
        setDeepNext(isPro ? on : false)
      })
      if (icloudBridge) {
        void getIcloudPhotoSyncEnabled().then(setIcloudOn)
        void pullReadingPhotosFromICloudIfEnabled()
      }
      if (__DEV__) setDevPro(getDevEntitlementOverride())
    }, [icloudBridge, isPro])
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
    void cycleDevEntitlementOverride().then((next) => {
      setDevPro(next)
      if (next === 'pro') setDeepNext(false)
    })
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
                  setHomeCaptureHandoff()
                  router.replace('/(app)' as never)
                })()
              }}
            />
          </SettingsCard>
        </SettingsSection>

        {readingCount > 0 ? (
          <SettingsSection title={s('解读', '解讀', 'READINGS', '解読')}>
            <SettingsCard>
              <SettingsToggleRow
                label={deepCopy.label}
                value={deepNext && isPro}
                onValueChange={(v) => {
                  if (!isPro) {
                    softGatePro()
                    return
                  }
                  setDeepNext(v)
                  void setDeepNextReading(v)
                }}
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
              {deepCopy.hint}
            </Text>
          </SettingsSection>
        ) : null}

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
              label={s('管理订阅', '管理訂閱', 'Manage subscription', 'サブスクリプション管理')}
              onPress={() => {
                const url =
                  Platform.OS === 'android'
                    ? 'https://play.google.com/store/account/subscriptions'
                    : 'https://apps.apple.com/account/subscriptions'
                void Linking.openURL(url)
              }}
              divider
            />
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

        {icloudBridge ? (
          <SettingsSection title={s('照片', '照片', 'PHOTOS', '写真')}>
            <SettingsCard>
              <SettingsToggleRow
                label={s(
                  'iCloud 同步封存照片',
                  'iCloud 同步封存照片',
                  'iCloud sealed photo sync',
                  'iCloud で封存写真を同期'
                )}
                hint={s(
                  '仅同步已封存的形气照片（时间线/场域）。拍摄草稿留在本机，不会上传到我们的服务器。',
                  '僅同步已封存的形氣照片（時間線/場域）。拍攝草稿留在本機，不會上傳到我們的伺服器。',
                  'Syncs sealed period photos for timeline/locus only. Capture drafts stay on this device; we never store them on our servers.',
                  'タイムライン／場用の封存写真のみ同期。撮影下書きはこの端末に残り、当社サーバーには上がりません。'
                )}
                value={icloudOn}
                onValueChange={(next) => {
                  setIcloudOn(next)
                  void (async () => {
                    await setIcloudPhotoSyncEnabled(next)
                    if (next) {
                      await syncReadingPhotosToICloudIfEnabled()
                      await pullReadingPhotosFromICloudIfEnabled()
                    }
                  })()
                }}
                divider
              />
              <SettingsRow
                label={s('清除本机照片', '清除本機照片', 'Clear local photos', '端末の写真を削除')}
                hint={s(
                  '删除草稿与封存照片；账号与报告保留。',
                  '刪除草稿與封存照片；帳號與報告保留。',
                  'Removes drafts and sealed photos; account and reports stay.',
                  '下書きと封存写真を削除。アカウントとレポートは残ります。'
                )}
                danger
                onPress={() => {
                  Alert.alert(
                    s('清除本机照片', '清除本機照片', 'Clear local photos', '端末の写真を削除'),
                    s(
                      '将删除本机拍摄草稿与封存照片。报告与账号不受影响。若已开启 iCloud 同步，云端封存副本也会清除。',
                      '將刪除本機拍攝草稿與封存照片。報告與帳號不受影響。若已開啟 iCloud 同步，雲端封存副本也會清除。',
                      'Deletes on-device drafts and sealed photos. Reports and account stay. If iCloud sync is on, the cloud sealed copy is cleared too.',
                      '端末の下書きと封存写真を削除します。レポートとアカウントは残ります。iCloud 同期がオンならクラウドの封存コピーも消えます。'
                    ),
                    [
                      { text: s('取消', '取消', 'Cancel', 'キャンセル'), style: 'cancel' },
                      {
                        text: s('清除', '清除', 'Clear', '削除'),
                        style: 'destructive',
                        onPress: () => {
                          void (async () => {
                            try {
                              await clearLocalPhotosOnly()
                              Alert.alert(
                                s('已清除', '已清除', 'Cleared', '削除しました'),
                                undefined,
                                [{ text: s('好', '好', 'OK', 'OK') }]
                              )
                            } catch {
                              Alert.alert(s('失败', '失敗', 'Failed', '失敗しました'))
                            }
                          })()
                        },
                      },
                    ]
                  )
                }}
              />
            </SettingsCard>
          </SettingsSection>
        ) : (
          <SettingsSection title={s('照片', '照片', 'PHOTOS', '写真')}>
            <SettingsCard>
              <SettingsRow
                label={s('清除本机照片', '清除本機照片', 'Clear local photos', '端末の写真を削除')}
                hint={s(
                  '删除草稿与封存照片；账号与报告保留。',
                  '刪除草稿與封存照片；帳號與報告保留。',
                  'Removes drafts and sealed photos; account and reports stay.',
                  '下書きと封存写真を削除。アカウントとレポートは残ります。'
                )}
                danger
                onPress={() => {
                  Alert.alert(
                    s('清除本机照片', '清除本機照片', 'Clear local photos', '端末の写真を削除'),
                    s(
                      '将删除本机拍摄草稿与封存照片。报告与账号不受影响。',
                      '將刪除本機拍攝草稿與封存照片。報告與帳號不受影響。',
                      'Deletes on-device drafts and sealed photos. Reports and account stay.',
                      '端末の下書きと封存写真を削除します。レポートとアカウントは残ります。'
                    ),
                    [
                      { text: s('取消', '取消', 'Cancel', 'キャンセル'), style: 'cancel' },
                      {
                        text: s('清除', '清除', 'Clear', '削除'),
                        style: 'destructive',
                        onPress: () => {
                          void (async () => {
                            try {
                              await clearLocalPhotosOnly()
                              Alert.alert(
                                s('已清除', '已清除', 'Cleared', '削除しました'),
                                undefined,
                                [{ text: s('好', '好', 'OK', 'OK') }]
                              )
                            } catch {
                              Alert.alert(s('失败', '失敗', 'Failed', '失敗しました'))
                            }
                          })()
                        },
                      },
                    ]
                  )
                }}
              />
            </SettingsCard>
          </SettingsSection>
        )}

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
                        '撤回后需重新同意才能继续形气解读；本机照片草稿、封存照片与待处理的短暂上传也会清除。',
                        '撤回後需重新同意才能繼續形氣解讀；本機照片草稿、封存照片與待處理的短暫上傳也會清除。',
                        'You must consent again before a form-qi reading. On-device drafts, sealed photos, and any pending short-lived uploads are cleared.',
                        '撤回後は形気リーディングの前に再度同意が必要です。端末の下書き・封存写真・保留中の短寿命アップロードも削除されます。'
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
                                await wipeLocalSyelData({ clearIcloudPref: false })
                                setIcloudOn(await getIcloudPhotoSyncEnabled())
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
                            await wipeLocalSyelData()
                            await clearPortfolioUserId()
                            setIcloudOn(false)
                            setUserId(null)
                            router.back()
                          })()
                        },
                      },
                    ])
                  }}
                  divider
                />
                <SettingsRow
                  label={
                    deleteBusy
                      ? s('删除中…', '刪除中…', 'Deleting…', '削除中…')
                      : s('删除账号', '刪除帳號', 'Delete account', 'アカウント削除')
                  }
                  danger
                  onPress={() => {
                    if (deleteBusy) return
                    Alert.alert(
                      s('删除账号', '刪除帳號', 'Delete account', 'アカウント削除'),
                      s(
                        '将永久删除服务器上的生辰、报告、形气特征与账号数据；本机照片与草稿也会清除。此操作无法撤销。App Store 订阅需另行在系统设置中取消。',
                        '將永久刪除伺服器上的生辰、報告、形氣特徵與帳號資料；本機照片與草稿也會清除。此操作無法撤銷。App Store 訂閱需另行在系統設定中取消。',
                        'Permanently deletes birth info, reports, form-qi features, and account data on our servers; on-device photos and drafts are cleared too. This cannot be undone. Cancel App Store subscriptions separately in system settings.',
                        'サーバー上の生辰・レポート・形気特徴・アカウントデータを完全削除し、端末の写真と下書きも消します。取り消せません。App Store のサブスクリプションはシステム設定で別途解約してください。'
                      ),
                      [
                        { text: s('取消', '取消', 'Cancel', 'キャンセル'), style: 'cancel' },
                        {
                          text: s('删除账号', '刪除帳號', 'Delete account', 'アカウント削除'),
                          style: 'destructive',
                          onPress: () => {
                            Alert.alert(
                              s(
                                '确认删除？',
                                '確認刪除？',
                                'Confirm delete?',
                                '本当に削除しますか？'
                              ),
                              s(
                                '删除后无法恢复。',
                                '刪除後無法恢復。',
                                'This cannot be undone.',
                                '削除後は復元できません。'
                              ),
                              [
                                {
                                  text: s('取消', '取消', 'Cancel', 'キャンセル'),
                                  style: 'cancel',
                                },
                                {
                                  text: s('永久删除', '永久刪除', 'Delete forever', '完全に削除'),
                                  style: 'destructive',
                                  onPress: () => {
                                    void (async () => {
                                      setDeleteBusy(true)
                                      try {
                                        const ok = await deleteSyelAccount()
                                        if (!ok) {
                                          Alert.alert(
                                            s(
                                              '删除失败',
                                              '刪除失敗',
                                              'Delete failed',
                                              '削除に失敗しました'
                                            )
                                          )
                                          return
                                        }
                                        setIcloudOn(false)
                                        setUserId(null)
                                        router.replace('/' as never)
                                      } catch {
                                        Alert.alert(
                                          s(
                                            '删除失败',
                                            '刪除失敗',
                                            'Delete failed',
                                            '削除に失敗しました'
                                          )
                                        )
                                      } finally {
                                        setDeleteBusy(false)
                                      }
                                    })()
                                  },
                                },
                              ]
                            )
                          },
                        },
                      ]
                    )
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
                      await wipeLocalSyelData({ clearIcloudPref: false })
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
