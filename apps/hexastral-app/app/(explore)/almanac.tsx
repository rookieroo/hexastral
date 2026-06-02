/**
 * Pro AI Daily Almanac Screen
 *
 * Pro users: Full AI almanac — 5-domain personal reading + bond daily insights.
 * Free users: Math-based almanac (same as home tab) + blurred Pro section + upgrade CTA.
 *
 * Route: /almanac  (push modal)
 */

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ChevronLeft, Lock, Sparkles } from 'lucide-react-native'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AlmanacCard } from '@/components/reading/AlmanacCard'
import { getIsPro, useAuth } from '@/lib/auth'
import { type TranslationKeys, useI18n } from '@/lib/i18n'
import { useIosPalette, useTheme } from '@/lib/theme'

interface AlmanacPersonal {
  tagline: string
  career: string
  wealth: string
  love: string
  health: string
  timeHint?: string
  luckyColor?: string
  caution?: string
}

interface AlmanacBondInsight {
  bondId: string
  targetName: string
  relationshipLabel: string
  insight: string
  tip?: string
}

interface AlmanacPayload {
  date: string
  personal: AlmanacPersonal
  bonds: AlmanacBondInsight[]
}

// ── Pro almanac data fetcher ──────────────────────────────────
// TODO: re-implement against svc-astro after svc-fortune removal.
// The Pro almanac (5-domain personal + bond insights) used to be served by
// svc-fortune via /api/fortune/almanac. With svc-fortune deleted, this screen
// renders the locked / coming-soon state until the feature is rebuilt.

function useProAlmanacQuery(_userId: string | null | undefined) {
  return useQuery<AlmanacPayload>({
    queryKey: ['proAlmanac', 'disabled'],
    queryFn: () => Promise.reject(new Error('Pro almanac not yet available')),
    enabled: false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
}

// ── Domain section ────────────────────────────────────────────

interface DomainRowProps {
  label: string
  text: string
  color: string
}

function DomainRow({ label, text, color }: DomainRowProps) {
  return (
    <View style={{ gap: 4, paddingVertical: 10 }}>
      <Text
        style={{
          fontSize: 10,
          fontWeight: '600',
          color,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 14, color, lineHeight: 22 }}>{text}</Text>
    </View>
  )
}

// ── Bond insight card ─────────────────────────────────────────

interface BondInsightCardProps {
  insight: AlmanacBondInsight
  ios: any
  t: (key: TranslationKeys, params?: Record<string, string | number>) => string
}

function BondInsightCard({ insight, ios, t }: BondInsightCardProps) {
  return (
    <View
      style={{
        borderWidth: 0.5,
        borderColor: ios.separator,
        backgroundColor: ios.card,
        padding: 14,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: ios.text, flex: 1 }}>
          {insight.targetName}
        </Text>
        <Text style={{ fontSize: 11, color: ios.secondary }}>{insight.relationshipLabel}</Text>
      </View>
      {!!insight.insight && (
        <Text style={{ fontSize: 13, color: ios.text, lineHeight: 20 }}>{insight.insight}</Text>
      )}
      {!!insight.tip && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
          <Text style={{ fontSize: 10, fontWeight: '600', color: ios.accent, letterSpacing: 1 }}>
            {t('almanac_pro_bond_tip').toUpperCase()}
          </Text>
          <Text style={{ fontSize: 12, color: ios.secondary, flex: 1 }}>{insight.tip}</Text>
        </View>
      )}
    </View>
  )
}

// ── Main Screen ───────────────────────────────────────────────

export default function AlmanacScreen() {
  const { colors, isDark } = useTheme()
  const { t } = useI18n()
  const router = useRouter()
  const { userId, user } = useAuth()

  const isPro = getIsPro(user)

  const ios = useIosPalette()

  // Base almanac (math, always available) — legacy daily fortune removed; will rewire to /api/almanac
  const baseAlmanac: null = null

  // Pro almanac (AI, Pro only)
  const proAlmanacQuery = useProAlmanacQuery(isPro ? userId : null)
  const proAlmanac = proAlmanacQuery.data ?? null
  const proLoading = proAlmanacQuery.isLoading
  const proError = proAlmanacQuery.error

  const today = new Date().toISOString().slice(0, 10)

  const DOMAIN_ROWS = proAlmanac
    ? [
        { key: 'career', label: t('almanac_pro_career'), text: proAlmanac.personal.career },
        { key: 'wealth', label: t('almanac_pro_wealth'), text: proAlmanac.personal.wealth },
        { key: 'love', label: t('almanac_pro_love'), text: proAlmanac.personal.love },
        { key: 'health', label: t('almanac_pro_health'), text: proAlmanac.personal.health },
      ]
    : []

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: ios.separator,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 4 }}>
          <ChevronLeft size={22} color={ios.text} />
        </Pressable>
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 16,
            fontWeight: '600',
            color: ios.text,
            letterSpacing: 0.3,
          }}
        >
          {t('almanac_pro_title')}
        </Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Date */}
        <Text style={{ fontSize: 12, color: ios.secondary, letterSpacing: 2 }}>{today}</Text>

        {/* Base almanac (math, always shown) */}
        {baseAlmanac && <AlmanacCard almanac={baseAlmanac} />}

        {/* ── Pro section ── */}
        {isPro ? (
          <>
            {proLoading && (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <ActivityIndicator color={ios.accent} />
                <Text style={{ fontSize: 12, color: ios.secondary, marginTop: 10 }}>
                  AI 解读中…
                </Text>
              </View>
            )}

            {!proLoading && proError && (
              <View
                style={{
                  borderWidth: 0.5,
                  borderColor: ios.separator,
                  backgroundColor: ios.card,
                  padding: 16,
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Text style={{ fontSize: 13, color: ios.secondary }}>AI 日历生成失败，请重试</Text>
              </View>
            )}

            {proAlmanac && (
              <>
                {/* Tagline */}
                <View
                  style={{
                    backgroundColor: ios.card,
                    borderWidth: 0.5,
                    borderColor: ios.accent,
                    padding: 16,
                    gap: 6,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} color={ios.accent} />
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '600',
                        color: ios.accent,
                        letterSpacing: 2,
                        textTransform: 'uppercase',
                      }}
                    >
                      {t('almanac_pro_tagline_label')}
                    </Text>
                  </View>
                  <Text
                    style={{ fontSize: 17, fontWeight: '600', color: ios.text, lineHeight: 26 }}
                  >
                    {proAlmanac.personal.tagline}
                  </Text>
                </View>

                {/* Domain rows */}
                <View
                  style={{
                    backgroundColor: ios.card,
                    borderWidth: 0.5,
                    borderColor: ios.separator,
                    padding: 16,
                  }}
                >
                  {DOMAIN_ROWS.map((row, i) => (
                    <View key={row.key}>
                      <DomainRow label={row.label} text={row.text} color={ios.text} />
                      {i < DOMAIN_ROWS.length - 1 && (
                        <View
                          style={{ height: 0.5, backgroundColor: ios.separator, marginVertical: 2 }}
                        />
                      )}
                    </View>
                  ))}
                </View>

                {/* Hints row */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {!!proAlmanac.personal.timeHint && (
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: ios.card,
                        borderWidth: 0.5,
                        borderColor: ios.separator,
                        padding: 12,
                        gap: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          color: ios.secondary,
                          letterSpacing: 1.5,
                          textTransform: 'uppercase',
                        }}
                      >
                        {t('almanac_pro_time_hint')}
                      </Text>
                      <Text style={{ fontSize: 12, color: ios.text }}>
                        {proAlmanac.personal.timeHint}
                      </Text>
                    </View>
                  )}
                  {!!proAlmanac.personal.luckyColor && (
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: ios.card,
                        borderWidth: 0.5,
                        borderColor: ios.separator,
                        padding: 12,
                        gap: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          color: ios.secondary,
                          letterSpacing: 1.5,
                          textTransform: 'uppercase',
                        }}
                      >
                        {t('almanac_pro_lucky_color')}
                      </Text>
                      <Text style={{ fontSize: 12, color: ios.text }}>
                        {proAlmanac.personal.luckyColor}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Caution */}
                {!!proAlmanac.personal.caution && (
                  <View
                    style={{
                      backgroundColor: ios.highlightBrown,
                      borderWidth: 0.5,
                      borderColor: isDark ? '#7C2D12' : '#FED7AA',
                      padding: 12,
                      gap: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        color: isDark ? '#FB923C' : '#C2410C',
                        letterSpacing: 1.5,
                        fontWeight: '600',
                        textTransform: 'uppercase',
                      }}
                    >
                      {t('almanac_pro_caution')}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: isDark ? '#FB923C' : '#9A3412',
                        lineHeight: 20,
                      }}
                    >
                      {proAlmanac.personal.caution}
                    </Text>
                  </View>
                )}

                {/* Bond insights */}
                {proAlmanac.bonds.length > 0 && (
                  <View style={{ gap: 10 }}>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '600',
                        color: ios.secondary,
                        letterSpacing: 2,
                        textTransform: 'uppercase',
                      }}
                    >
                      {t('almanac_pro_bonds_title')}
                    </Text>
                    {proAlmanac.bonds
                      .filter((b) => b.insight)
                      .map((bond) => (
                        <BondInsightCard key={bond.bondId} insight={bond} ios={ios} t={t} />
                      ))}
                  </View>
                )}
              </>
            )}
          </>
        ) : (
          /* Free user: locked Pro section */
          <View
            style={{
              borderWidth: 1,
              borderColor: ios.separator,
              backgroundColor: ios.card,
              padding: 24,
              alignItems: 'center',
              gap: 14,
            }}
          >
            <Lock size={28} color={ios.accent} />
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Text
                style={{ fontSize: 16, fontWeight: '600', color: ios.text, textAlign: 'center' }}
              >
                {t('almanac_pro_locked_title')}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: ios.secondary,
                  textAlign: 'center',
                  lineHeight: 20,
                }}
              >
                {t('almanac_pro_locked_desc')}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/paywall')}
              style={{
                backgroundColor: ios.tint,
                paddingHorizontal: 28,
                paddingVertical: 12,
                borderRadius: 0,
              }}
            >
              <Text
                style={{ fontSize: 14, fontWeight: '600', color: ios.tintFg, letterSpacing: 0.5 }}
              >
                {t('almanac_pro_unlock_cta')}
              </Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}
