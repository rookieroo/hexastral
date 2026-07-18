import { Button, useTheme } from '@zhop/core-ui'
import { fetchReadings, type PortfolioReadingItem } from '@zhop/portfolio-client'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'

import { fetchPhotoQuota } from '@/lib/api'
import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { useSatelliteI18n } from '@/lib/i18n'

export default function FaceOracleHomeScreen() {
  const router = useRouter()
  const { colors, spacing } = useTheme()
  const { locale, t } = useSatelliteI18n()
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

  const startFunnel = () => router.push('/consent' as never)

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }}
    >
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '600' }}>Face Oracle</Text>
      <Text style={{ color: colors.secondary, fontSize: 14, lineHeight: 20 }}>
        {zh
          ? '左掌 · 右掌 · 面部 + 生辰 → 形气解读。订阅后首页为 Timeline。'
          : 'Left palm · right palm · face + birth → form reading. Pro home is a Timeline.'}
      </Text>

      {isPro && quota ? (
        <Text style={{ color: colors.secondary, fontSize: 13 }}>
          {zh
            ? `本月照片位 ${quota.used}/${quota.limit}（整组=3，分部位=1）`
            : `Photo slots ${quota.used}/${quota.limit} this month (full=3, part=1)`}
        </Text>
      ) : null}

      <Button variant='primary' onPress={startFunnel}>
        {items.length === 0
          ? t('homePrimaryCta')
          : zh
            ? isPro
              ? '更新本期（整组）'
              : '再做一次解读'
            : isPro
              ? 'Full refresh'
              : 'New reading'}
      </Button>

      {isPro ? (
        <Button variant='ghost' onPress={() => router.push('/capture')}>
          {zh ? '只更新某一部位' : 'Update one part only'}
        </Button>
      ) : null}

      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginTop: spacing.sm }}>
        {isPro ? 'Timeline' : zh ? '历史' : 'History'}
      </Text>

      {loading ? <ActivityIndicator color={colors.accent} /> : null}

      {!loading && items.length === 0 ? (
        <Text style={{ color: colors.secondary }}>
          {zh
            ? '尚无解读。完成三图与生辰后，在解锁页发起。'
            : 'No readings yet. Finish three photos + birth, then unlock.'}
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
                pathname: '/detail',
                params: { readingId: item.id },
              } as never)
            }
            style={{
              borderWidth: 0.5,
              borderColor: colors.separator,
              borderRadius: 0,
              padding: spacing.md,
              gap: 4,
            }}
          >
            <Text style={{ color: colors.secondary, fontSize: 12 }}>
              {item.createdAt?.slice(0, 10) ?? item.id}
            </Text>
            <Text style={{ color: colors.text, lineHeight: 20 }} numberOfLines={3}>
              {overview || (zh ? '形气解读' : 'Form reading')}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}
