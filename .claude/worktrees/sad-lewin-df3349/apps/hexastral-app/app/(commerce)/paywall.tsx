/**
 * Paywall — 解锁 Hexastral Pro
 *
 * 产品结构：
 * - 主推  年订阅 $69/yr   → Pro 无限解读 + 每月配额 (hexastral_pro_annual)
 *
 * 用法：router.push('/paywall')
 * 关闭：router.back() / 原生下滑手势 / 暂不需要
 */

import { useRouter } from 'expo-router'
import { Check, Minus } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BRAND_PHASE, HexastralPlanetLogo } from '@/components/branding/HexastralPlanetLogo'
import { getAnnualPrice, purchaseAnnual, restorePurchases } from '@/lib/domain/subscription'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

export default function PaywallScreen() {
  const { colors, isDark } = useTheme()
  const { t } = useI18n()
  const router = useRouter()

  const ios = {
    bg: isDark ? '#09090B' : '#FAFAFA',
    card: isDark ? '#18181B' : '#FFFFFF',
    separator: isDark ? '#27272A' : '#E4E4E7',
    text: isDark ? '#FAFAFA' : '#09090B',
    secondary: isDark ? '#A1A1AA' : '#71717A',
    tint: colors.primary,
    tintFg: isDark ? '#18181B' : '#FFFFFF',
    accent: colors.accent,
    dim: isDark ? '#52525B' : '#A1A1AA',
  }

  const [annualPrice, setAnnualPrice] = useState<string | null>(null)
  const [loadingPrice, setLoadingPrice] = useState(true)
  const [buyingAnnual, setBuyingAnnual] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAnnualPrice().then((price) => {
      setAnnualPrice(price)
      setLoadingPrice(false)
    })
  }, [])

  const handleAnnual = async () => {
    setError(null)
    setBuyingAnnual(true)
    const ok = await purchaseAnnual()
    setBuyingAnnual(false)
    if (ok) router.back()
  }

  const handleRestore = async () => {
    setError(null)
    setRestoring(true)
    const ok = await restorePurchases()
    setRestoring(false)
    if (ok) router.back()
    else setError(t('common_retry_later'))
  }

  const BENEFITS = [t('paywall_benefit_1'), t('paywall_benefit_2'), t('paywall_benefit_3')]

  type VsValue = string | true | null
  const VS_ROWS: { feature: string; free: VsValue; pro: VsValue }[] = [
    { feature: t('paywall_vs_almanac'), free: t('paywall_vs_basic'), pro: t('paywall_vs_ai_deep') },
    {
      feature: t('paywall_vs_synastry'),
      free: t('paywall_vs_basic'),
      pro: t('paywall_vs_ai_deep'),
    },
    { feature: t('paywall_vs_divination'), free: t('paywall_vs_divination_free'), pro: true },
    {
      feature: t('paywall_vs_chat'),
      free: t('paywall_vs_chat_free'),
      pro: t('paywall_vs_chat_pro'),
    },
    { feature: t('paywall_vs_bonds'), free: null, pro: true },
    { feature: t('paywall_vs_push'), free: true, pro: t('paywall_vs_ai_personal') },
  ]

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ── 品牌标题 ── */}
        <View style={s.header}>
          <HexastralPlanetLogo size={52} phase={BRAND_PHASE} />
          <Text style={[s.title, { color: ios.text }]}>{t('paywall_title')}</Text>
          <Text style={[s.subtitle, { color: ios.secondary }]}>{t('paywall_subtitle')}</Text>
        </View>

        {/* ── 权益列表 ── */}
        <View style={s.benefitsWrap}>
          {BENEFITS.map((benefit) => (
            <View key={benefit} style={s.benefitRow}>
              <View
                style={[s.checkCircle, { backgroundColor: ios.card, borderColor: ios.separator }]}
              >
                <Check size={11} color={ios.accent} strokeWidth={2.5} />
              </View>
              <Text style={[s.benefitText, { color: ios.text }]}>{benefit}</Text>
            </View>
          ))}
        </View>

        {/* ── Free vs Pro 对比表 ── */}
        <View
          style={[
            s.table,
            { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: ios.separator },
          ]}
        >
          {/* Header */}
          <View style={[s.tableRow, { borderBottomWidth: 1, borderBottomColor: ios.separator }]}>
            <View style={s.colFeature} />
            <View style={s.colVal}>
              <Text style={[s.tableHeaderFree, { color: ios.secondary }]}>
                {t('paywall_vs_free')}
              </Text>
            </View>
            <View style={s.colVal}>
              <Text style={[s.tableHeaderPro, { color: ios.accent }]}>{t('paywall_vs_pro')}</Text>
            </View>
          </View>
          {/* Rows */}
          {VS_ROWS.map((row, i) => (
            <View
              key={row.feature}
              style={[
                s.tableRow,
                i < VS_ROWS.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: ios.separator,
                },
              ]}
            >
              <View style={s.colFeature}>
                <Text style={[s.featureText, { color: ios.text }]}>{row.feature}</Text>
              </View>
              <View style={s.colVal}>
                <VsCell value={row.free} color={ios.secondary} />
              </View>
              <View style={s.colVal}>
                <VsCell value={row.pro} color={ios.accent} accent />
              </View>
            </View>
          ))}
        </View>

        {/* ── 价格 ── */}
        <View style={s.priceBlock}>
          {loadingPrice ? (
            <ActivityIndicator size='small' color={ios.secondary} style={{ marginVertical: 10 }} />
          ) : (
            <Text style={[s.priceText, { color: ios.accent }]}>{annualPrice ?? '$69.99'}</Text>
          )}
          <Text style={[s.pricePer, { color: ios.secondary }]}>{t('paywall_annual_per')}</Text>
          <View style={[s.badge, { backgroundColor: ios.accent }]}>
            <Text style={[s.badgeText, { color: ios.bg }]}>{t('paywall_annual_badge')}</Text>
          </View>
        </View>

        {/* ── 主购买按钮 ── */}
        <TouchableOpacity
          onPress={handleAnnual}
          disabled={buyingAnnual}
          activeOpacity={0.75}
          style={[s.ctaBtn, { backgroundColor: ios.tint, opacity: buyingAnnual ? 0.5 : 1 }]}
        >
          {buyingAnnual ? (
            <ActivityIndicator size='small' color={ios.tintFg} />
          ) : (
            <Text style={[s.ctaBtnText, { color: ios.tintFg }]}>{t('paywall_annual_cta')}</Text>
          )}
        </TouchableOpacity>

        {/* ── 错误提示 ── */}
        {error ? <Text style={s.errorText}>{error}</Text> : null}

        {/* ── 恢复购买 & 暂不需要 ── */}
        <View style={s.secondaryRow}>
          <Pressable onPress={handleRestore} disabled={restoring} hitSlop={12}>
            {restoring ? (
              <ActivityIndicator size='small' color={ios.secondary} />
            ) : (
              <Text style={[s.secondaryLink, { color: ios.secondary }]}>
                {t('paywall_restore')}
              </Text>
            )}
          </Pressable>
          <Text style={[s.divider, { color: ios.dim }]}>|</Text>
          <Pressable
            onPress={() => router.back()}
            disabled={buyingAnnual || restoring}
            hitSlop={12}
          >
            <Text style={[s.secondaryLink, { color: ios.secondary }]}>{t('paywall_later')}</Text>
          </Pressable>
        </View>

        {/* ── App Store 法律要求 ── */}
        <Text style={[s.legal, { color: ios.dim }]}>{t('paywall_legal_disclaimer')}</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function VsCell({
  value,
  color,
  accent = false,
}: {
  value: string | true | null
  color: string
  accent?: boolean
}) {
  if (value === null) return <Minus size={14} color={color} />
  if (value === true) return <Check size={14} color={color} strokeWidth={2} />
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: accent ? '600' : '400',
        color,
        textAlign: 'center',
      }}
    >
      {value}
    </Text>
  )
}

const s = StyleSheet.create({
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  // Header
  header: {
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 16,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Benefits
  benefitsWrap: {
    gap: 12,
    marginBottom: 32,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkCircle: {
    marginTop: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  benefitText: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  // Table
  table: {
    marginBottom: 32,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 13,
  },
  colFeature: {
    flex: 1.2,
    justifyContent: 'center',
  },
  colVal: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableHeaderFree: {
    fontSize: 12,
    fontWeight: '500',
  },
  tableHeaderPro: {
    fontSize: 12,
    fontWeight: '700',
  },
  featureText: {
    fontSize: 13,
  },
  // Price
  priceBlock: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 6,
  },
  priceText: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pricePer: {
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  // CTA button — mirrors Share Public Chart button (TouchableOpacity, width 100%)
  ctaBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 0,
    marginBottom: 12,
  },
  ctaBtnText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  // Secondary row
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginBottom: 24,
  },
  secondaryLink: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  divider: {
    fontSize: 12,
  },
  // Legal
  legal: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: 4,
  },
})
