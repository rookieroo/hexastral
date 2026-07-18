import { Button, useTheme } from '@zhop/core-ui'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { SatellitePaywall } from '@zhop/satellite-ui'
import { router, Stack } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import Purchases from 'react-native-purchases'

import { runFaceReading } from '@/lib/api'
import { ONESHOT_PRICE_FLOOR_USD, REVENUECAT_PRODUCT_IDS } from '@/lib/growth-config'
import { useSatelliteI18n } from '@/lib/i18n'
import { scheduleFaceOraclePush } from '@/lib/push-schedule'
import {
  clearReadingDraft,
  draftReadyForPaywall,
  getReadingDraft,
  patchReadingDraft,
} from '@/lib/reading-draft'

export default function FacePaywallScreen() {
  const { colors, spacing } = useTheme()
  const { locale } = useSatelliteI18n()
  const zh = locale.startsWith('zh')
  const entitlements = useEntitlements()
  const isPro =
    hasEntitlement(entitlements, 'faceoracle_pro') ||
    hasEntitlement(entitlements, 'universe_pro')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startReading = async (outputKind: 'oneshot' | 'period_brief') => {
    const draft = getReadingDraft()
    if (!draftReadyForPaywall(draft)) {
      setError(zh ? '请先完成三张照片与生辰' : 'Complete three photos and birth info first')
      router.replace('/capture')
      return
    }
    setBusy(true)
    setError(null)
    try {
      patchReadingDraft({
        outputKind,
        updateKind: 'full',
      })
      const res = await runFaceReading(getReadingDraft(), locale)
      if (res.mode === 'refused') {
        setError(res.reason)
        return
      }
      const output = res.output as Record<string, unknown>
      const events = Array.isArray(output.events)
        ? (output.events as Array<{ startMonth?: string; theme?: string; note?: string }>)
        : []
      await scheduleFaceOraclePush({ locale, isPro: isPro || outputKind === 'period_brief', events })
      clearReadingDraft()
      router.replace({
        pathname: '/result',
        params: {
          readingId: res.readingId,
          payload: encodeURIComponent(JSON.stringify(output)),
        },
      } as never)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'signin_required' || msg === 'biometric_consent_required') {
        router.push(msg === 'signin_required' ? '/(tabs)/me' : '/consent')
        return
      }
      if (msg.includes('402') || msg.includes('purchase')) {
        setError(zh ? '需要购买或订阅后才能解读' : 'Purchase or subscribe to continue')
        return
      }
      setError(zh ? '解读失败，请稍后重试' : 'Reading failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const buyOneshot = async () => {
    setBusy(true)
    setError(null)
    try {
      await Purchases.purchaseProduct(REVENUECAT_PRODUCT_IDS.reading)
      await startReading('oneshot')
    } catch (err) {
      console.warn('[face-oracle] oneshot purchase', err)
      setError(zh ? '购买未完成' : 'Purchase not completed')
      setBusy(false)
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}
    >
      <Stack.Screen options={{ title: zh ? '解锁解读' : 'Unlock reading', headerShown: true }} />
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '600' }}>
        {zh ? '选择解锁方式' : 'Choose how to unlock'}
      </Text>
      <Text style={{ color: colors.secondary, fontSize: 14, lineHeight: 20 }}>
        {zh
          ? `单次完整解读起价 $${ONESHOT_PRICE_FLOOR_USD}（三图 Vision + 生辰对照）。订阅可按月更新 Timeline，并收到宜留意的时间窗提醒。`
          : `One complete reading from $${ONESHOT_PRICE_FLOOR_USD} (3× Vision + birth contrast). Subscribe for Timeline updates and event-window reminders.`}
      </Text>

      {isPro ? (
        <Button variant='primary' onPress={() => void startReading('period_brief')} disabled={busy}>
          {zh ? '用 Pro 额度发起本期解读' : 'Start period reading with Pro'}
        </Button>
      ) : (
        <>
          <Button variant='primary' onPress={() => void buyOneshot()} disabled={busy}>
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
              title: zh ? 'FaceOracle Pro' : 'FaceOracle Pro',
              planLabels: {
                monthly: zh ? '月度订阅 · Timeline' : 'Monthly · Timeline',
                annual: zh ? '年度订阅 · Timeline' : 'Annual · Timeline',
              },
              restorePrimary: zh ? '恢复购买' : 'Restore',
            }}
            onSelect={async (productId) => {
              setBusy(true)
              try {
                await Purchases.purchaseProduct(productId)
                await startReading('period_brief')
              } catch (err) {
                console.warn('[face-oracle] sub purchase', err)
                setError(zh ? '订阅未完成' : 'Subscription not completed')
                setBusy(false)
              }
            }}
          />
        </>
      )}

      {busy ? <ActivityIndicator color={colors.accent} /> : null}
      {error ? <Text style={{ color: colors.accent }}>{error}</Text> : null}
    </ScrollView>
  )
}
