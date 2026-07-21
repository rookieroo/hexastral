import { Button, Toggle, useTheme } from '@zhop/core-ui'
import { getPortfolioUserId, hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { SatellitePaywall } from '@zhop/satellite-ui'
import { router, Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { XingqiLoader } from '@/components/XingqiLoader'
import { ONESHOT_PRICE_FLOOR_USD, REVENUECAT_PRODUCT_IDS } from '@/lib/growth-config'
import { resolveLocale } from '@/lib/i18n'
import { purchaseProduct, restorePurchases } from '@/lib/iap'
import { isCjkZh, pickZh } from '@/lib/locale-zh'
import { getXingqiPushPrefs, setXingqiPushPrefs } from '@/lib/push-preference'
import { draftReadyForPaywall, getReadingDraft } from '@/lib/reading-draft'
import {
  bindReadingJobLifecycle,
  consumeReadingJobDone,
  consumeReadingJobError,
  enableReadingCompletionPush,
  getReadingJobState,
  resumeReadingJobIfNeeded,
  startReadingJob,
  subscribeReadingJob,
} from '@/lib/reading-job'
import { alertIfPhotosUnchanged } from '@/lib/reading-preflight'
import { readingHasReportBody } from '@/lib/report-chapters'

type Phase = 'choose' | 'handoff' | 'purchasing'

export default function XingqiPaywallScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const s = (hans: string, hant: string, en: string) =>
    isCjkZh(locale) ? pickZh(locale, hans, hant) : en
  const entitlements = useEntitlements()
  const isPro =
    hasEntitlement(entitlements, 'faceoracle_pro') || hasEntitlement(entitlements, 'universe_pro')
  const [phase, setPhase] = useState<Phase>('choose')
  const [error, setError] = useState<string | null>(null)
  const [notifyOn, setNotifyOn] = useState(false)
  const [notifyBusy, setNotifyBusy] = useState(false)

  useEffect(() => {
    return subscribeReadingJob((job) => {
      if (job.status === 'done' && job.readingId && job.resultPayload) {
        const claimed = consumeReadingJobDone()
        if (!claimed) return
        let hasBody = false
        try {
          hasBody = readingHasReportBody(
            JSON.parse(decodeURIComponent(claimed.resultPayload)) as Record<string, unknown>
          )
        } catch {
          hasBody = false
        }
        if (!hasBody) {
          router.replace('/(app)' as never)
          return
        }
        router.replace({
          pathname: '/result',
          params: { readingId: claimed.readingId },
        } as never)
        return
      }
      if (job.status === 'error' && job.error) {
        const err = consumeReadingJobError()
        if (!err) return
        if (err === 'signin_required') {
          router.push('/sign-in')
          return
        }
        if (err === 'biometric_consent_required') {
          router.push('/consent')
          return
        }
        setError(err)
        setPhase('choose')
      }
    })
  }, [])

  useEffect(() => bindReadingJobLifecycle(locale, isPro), [locale, isPro])

  // If user re-opens paywall while a job is already running, show handoff.
  // Pro who somehow lands here: auto-start and skip the unlock chooser.
  useEffect(() => {
    const entitlementsPro = isPro
    resumeReadingJobIfNeeded(locale, entitlementsPro)
    if (getReadingJobState().status === 'running') {
      setPhase('handoff')
      return
    }
    if (!isPro) return
    const draft = getReadingDraft()
    if (!draftReadyForPaywall(draft)) return
    void (async () => {
      const prefs = await getXingqiPushPrefs()
      if (
        await alertIfPhotosUnchanged({
          draft,
          locale,
          onUpdatePhotos: () => router.replace('/capture'),
        })
      ) {
        return
      }
      const started = startReadingJob({
        locale,
        outputKind: 'period_brief',
        isPro: true,
        draft,
        onQueued: () => setPhase('handoff'),
      })
      if (prefs.remindersOn) setNotifyOn(true)
      if (!started) setPhase('handoff')
    })()
  }, [isPro, locale])

  const ensureSignedIn = async (): Promise<boolean> => {
    const userId = await getPortfolioUserId()
    if (userId) return true
    router.push('/sign-in')
    return false
  }

  const beginHandoff = (outputKind: 'oneshot' | 'period_brief') => {
    if (getReadingJobState().status === 'running') {
      setPhase('handoff')
      return
    }
    const draft = getReadingDraft()
    if (!draftReadyForPaywall(draft)) {
      setError(
        s(
          '请先完成三张照片与生辰',
          '請先完成三張照片與生辰',
          'Complete three photos and birth info first'
        )
      )
      router.replace('/capture')
      return
    }
    void (async () => {
      if (
        await alertIfPhotosUnchanged({
          draft,
          locale,
          onUpdatePhotos: () => router.replace('/capture'),
        })
      ) {
        return
      }
      if (notifyOn) {
        await setXingqiPushPrefs({ remindersOn: true })
        await enableReadingCompletionPush(locale)
      }
      const started = startReadingJob({
        locale,
        outputKind,
        isPro: isPro || outputKind === 'period_brief',
        draft,
        onQueued: () => {
          setError(null)
          setPhase('handoff')
        },
      })
      if (!started) {
        setError(null)
        setPhase('handoff')
      }
    })()
  }

  const buyOneshot = async () => {
    if (!(await ensureSignedIn())) return
    setPhase('purchasing')
    setError(null)
    try {
      const ok = await purchaseProduct(REVENUECAT_PRODUCT_IDS.reading)
      if (!ok) {
        setError(s('购买未完成', '購買未完成', 'Purchase not completed'))
        setPhase('choose')
        return
      }
      beginHandoff('oneshot')
    } catch {
      setError(s('购买未完成', '購買未完成', 'Purchase not completed'))
      setPhase('choose')
    }
  }

  const onToggleNotify = async (next: boolean) => {
    if (!next) {
      setNotifyOn(false)
      await setXingqiPushPrefs({ remindersOn: false })
      return
    }
    setNotifyBusy(true)
    try {
      const ok = await enableReadingCompletionPush(locale)
      setNotifyOn(ok)
      if (!ok) {
        setError(s('未获得通知权限', '未獲得通知權限', 'Notification permission not granted'))
      }
    } finally {
      setNotifyBusy(false)
    }
  }

  const goHome = () => {
    router.replace('/(app)' as never)
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xl,
          gap: spacing.lg,
        }}
        keyboardShouldPersistTaps='handled'
      >
        {phase === 'handoff' ? (
          <>
            <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
              <XingqiLoader label={s('解读中', '解讀中', 'Reading')} />
            </View>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '600' }}>
              {s('形气解读已开始', '形氣解讀已開始', 'Your reading has started')}
            </Text>
            <Text style={{ color: colors.secondary, fontSize: 15, lineHeight: 22 }}>
              {s(
                '完整流程通常需要几分钟（特征提取与解读）。请耐心等待，可先回到首页；完成后列表会更新。',
                '完整流程通常需要幾分鐘（特徵提取與解讀）。請耐心等待，可先回到首頁；完成後列表會更新。',
                'This usually takes a few minutes (feature extract + reading). Please wait — you can return home; the list will update when ready.'
              )}
            </Text>

            <View
              style={{
                borderWidth: 0.5,
                borderColor: colors.separator,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.md,
              }}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: colors.text, fontSize: 15 }}>
                  {s('完成后通知我', '完成後通知我', 'Notify me when ready')}
                </Text>
                <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 17 }}>
                  {s(
                    '开启系统推送权限，解读完成后提醒',
                    '開啟系統推送權限，解讀完成後提醒',
                    'Enable push so we can alert you when done'
                  )}
                </Text>
              </View>
              <Toggle
                value={notifyOn}
                onValueChange={(v) => void onToggleNotify(v)}
                accent={colors.accent}
                disabled={notifyBusy}
              />
            </View>

            <Button variant='primary' onPress={goHome}>
              {s('完成', '完成', 'Done')}
            </Button>
          </>
        ) : (
          <>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '600' }}>
              {s('选择解锁方式', '選擇解鎖方式', 'Choose how to unlock')}
            </Text>
            <Text style={{ color: colors.secondary, fontSize: 14, lineHeight: 20 }}>
              {s(
                `单次：密封六章简报——三轴（事业·爱情·健康）· 位点依据 · 大运流年对照 · 本期窗口。不是聊天式看图说话。Pro：档案 · 周期重拍 · 人生时间线 · 假如 · 报告内追问。起价 $${ONESHOT_PRICE_FLOOR_USD}。`,
                `單次：密封六章簡報——三軸（事業·愛情·健康）· 位點依據 · 大運流年對照 · 本期窗口。不是聊天式看圖說話。Pro：檔案 · 週期重拍 · 人生時間線 · 假如 · 報告內追問。起價 $${ONESHOT_PRICE_FLOOR_USD}。`,
                `One-shot: a sealed six-chapter brief — career · love · health, locus citations, computed DaYun/LiuNian contrast, period windows. Not chatty photo-reading. Pro: archive, period recapture, Life axis, What-if, in-report chat. From $${ONESHOT_PRICE_FLOOR_USD}.`
              )}
            </Text>

            {isPro ? (
              <Button
                variant='primary'
                onPress={() => {
                  void (async () => {
                    if (!(await ensureSignedIn())) return
                    beginHandoff('period_brief')
                  })()
                }}
                disabled={phase === 'purchasing'}
              >
                {s('用 Pro 额度发起', '用 Pro 額度發起', 'Start with Pro')}
              </Button>
            ) : (
              <>
                <Button
                  variant='primary'
                  onPress={() => void buyOneshot()}
                  disabled={phase === 'purchasing'}
                >
                  {s(
                    `单次简报 · $${ONESHOT_PRICE_FLOOR_USD}+`,
                    `單次簡報 · $${ONESHOT_PRICE_FLOOR_USD}+`,
                    `Sealed brief · $${ONESHOT_PRICE_FLOOR_USD}+`
                  )}
                </Button>
                <SatellitePaywall
                  productIds={{
                    monthly: REVENUECAT_PRODUCT_IDS.monthly,
                    annual: REVENUECAT_PRODUCT_IDS.annual,
                  }}
                  copy={{
                    title: 'Xingqi Pro',
                    planLabels: {
                      monthly: s(
                        '月度 · 档案与气机层',
                        '月度 · 檔案與氣機層',
                        'Monthly · Archive + qi layer'
                      ),
                      annual: s(
                        '年度 · 档案与气机层',
                        '年度 · 檔案與氣機層',
                        'Annual · Archive + qi layer'
                      ),
                    },
                    restorePrimary: s('恢复购买', '恢復購買', 'Restore'),
                  }}
                  onRestore={() => void restorePurchases()}
                  onSelect={async (productId) => {
                    if (!(await ensureSignedIn())) return
                    setPhase('purchasing')
                    try {
                      const ok = await purchaseProduct(productId)
                      if (!ok) {
                        setError(s('订阅未完成', '訂閱未完成', 'Subscription not completed'))
                        setPhase('choose')
                        return
                      }
                      beginHandoff('period_brief')
                    } catch {
                      setError(s('订阅未完成', '訂閱未完成', 'Subscription not completed'))
                      setPhase('choose')
                    }
                  }}
                />
              </>
            )}

            {phase === 'purchasing' ? (
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <XingqiLoader label={s('处理购买', '處理購買', 'Processing')} />
              </View>
            ) : null}
          </>
        )}

        {error ? <Text style={{ color: colors.accent }}>{error}</Text> : null}
      </ScrollView>
    </View>
  )
}
