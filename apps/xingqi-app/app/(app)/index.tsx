/**
 * Home — single composition, no tabs.
 * Gear or left-swipe → settings. Primary CTA → consent funnel.
 */

import { Button, useTheme } from '@zhop/core-ui'
import { fetchReadings, type PortfolioReadingItem } from '@zhop/portfolio-client'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { useFocusEffect, useRouter } from 'expo-router'
import { Settings } from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { XingqiMark } from '@/components/XingqiMark'
import { fetchBiometricConsent, fetchPhotoQuota } from '@/lib/api'
import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { resolveLocale } from '@/lib/i18n'

export default function XingqiHomeScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors, spacing } = useTheme()
  const locale = resolveLocale()
  const zh = locale.startsWith('zh')
  const entitlements = useEntitlements()
  const isPro =
    hasEntitlement(entitlements, 'faceoracle_pro') ||
    hasEntitlement(entitlements, 'universe_pro')
  const [items, setItems] = useState<PortfolioReadingItem[]>([])
  const [quota, setQuota] = useState<{ used: number; limit: number; remaining: number } | null>(
    null
  )
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const hist = await fetchReadings(PORTFOLIO_TARGET_APP)
      setItems(hist.readings ?? [])
      if (isPro) setQuota(await fetchPhotoQuota())
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [isPro])

  useFocusEffect(
    useCallback(() => {
      void reload()
    }, [reload])
  )

  const openSettings = useCallback(() => {
    router.push('/(app)/settings')
  }, [router])

  const startReading = useCallback(async () => {
    try {
      const consented = await fetchBiometricConsent()
      router.push(consented ? '/capture' : '/consent')
    } catch {
      router.push('/consent')
    }
  }, [router])

  const swipeToSettings = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-16, 16])
        .failOffsetY([-20, 20])
        .onEnd((e) => {
          if (e.translationX < -55 || e.velocityX < -650) {
            runOnJS(openSettings)()
          }
        }),
    [openSettings]
  )

  return (
    <GestureDetector gesture={swipeToSettings}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <XingqiMark size={28} color={colors.accent} />
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>Xingqi</Text>
          </View>
          <Pressable
            onPress={openSettings}
            hitSlop={12}
            accessibilityRole='button'
            accessibilityLabel={zh ? '设置' : 'Settings'}
          >
            <Settings size={22} color={colors.secondary} strokeWidth={1.5} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            paddingBottom: insets.bottom + spacing.xl,
            gap: spacing.lg,
          }}
        >
          <Text style={{ color: colors.secondary, fontSize: 15, lineHeight: 22 }}>
            {zh
              ? '左掌 · 右掌 · 面部，对照生辰读形气。'
              : 'Left palm · right palm · face, read with birth.'}
          </Text>

          {isPro && quota ? (
            <Text style={{ color: colors.dim, fontSize: 13 }}>
              {zh
                ? `本月照片位 ${quota.used}/${quota.limit}`
                : `Photo slots ${quota.used}/${quota.limit} this month`}
            </Text>
          ) : null}

          <Button variant='primary' onPress={() => void startReading()}>
            {items.length === 0
              ? zh
                ? '开始解读'
                : 'Start reading'
              : zh
                ? isPro
                  ? '更新本期'
                  : '再读一次'
                : isPro
                  ? 'Refresh period'
                  : 'New reading'}
          </Button>

          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
              {isPro ? 'Timeline' : zh ? '近期' : 'Recent'}
            </Text>

            {loading ? <ActivityIndicator color={colors.accent} /> : null}

            {!loading && items.length === 0 ? (
              <Text style={{ color: colors.secondary, lineHeight: 20 }}>
                {zh ? '完成后会出现在这里。' : 'Completed readings appear here.'}
              </Text>
            ) : null}

            {items.map((item) => {
              let overview = ''
              try {
                const raw = JSON.parse(item.resultJson) as Record<string, unknown>
                const ai = (raw.aiInterpretation ?? {}) as Record<string, unknown>
                overview = typeof ai.overview === 'string' ? ai.overview : ''
              } catch {
                overview = ''
              }
              return (
                <Pressable
                  key={item.id}
                  onPress={() =>
                    router.push({
                      pathname: '/result',
                      params: {
                        readingId: item.id,
                        payload: encodeURIComponent(item.resultJson),
                      },
                    } as never)
                  }
                  style={{
                    borderWidth: 0.5,
                    borderColor: colors.separator,
                    padding: spacing.md,
                    gap: 4,
                  }}
                >
                  <Text style={{ color: colors.dim, fontSize: 12 }}>
                    {item.createdAt?.slice(0, 10) ?? item.id}
                  </Text>
                  <Text style={{ color: colors.text, lineHeight: 20 }} numberOfLines={3}>
                    {overview || (zh ? '形气解读' : 'Form reading')}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </ScrollView>
      </View>
    </GestureDetector>
  )
}
