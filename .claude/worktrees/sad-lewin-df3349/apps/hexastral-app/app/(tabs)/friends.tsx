/**
 * 缘 Bonds Tab — Card list of relationship bonds
 *
 * Redesigned from constellation map to a cleaner card list.
 * Active bonds shown as cards with avatar, name, archetype, and score.
 * Pending bonds in a separate dimmed section below.
 */

import { useRouter } from 'expo-router'
import { Plus, Zap } from 'lucide-react-native'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useRef, useState } from 'react'
import {
  ActionSheetIOS,
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type ViewShot from 'react-native-view-shot'
import { BondCard } from '@/components/bonds/BondCard'
import { BondRadarChart } from '@zhop/scenario-bonds'
import { BondSharePoster } from '@/components/bonds/BondSharePoster'
import { getIsPro, useAuth } from '@/lib/auth'
import type { BondData } from '@/lib/domain/bonds'
import { deleteBond, shareBondResult } from '@/lib/domain/bonds'
import { shareBondAsLink, shareBondAsPoster } from '@/lib/domain/share'
import { useAggregateDimensionsQuery } from '@/lib/hooks/useAggregateDimensionsQuery'
import { useBondsQuery } from '@/lib/hooks/useBondsQuery'
import { usePairHistoryQuery } from '@/lib/hooks/usePairHistoryQuery'
import { useReportManifestQuery } from '@/lib/hooks/useReportManifestQuery'
import { historyHref } from '@/lib/historyPrefs'
import { useI18n } from '@/lib/i18n'
import { useIosPalette, useTheme } from '@/lib/theme'
import { hapticLight } from '@/lib/ux/haptics'

export default function BondsScreen() {
  const { colors, isDark } = useTheme()
  const { t } = useI18n()
  const { userId, user } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: bonds = [], isLoading: loading } = useBondsQuery(userId)
  const pairHistoryQuery = usePairHistoryQuery(userId)
  const manifestQuery = useReportManifestQuery(userId)
  const aggregateDimensions = useAggregateDimensionsQuery(userId, bonds)
  const [_sharing, setSharing] = useState(false)
  const [shareData, setShareData] = useState<{ url: string } | null>(null)
  const [shareBond, setShareBond] = useState<BondData | null>(null)
  const posterRef = useRef<ViewShot>(null)

  const ios = useIosPalette()

  const activeBonds = bonds.filter((b) => b.status === 'active' || b.status === 'pending_invite')
  const scoredBonds = activeBonds
    .filter((b) => b.status === 'active' && b.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const pendingBonds = activeBonds.filter((b) => b.status === 'pending_invite')

  const hasReadingsInHistory = useMemo(() => {
    const pairCount = (pairHistoryQuery.data ?? []).length
    const hasManifestChapters = (manifestQuery.data?.chapters ?? []).some(
      (c) => c.hasCurrent && c.generatedAt
    )
    return pairCount > 0 || hasManifestChapters
  }, [pairHistoryQuery.data, manifestQuery.data?.chapters])

  const handleDelete = useCallback(
    async (bond: BondData) => {
      if (!userId) return
      try {
        await deleteBond(userId, bond.id)
        await queryClient.invalidateQueries({ queryKey: ['bonds', userId] })
      } catch {
        /* silent */
      }
    },
    [userId, queryClient]
  )

  const handleBondPress = useCallback(
    (bond: BondData) => {
      if (bond.hehunReadingId) {
        router.push(`/bond-detail?id=${bond.id}`)
      } else if (bond.status === 'pending_invite') {
        router.push(`/bond-detail?id=${bond.id}`)
      } else {
        router.push(`/bond-detail?id=${bond.id}`)
      }
    },
    [router]
  )

  const handleAddPress = useCallback(() => {
    hapticLight()
    if (!getIsPro(user ?? null)) {
      router.push('/paywall')
      return
    }
    router.push('/bond-create')
  }, [router, user?.subscriptionStatus])

  const _handleShare = useCallback(
    async (bond: BondData) => {
      if (!userId || !bond.hehunReadingId) return
      setSharing(true)
      setShareBond(bond)
      try {
        const result = await shareBondResult(userId, bond.id)
        setShareData(result)

        const title = `${bond.targetName} · ${bond.grade ?? ''}`
        if (Platform.OS === 'ios') {
          ActionSheetIOS.showActionSheetWithOptions(
            {
              options: [t('bond_share_link'), t('bond_share_image'), t('cancel')],
              cancelButtonIndex: 2,
            },
            async (index) => {
              if (index === 0) {
                await shareBondAsLink(result.url, title)
              } else if (index === 1) {
                setTimeout(async () => {
                  await shareBondAsPoster(posterRef)
                }, 300)
              }
            }
          )
        } else {
          await shareBondAsLink(result.url, title)
        }
      } catch {
        // silent — share failure is non-critical
      } finally {
        setSharing(false)
      }
    },
    [userId, t]
  )

  const allBonds = [...scoredBonds, ...pendingBonds]

  const renderHeader = () => (
    <View style={{ paddingHorizontal: 8, marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 15,
          fontWeight: '300',
          color: colors.textSecondary,
          lineHeight: 22,
        }}
      >
        {t('bonds_subtitle')}
      </Text>

      {/* Aggregate radar — shown when ≥2 fully unlocked bonds */}
      {aggregateDimensions && (
        <View style={{ marginTop: 16 }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: '300',
              color: ios.secondary,
              letterSpacing: 4,
              textTransform: 'uppercase',
              marginBottom: 4,
              textAlign: 'center',
            }}
          >
            {t('bonds_radar_title')}
          </Text>
          <BondRadarChart
            dimensions={aggregateDimensions}
            labels={{
              long_term: t('bond_dim_long_term'),
              attraction: t('bond_dim_attraction'),
              communication: t('bond_dim_communication'),
              emotional: t('bond_dim_emotional'),
            }}
            palette={{ accent: ios.accent, secondary: ios.secondary, separator: ios.separator }}
          />
        </View>
      )}
    </View>
  )

  const renderFooter = () => (
    <View style={{ paddingHorizontal: 8 }}>
      <LeaderboardTeaser bonds={bonds} ios={ios} t={t} router={router} />
    </View>
  )

  const renderSeparator = () => (
    <View
      style={{
        height: 0.5,
        backgroundColor: ios.separator,
      }}
    />
  )

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {/* ── Tab header ── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        <Text
          style={{
            flex: 1,
            fontSize: 11,
            fontWeight: '300',
            color: colors.textSecondary,
            letterSpacing: 6,
            textTransform: 'uppercase',
          }}
        >
          {t('tab_friends')}
        </Text>
        <Pressable
          onPress={handleAddPress}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Plus size={18} color={colors.text} strokeWidth={1.2} />
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={ios.dim} />
        </View>
      ) : allBonds.length === 0 ? (
        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          {renderHeader()}
          <View
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '300',
                color: ios.dim,
                textAlign: 'center',
                lineHeight: 20,
                paddingHorizontal: 32,
                marginBottom: 24,
              }}
            >
              {t('bonds_empty_hint')}
            </Text>
            {hasReadingsInHistory ? (
              <>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '300',
                    color: ios.secondary,
                    textAlign: 'center',
                    lineHeight: 18,
                    paddingHorizontal: 24,
                    marginBottom: 16,
                  }}
                >
                  {t('bonds_empty_readings_explain')}
                </Text>
              </>
            ) : null}
            <View style={{ width: '100%', maxWidth: 320, gap: 18, alignItems: 'stretch' }}>
              {hasReadingsInHistory ? (
                <Pressable
                  onPress={() => router.push(historyHref('readings') as never)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <View
                    style={{
                      borderWidth: 0.5,
                      borderColor: ios.separator,
                      paddingVertical: 12,
                      paddingHorizontal: 28,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '500',
                        color: ios.text,
                        letterSpacing: 0.6,
                      }}
                    >
                      {t('bonds_empty_readings_cta')}
                    </Text>
                  </View>
                </Pressable>
              ) : null}
              <Pressable
                onPress={handleAddPress}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <View
                  style={{
                    backgroundColor: ios.tint,
                    paddingVertical: 14,
                    paddingHorizontal: 40,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: ios.tintFg,
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('bonds_create_cta')}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        <FlatList
          data={allBonds}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <BondCard bond={item} onPress={handleBondPress} onDelete={handleDelete} />}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ItemSeparatorComponent={renderSeparator}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Hidden poster for ViewShot capture */}
      {shareBond && shareData && shareBond.score != null ? (
        <View style={{ position: 'absolute', left: -9999 }}>
          <BondSharePoster
            ref={posterRef}
            score={shareBond.score}
            grade={shareBond.grade ?? ''}
            personAName={t('tab_me')}
            personBName={shareBond.targetName}
            relationshipLabel={shareBond.relationshipLabel}
            shareUrl={shareData.url}
            archetypeName={shareBond.archetypeName}
            archetypeTagline={shareBond.archetypeTagline}
            archetypeCategory={shareBond.archetypeCategory}
          />
        </View>
      ) : null}
    </SafeAreaView>
  )
}

// ── Leaderboard Teaser ────────────────────────────────────────────────────────

const MIN_SCORED_FOR_LEADERBOARD = 3

type IosTokens = {
  separator: string
  text: string
  secondary: string
  accent: string
  dim: string
}

function LeaderboardTeaser({
  bonds,
  ios,
  t,
  router,
}: {
  bonds: BondData[]
  ios: IosTokens
  t: ReturnType<typeof useI18n>['t']
  router: ReturnType<typeof useRouter>
}) {
  const scored = bonds.filter((b) => b.status === 'active' && b.score != null)
  const remaining = Math.max(0, MIN_SCORED_FOR_LEADERBOARD - scored.length)
  const isUnlocked = scored.length >= MIN_SCORED_FOR_LEADERBOARD

  // Find soul match (highest score) as the teaser entry
  const soulMatch = scored.reduce<BondData | null>(
    (best, b) => (best == null || (b.score ?? 0) > (best.score ?? 0) ? b : best),
    null
  )

  return (
    <View style={{ marginTop: 24 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Zap size={10} color={ios.accent} strokeWidth={1.2} />
          <Text
            style={{
              fontSize: 10,
              fontWeight: '500',
              color: ios.secondary,
              letterSpacing: 3,
              textTransform: 'uppercase',
              lineHeight: 12,
            }}
          >
            {t('leaderboard_title')}
          </Text>
        </View>
        {isUnlocked ? (
          <Pressable
            onPress={() => router.push('/bond-leaderboard')}
            hitSlop={10}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Text
              style={{
                fontSize: 9,
                color: ios.accent,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              All →
            </Text>
          </Pressable>
        ) : null}
      </View>

      {isUnlocked && soulMatch ? (
        // Show top soul match card as teaser
        <Pressable
          onPress={() => router.push('/bond-leaderboard')}
          style={({ pressed }) => ({
            borderWidth: 0.5,
            borderColor: ios.separator,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <View style={{ gap: 3 }}>
            <Text
              style={{
                fontSize: 9,
                fontWeight: '300',
                color: ios.secondary,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              {t('leaderboard_soul_match')}
            </Text>
            <Text style={{ fontSize: 15, fontWeight: '300', color: ios.text, letterSpacing: 0.3 }}>
              {soulMatch.targetName}
            </Text>
          </View>
          {soulMatch.score != null ? (
            <Text style={{ fontSize: 22, fontWeight: '100', color: ios.accent, letterSpacing: -1 }}>
              {soulMatch.score}
            </Text>
          ) : null}
        </Pressable>
      ) : (
        // Cold start nudge
        <View
          style={{
            borderWidth: 0.5,
            borderColor: ios.separator,
            borderStyle: 'dashed',
            padding: 16,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '300',
              color: ios.dim,
              letterSpacing: 0.5,
              textAlign: 'center',
              lineHeight: 17,
            }}
          >
            {t('leaderboard_cold_start', { n: remaining })}
          </Text>
        </View>
      )}
    </View>
  )
}
