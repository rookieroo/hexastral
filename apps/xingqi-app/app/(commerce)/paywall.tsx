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
import { draftReadyForPaywall, getReadingDraft } from '@/lib/reading-draft'
import { alertIfPhotosUnchanged } from '@/lib/reading-preflight'
import {
  acknowledgeReadingJob,
  consumeReadingJobError,
  enableReadingCompletionPush,
  getReadingJobState,
  resumeReadingJobIfNeeded,
  startReadingJob,
  subscribeReadingJob,
} from '@/lib/reading-job'
import { readingHasReportBody } from '@/lib/report-chapters'
import { getXingqiPushPrefs, setXingqiPushPrefs } from '@/lib/push-preference'

type Phase = 'choose' | 'handoff' | 'purchasing'

export default function XingqiPaywallScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const zh = locale.startsWith('zh')
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
        const id = job.readingId
        const payload = job.resultPayload
        let hasBody = false
        try {
          hasBody = readingHasReportBody(
            JSON.parse(decodeURIComponent(payload)) as Record<string, unknown>
          )
        } catch {
          hasBody = false
        }
        acknowledgeReadingJob()
        if (!hasBody) {
          router.replace('/(app)' as never)
          return
        }
        router.replace({
          pathname: '/result',
          params: { readingId: id },
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
      setError(zh ? '请先完成三张照片与生辰' : 'Complete three photos and birth info first')
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
        setError(zh ? '购买未完成' : 'Purchase not completed')
        setPhase('choose')
        return
      }
      beginHandoff('oneshot')
    } catch {
      setError(zh ? '购买未完成' : 'Purchase not completed')
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
        setError(zh ? '未获得通知权限' : 'Notification permission not granted')
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
              <XingqiLoader label={zh ? '解读中' : 'Reading'} />
            </View>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '600' }}>
              {zh ? '形气解读已开始' : 'Your reading has started'}
            </Text>
            <Text style={{ color: colors.secondary, fontSize: 15, lineHeight: 22 }}>
              {zh
                ? '完整流程通常需要几分钟（特征提取与解读）。请耐心等待，可先回到首页；完成后列表会更新。'
                : 'This usually takes a few minutes (feature extract + reading). Please wait — you can return home; the list will update when ready.'}
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
                  {zh ? '完成后通知我' : 'Notify me when ready'}
                </Text>
                <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 17 }}>
                  {zh
                    ? '开启系统推送权限，解读完成后提醒'
                    : 'Enable push so we can alert you when done'}
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
              {zh ? '完成' : 'Done'}
            </Button>
          </>
        ) : (
          <>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '600' }}>
              {zh ? '选择解锁方式' : 'Choose how to unlock'}
            </Text>
            <Text style={{ color: colors.secondary, fontSize: 14, lineHeight: 20 }}>
              {zh
                ? `单次完整解读起价 $${ONESHOT_PRICE_FLOOR_USD}。订阅可更新 Timeline。解读通常需要几分钟。`
                : `One complete reading from $${ONESHOT_PRICE_FLOOR_USD}. Subscribe for Timeline. Readings usually take a few minutes.`}
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
                {zh ? '用 Pro 额度发起' : 'Start with Pro'}
              </Button>
            ) : (
              <>
                <Button
                  variant='primary'
                  onPress={() => void buyOneshot()}
                  disabled={phase === 'purchasing'}
                >
                  {zh
                    ? `单次解读 · $${ONESHOT_PRICE_FLOOR_USD}+`
                    : `One-shot · $${ONESHOT_PRICE_FLOOR_USD}+`}
                </Button>
                <SatellitePaywall
                  productIds={{
                    monthly: REVENUECAT_PRODUCT_IDS.monthly,
                    annual: REVENUECAT_PRODUCT_IDS.annual,
                  }}
                  copy={{
                    title: 'Xingqi Pro',
                    planLabels: {
                      monthly: zh ? '月度 · Timeline' : 'Monthly · Timeline',
                      annual: zh ? '年度 · Timeline' : 'Annual · Timeline',
                    },
                    restorePrimary: zh ? '恢复购买' : 'Restore',
                  }}
                  onRestore={() => void restorePurchases()}
                  onSelect={async (productId) => {
                    if (!(await ensureSignedIn())) return
                    setPhase('purchasing')
                    try {
                      const ok = await purchaseProduct(productId)
                      if (!ok) {
                        setError(zh ? '订阅未完成' : 'Subscription not completed')
                        setPhase('choose')
                        return
                      }
                      beginHandoff('period_brief')
                    } catch {
                      setError(zh ? '订阅未完成' : 'Subscription not completed')
                      setPhase('choose')
                    }
                  }}
                />
              </>
            )}

            {phase === 'purchasing' ? (
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <XingqiLoader label={zh ? '处理购买' : 'Processing'} />
              </View>
            ) : null}
          </>
        )}

        {error ? <Text style={{ color: colors.accent }}>{error}</Text> : null}
      </ScrollView>
    </View>
  )
}
