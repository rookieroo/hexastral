import { Button, useTheme } from '@zhop/core-ui'
import { getPortfolioUserId, hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { SatellitePaywall } from '@zhop/satellite-ui'
import { router, Stack } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, ScrollView, Text } from 'react-native'

import { runFaceReading } from '@/lib/api'
import { ONESHOT_PRICE_FLOOR_USD, REVENUECAT_PRODUCT_IDS } from '@/lib/growth-config'
import { resolveLocale } from '@/lib/i18n'
import { purchaseProduct, restorePurchases } from '@/lib/iap'
import { scheduleXingqiPush } from '@/lib/push-schedule'
import {
  clearReadingDraft,
  draftReadyForPaywall,
  getReadingDraft,
  patchReadingDraft,
} from '@/lib/reading-draft'

export default function XingqiPaywallScreen() {
  const { colors, spacing } = useTheme()
  const locale = resolveLocale()
  const zh = locale.startsWith('zh')
  const entitlements = useEntitlements()
  const isPro =
    hasEntitlement(entitlements, 'faceoracle_pro') ||
    hasEntitlement(entitlements, 'universe_pro')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ensureSignedIn = async (): Promise<boolean> => {
    const userId = await getPortfolioUserId()
    if (userId) return true
    router.push('/sign-in')
    return false
  }

  const startReading = async (outputKind: 'oneshot' | 'period_brief') => {
    if (!(await ensureSignedIn())) return
    const draft = getReadingDraft()
    if (!draftReadyForPaywall(draft)) {
      setError(zh ? '请先完成三张照片与生辰' : 'Complete three photos and birth info first')
      router.replace('/capture')
      return
    }
    setBusy(true)
    setError(null)
    try {
      patchReadingDraft({ outputKind, updateKind: 'full' })
      const res = await runFaceReading(getReadingDraft(), locale)
      if (res.mode === 'refused') {
        setError(res.reason)
        return
      }
      const output = res.output as Record<string, unknown>
      const events = Array.isArray(output.events)
        ? (output.events as Array<{ startMonth?: string; theme?: string; note?: string }>)
        : []
      await scheduleXingqiPush({
        locale,
        isPro: isPro || outputKind === 'period_brief',
        events,
      })
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
        if (msg === 'signin_required') router.push('/sign-in')
        else router.push('/consent')
        return
      }
      setError(zh ? '解读失败，请稍后重试' : 'Reading failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const buyOneshot = async () => {
    if (!(await ensureSignedIn())) return
    setBusy(true)
    setError(null)
    try {
      const ok = await purchaseProduct(REVENUECAT_PRODUCT_IDS.reading)
      if (!ok) {
        setError(zh ? '购买未完成' : 'Purchase not completed')
        setBusy(false)
        return
      }
      await startReading('oneshot')
    } catch {
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
          ? `单次完整解读起价 $${ONESHOT_PRICE_FLOOR_USD}。订阅可更新 Timeline。`
          : `One complete reading from $${ONESHOT_PRICE_FLOOR_USD}. Subscribe for Timeline.`}
      </Text>

      {isPro ? (
        <Button variant='primary' onPress={() => void startReading('period_brief')} disabled={busy}>
          {zh ? '用 Pro 额度发起' : 'Start with Pro'}
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
              setBusy(true)
              try {
                const ok = await purchaseProduct(productId)
                if (!ok) {
                  setError(zh ? '订阅未完成' : 'Subscription not completed')
                  setBusy(false)
                  return
                }
                await startReading('period_brief')
              } catch {
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
