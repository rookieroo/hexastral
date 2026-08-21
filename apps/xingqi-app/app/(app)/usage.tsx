/**
 * Usage — period refresh cadence + Pro deep/shallow meters (not on the home chrome).
 *
 * - Date / Nd: last reading age and recommended ~25-day refresh (product cadence).
 * - Deep: UTC-month meter. Shallow Face brief: UTC calendar day.
 */

import { useTheme } from '@zhop/core-ui'
import { fetchReadings, type PortfolioReadingItem } from '@zhop/portfolio-client'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SettingsCard, SettingsSection } from '@/components/settings/SettingsSection'
import { fetchPhotoQuota } from '@/lib/api'
import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { resolveLocale } from '@/lib/i18n'
import { pickUi } from '@/lib/locale-zh'

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
  const s = (hans: string, hant: string, en: string, ja?: string) =>
    pickUi(locale, hans, hant, en, ja)
  const entitlements = useEntitlements()
  const isPro =
    hasEntitlement(entitlements, 'faceoracle_pro') || hasEntitlement(entitlements, 'universe_pro')

  const [latest, setLatest] = useState<PortfolioReadingItem | null>(null)
  const [quota, setQuota] = useState<{
    deep: { used: number; limit: number; remaining: number }
    shallow: { used: number; limit: number; remaining: number; day?: string }
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
      ? s('尚无解读', '尚無解讀', 'No reading yet', '形気リーディングはまだありません')
      : ageDays >= 25
        ? s(
            `已过 ${ageDays} 天 · 建议更新本期照片`,
            `已過 ${ageDays} 天 · 建議更新本期照片`,
            `${ageDays}d since last · refresh recommended`,
            `${ageDays}日経過 · 今期の更新をおすすめ`
          )
        : s(
            `距建议更新还有 ${Math.max(0, 25 - ageDays)} 天`,
            `距建議更新還有 ${Math.max(0, 25 - ageDays)} 天`,
            `${Math.max(0, 25 - ageDays)}d until recommended refresh`,
            `更新の目安まであと ${Math.max(0, 25 - ageDays)} 日`
          )

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
            <Text style={{ color: colors.accent, fontSize: 16 }}>
              {s('返回', '返回', 'Back', '戻る')}
            </Text>
          </Pressable>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '600', flex: 1 }}>
            {s('用量与周期', '用量與週期', 'Usage & cadence', '用量と周期')}
          </Text>
        </View>

        <Text style={{ color: colors.dim, fontSize: 13, lineHeight: 19 }}>
          {s(
            '「日期 / Nd」是最近一次形气解读距今的天数，以及约 25 天更新建议——不是额度重置日。深度解读按 UTC 自然月重置；浅读按 UTC 自然日。',
            '「日期 / Nd」是最近一次形氣解讀距今的天數，以及約 25 天更新建議——不是額度重置日。深度解讀按 UTC 自然月重置；淺讀按 UTC 自然日。',
            'The date / Nd line is days since your last form-qi reading and a ~25-day refresh reminder — not when quotas reset. Deep readings reset on the UTC month; Face briefs on the UTC day.',
            '「日付 / Nd」は直近の形気リーディングからの日数と、約25日ごとの更新の目安です。枠のリセット日ではありません。深度は UTC 暦月、浅読は UTC 暦日でリセットされます。'
          )}
        </Text>

        <SettingsSection title={s('解读周期', '解讀週期', 'READING CADENCE', '解読サイクル')}>
          <SettingsCard>
            <MeterRow
              label={s('最近解读', '最近解讀', 'Last reading', '直近の解読')}
              value={lastDate}
              colors={colors}
            />
            <MeterRow
              label={s('更新建议', '更新建議', 'Refresh', '更新の目安')}
              value={ageDays != null ? `${ageDays}d` : '—'}
              hint={refreshLine}
              colors={colors}
            />
          </SettingsCard>
        </SettingsSection>

        {isPro ? (
          <SettingsSection
            title={s('Pro 额度', 'Pro 額度', 'PRO QUOTA', 'Pro 枠')}
          >
            <SettingsCard>
              <MeterRow
                label={s('深度解读（本月 UTC）', '深度解讀（本月 UTC）', 'Deep readings (UTC month)', '深度解読（UTC月）')}
                value={quota ? `${quota.deep.used}/${quota.deep.limit}` : '—'}
                hint={s(
                  '首封与「下次深度」各扣 1 次。用尽可买单次深读。',
                  '首封與「下次深度」各扣 1 次。用盡可買單次深讀。',
                  'First seal and Deep-next each use 1. When exhausted, buy a one-shot deep reading.',
                  '初回と「次回深度」は各1回。枠切れは単発の深度解読を購入。'
                )}
                colors={colors}
              />
              <MeterRow
                label={s('Face 浅读（今日 UTC）', 'Face 淺讀（今日 UTC）', 'Face brief (UTC day)', 'Face 浅読（UTC日）')}
                value={quota ? `${quota.shallow.used}/${quota.shallow.limit}` : '—'}
                hint={s(
                  '首封之后的日常期更。每天 1 次；至少需要新的面部照片。',
                  '首封之後的日常期更。每天 1 次；至少需要新的面部照片。',
                  'Period briefs after the first seal. 1 per day; needs a new face photo.',
                  '初回以降の短簡。1日1回。新しい顔写真が必要です。'
                )}
                colors={colors}
              />
            </SettingsCard>
          </SettingsSection>
        ) : (
          <Text style={{ color: colors.dim, fontSize: 13, lineHeight: 19 }}>
            {s(
              '订阅 Pro 后可查看深度与浅读额度。',
              '訂閱 Pro 後可查看深度與淺讀額度。',
              'Subscribe to Pro to see deep and Face-brief meters.',
              'Pro に加入すると、深度・浅読の枠を確認できます。'
            )}
          </Text>
        )}

        {__DEV__ ? (
          <Text style={{ color: colors.dim, fontSize: 11, lineHeight: 16 }}>
            DEV: meters are bypassed when the API has ALLOW_DEV_PRO=1 (no charge on enqueue).
          </Text>
        ) : null}
      </ScrollView>
    </View>
  )
}
