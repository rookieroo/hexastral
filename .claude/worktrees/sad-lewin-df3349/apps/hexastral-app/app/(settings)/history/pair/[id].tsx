/**
 * Fate History → Pair (合盘) reading snapshot.
 *
 * Renders the full AI interpretation that hehun generates: hero, archetype card,
 * 4-dimension radar + per-dimension rows, and one card per long-form section
 * (overview, day-master resonance, year/month/day branch, highlights, warnings,
 * advice, summary). Wraps `usePairReadingQuery` (which already returns the rich
 * `interpretation` and `compatibility` blobs from /api/pair/:id) and reuses the
 * same `InterpretationSections` block as the main bond-detail screen.
 */

import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BondRadarChart } from '@zhop/scenario-bonds'
import { InterpretationSections } from '@/components/bonds/InterpretationSections'
import { useAuth } from '@/lib/auth'
import type { BondDimension } from '@/lib/domain/bonds'
import {
  type PairCompatibilityDimension,
  usePairReadingQuery,
} from '@/lib/hooks/usePairReadingQuery'
import { historyHref } from '@/lib/historyPrefs'
import { useI18n } from '@/lib/i18n'
import { useIosPalette, useTheme } from '@/lib/theme'
import type { ArchetypeCategory } from '@/lib/ui-mapping'
import { ARCHETYPE_CATEGORY_I18N_KEY, archetypeCategoryColor } from '@/lib/ui-mapping'

type DimKey = BondDimension['key']
const DIMENSION_KEYS: DimKey[] = ['long_term', 'attraction', 'communication', 'emotional']

function toBondDimensions(raw: PairCompatibilityDimension[] | undefined): BondDimension[] | null {
  if (!raw || raw.length === 0) return null
  return raw.slice(0, 4).map((dim, i) => {
    const fallbackKey = DIMENSION_KEYS[i] ?? 'long_term'
    const key = (DIMENSION_KEYS as string[]).includes(dim.key ?? '')
      ? (dim.key as DimKey)
      : fallbackKey
    return {
      key,
      name: dim.name,
      score: typeof dim.score === 'number' ? dim.score : null,
      maxScore: typeof dim.maxScore === 'number' ? dim.maxScore : null,
      note: dim.note ?? null,
      isLocked: false,
    }
  })
}

export default function PairReadingHistoryDetailScreen() {
  const { id: pairId } = useLocalSearchParams<{ id: string }>()
  const ios = useIosPalette()
  const { isDark } = useTheme()
  const { t } = useI18n()
  const router = useRouter()
  const { userId } = useAuth()

  const { data: row, isLoading, error } = usePairReadingQuery(userId, pairId)

  const titleLine =
    row != null
      ? [row.personA?.name, row.personB?.name].filter(Boolean).join(' · ') ||
        t('history_pair_untitled')
      : ''

  const dimensions = row ? toBondDimensions(row.compatibility?.dimensions) : null
  const allDimensionsScored =
    dimensions != null && dimensions.every((d) => d.score != null && d.maxScore != null)

  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace(historyHref('readings') as never)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
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
        <Pressable onPress={goBack} hitSlop={12} style={{ paddingRight: 12 }}>
          <ArrowLeft size={22} color={ios.text} strokeWidth={1.5} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: ios.text }}>
          {t('history_pair_detail_title')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={{ paddingTop: 48, alignItems: 'center' }}>
            <ActivityIndicator color={ios.text} />
            <Text style={{ marginTop: 12, fontSize: 13, color: ios.secondary }}>
              {t('signal_loading')}
            </Text>
          </View>
        ) : error || !row ? (
          <View style={{ paddingHorizontal: 24, paddingTop: 48 }}>
            <Text style={{ fontSize: 14, color: ios.secondary, textAlign: 'center' }}>
              {t('signal_error')}
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
            {/* ── Hero ── */}
            <View
              style={{
                paddingVertical: 32,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDark ? '#18181B' : '#F4F4F5',
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: '500',
                  color: ios.text,
                  letterSpacing: 0.5,
                }}
              >
                {titleLine}
              </Text>
              {row.score != null ? (
                <View style={{ marginTop: 16, alignItems: 'center', gap: 4 }}>
                  <Text
                    style={{
                      fontSize: 40,
                      fontWeight: '100',
                      color: ios.text,
                      letterSpacing: -2,
                    }}
                  >
                    {row.score}
                  </Text>
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: '300',
                      color: ios.secondary,
                      letterSpacing: 3,
                      textTransform: 'uppercase',
                    }}
                  >
                    {row.grade ?? ''} · / 100
                  </Text>
                </View>
              ) : null}
            </View>

            {/* ── Archetype card ── */}
            {row.archetypeName ? (
              <View
                style={{
                  borderWidth: 0.5,
                  borderColor: ios.separator,
                  padding: 20,
                  marginBottom: 24,
                  gap: 8,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '300',
                      color: ios.secondary,
                      letterSpacing: 4,
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('bond_detail_archetype_label')}
                  </Text>
                  {row.archetypeCategory ? (
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderWidth: 0.5,
                        borderColor: archetypeCategoryColor(
                          row.archetypeCategory as ArchetypeCategory,
                          isDark
                        ),
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 9,
                          fontWeight: '500',
                          letterSpacing: 2,
                          textTransform: 'uppercase',
                          color: archetypeCategoryColor(
                            row.archetypeCategory as ArchetypeCategory,
                            isDark
                          ),
                        }}
                      >
                        {t(
                          ARCHETYPE_CATEGORY_I18N_KEY[
                            row.archetypeCategory as ArchetypeCategory
                          ] as never
                        )}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '300',
                    color: ios.text,
                    letterSpacing: 0.5,
                    lineHeight: 28,
                  }}
                >
                  {row.archetypeName}
                </Text>
                {row.archetypeTagline ? (
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '300',
                      fontStyle: 'italic',
                      color: ios.secondary,
                      lineHeight: 18,
                    }}
                  >
                    {row.archetypeTagline}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {/* ── Dimensions ── */}
            {dimensions ? (
              <View
                style={{
                  borderWidth: 0.5,
                  borderColor: ios.separator,
                  padding: 20,
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '300',
                    color: ios.secondary,
                    letterSpacing: 4,
                    textTransform: 'uppercase',
                  }}
                >
                  {t('bond_detail_dimensions')}
                </Text>
                {allDimensionsScored ? (
                  <BondRadarChart
                    dimensions={dimensions}
                    labels={{
                      long_term: t('bond_dim_long_term'),
                      attraction: t('bond_dim_attraction'),
                      communication: t('bond_dim_communication'),
                      emotional: t('bond_dim_emotional'),
                    }}
                    palette={{ accent: ios.accent, secondary: ios.secondary, separator: ios.separator }}
                  />
                ) : null}
                {dimensions.map((dim) => (
                  <DimensionRow key={dim.key} dim={dim} ios={ios} t={t} />
                ))}
              </View>
            ) : null}

            {/* ── Long-form interpretation ── */}
            <InterpretationSections interpretation={row.interpretation} ios={ios} canSeeAll />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function DimensionRow({
  dim,
  ios,
  t,
}: {
  dim: BondDimension
  ios: ReturnType<typeof useIosPalette>
  t: ReturnType<typeof useI18n>['t']
}) {
  const progress =
    dim.score != null && dim.maxScore != null && dim.maxScore > 0
      ? (dim.score / dim.maxScore) * 100
      : 0

  return (
    <View style={{ gap: 6 }}>
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: '300',
            color: ios.secondary,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          {t(`shop_dim_${dim.key}` as never)}
        </Text>
        {dim.score != null && dim.maxScore != null ? (
          <Text style={{ fontSize: 11, fontWeight: '300', color: ios.secondary }}>
            {dim.score}/{dim.maxScore}
          </Text>
        ) : null}
      </View>
      <View
        style={{
          height: 3,
          backgroundColor: ios.separator,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: 3,
            backgroundColor: ios.accent,
            width: `${Math.min(progress, 100)}%`,
          }}
        />
      </View>
      {dim.note ? (
        <Text
          style={{
            fontSize: 11,
            fontWeight: '300',
            color: ios.secondary,
            lineHeight: 16,
            marginTop: 2,
          }}
        >
          {dim.note}
        </Text>
      ) : null}
    </View>
  )
}
