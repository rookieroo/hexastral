/**
 * Usage — period refresh cadence + Pro monthly meters (not on the home chrome).
 *
 * - Date / Nd: last reading age and recommended ~25-day refresh (product cadence).
 * - Photos / Regen: UTC-month meters (separate from the 25-day reminder).
 */

import { useTheme } from '@zhop/core-ui'
import {
  fetchReadings,
  type PortfolioReadingItem,
} from '@zhop/portfolio-client'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  SettingsCard,
  SettingsSection,
} from '@/components/settings/SettingsSection'
import { fetchPhotoQuota } from '@/lib/api'
import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { resolveLocale } from '@/lib/i18n'

function daysSince(iso: string | undefined): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000))
}

function MeterRow({
  label,
  value,
  hint,
  colors,
}: {
  label: string
  value: string
  hint?: string
  colors: { text: string; dim: string; separator: string }
}) {
  return (
    <View
      style={{
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.separator,
        gap: 4,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <Text style={{ color: colors.text, fontSize: 15, flex: 1 }}>{label}</Text>
        <Text style={{ color: colors.text, fontSize: 15 }}>{value}</Text>
      </View>
      {hint ? (
        <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 17 }}>{hint}</Text>
      ) : null}
    </View>
  )
}

export default function UsageScreen() {
  const { colors, spacing } = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const zh = locale.startsWith('zh')
  const entitlements = useEntitlements()
  const isPro =
    hasEntitlement(entitlements, 'faceoracle_pro') || hasEntitlement(entitlements, 'universe_pro')

  const [latest, setLatest] = useState<PortfolioReadingItem | null>(null)
  const [quota, setQuota] = useState<{
    photos: { used: number; limit: number; remaining: number }
    reports: { used: number; limit: number; remaining: number }
  } | null>(null)

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        try {
          const res = await fetchReadings(PORTFOLIO_TARGET_APP)
          setLatest(res.readings[0] ?? null)
        } catch {
          setLatest(null)
        }
        if (isPro) {
          try {
            setQuota(await fetchPhotoQuota())
          } catch {
            setQuota(null)
          }
        } else {
          setQuota(null)
        }
      })()
    }, [isPro])
  )

  const ageDays = daysSince(latest?.createdAt)
  const lastDate = latest?.createdAt?.slice(0, 10) ?? '—'
  const refreshLine =
    ageDays == null
      ? zh
        ? '尚无解读'
        : 'No reading yet'
      : ageDays >= 25
        ? zh
          ? `已过 ${ageDays} 天 · 建议更新本期照片`
          : `${ageDays}d since last · refresh recommended`
        : zh
          ? `距建议更新还有 ${Math.max(0, 25 - ageDays)} 天`
          : `${Math.max(0, 25 - ageDays)}d until recommended refresh`

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          gap: spacing.xl,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={{ color: colors.accent, fontSize: 16 }}>{zh ? '返回' : 'Back'}</Text>
          </Pressable>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '600', flex: 1 }}>
            {zh ? '用量与周期' : 'Usage'}
          </Text>
        </View>

        <Text style={{ color: colors.dim, fontSize: 13, lineHeight: 19 }}>
          {zh
            ? '「日期 / Nd」是最近一次形气解读距今的天数，以及约 25 天更新建议——不是额度重置日。照片与重生成额度按 UTC 自然月重置。'
            : 'The date / Nd line is days since your last form reading and a ~25-day refresh reminder — not when quotas reset. Photo and regen meters reset on the UTC calendar month.'}
        </Text>

        <SettingsSection title={zh ? '解读周期' : 'READING CADENCE'}>
          <SettingsCard>
            <MeterRow
              label={zh ? '最近解读' : 'Last reading'}
              value={lastDate}
              colors={colors}
            />
            <MeterRow
              label={zh ? '更新建议' : 'Refresh'}
              value={ageDays != null ? `${ageDays}d` : '—'}
              hint={refreshLine}
              colors={colors}
            />
          </SettingsCard>
        </SettingsSection>

        {isPro ? (
          <SettingsSection title={zh ? '本月额度 (UTC)' : 'MONTHLY QUOTA (UTC)'}>
            <SettingsCard>
              <MeterRow
                label={zh ? '照片额度' : 'Photo slots'}
                value={
                  quota
                    ? `${quota.photos.used}/${quota.photos.limit}`
                    : '—'
                }
                hint={
                  zh
                    ? '完整解读扣 3 格（左掌+右掌+面）。UTC 月初重置。'
                    : 'Full reading uses 3 slots (L+R+face). Resets at UTC month start.'
                }
                colors={colors}
              />
              <MeterRow
                label={zh ? '报告重生成' : 'Report regenerations'}
                value={
                  quota
                    ? `${quota.reports.used}/${quota.reports.limit}`
                    : '—'
                }
                hint={
                  zh
                    ? '同照片换语言/重写正文扣 1 次。UTC 月初重置。'
                    : 'Same photos, new locale/body uses 1. Resets at UTC month start.'
                }
                colors={colors}
              />
            </SettingsCard>
          </SettingsSection>
        ) : (
          <Text style={{ color: colors.dim, fontSize: 13, lineHeight: 19 }}>
            {zh
              ? '订阅 Pro 后可查看本月照片与重生成额度。'
              : 'Subscribe to Pro to see monthly photo and regen meters.'}
          </Text>
        )}

        {__DEV__ ? (
          <Text style={{ color: colors.dim, fontSize: 11, lineHeight: 16 }}>
            DEV: monthly meters are bypassed when the API has ALLOW_DEV_PRO=1 (no charge on
            enqueue).
          </Text>
        ) : null}
      </ScrollView>
    </View>
  )
}
