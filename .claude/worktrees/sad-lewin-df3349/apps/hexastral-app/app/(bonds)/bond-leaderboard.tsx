/**
 * Bond Karmic Leaderboard — Sprint 5.1
 *
 * Route: /bond-leaderboard
 *
 * Client-side computation from cached bonds data.
 * Requires 3+ active bonds with scored readings.
 * Cold start shows locked skeleton with invite nudge.
 */

import { useRouter } from 'expo-router'
import { Lock, Zap } from 'lucide-react-native'
import { useMemo } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BackButton } from '@/components/ui/BackButton'
import { useAuth } from '@/lib/auth'
import type { BondData } from '@/lib/domain/bonds'
import { useBondsQuery } from '@/lib/hooks/useBondsQuery'
import { useI18n } from '@/lib/i18n'
import { useIosPalette, useTheme } from '@/lib/theme'

const MIN_BONDS_REQUIRED = 3

// ── Leaderboard computation ──────────────────────────────────────────────────

interface LeaderboardEntry {
  category: string
  labelKey:
    | 'leaderboard_soul_match'
    | 'leaderboard_fatal_attraction'
    | 'leaderboard_cosmic_friction'
    | 'leaderboard_karmic_anchor'
  descKey: string
  bond: BondData | null
}

function computeLeaderboard(bonds: BondData[]): LeaderboardEntry[] {
  const scored = bonds.filter((b) => b.status === 'active' && b.score != null)

  const topScore = scored.reduce<BondData | null>(
    (best, b) => (best == null || (b.score ?? 0) > (best.score ?? 0) ? b : best),
    null
  )

  const fatalAttr = scored
    .filter((b) => b.hookDimension === 'attraction')
    .reduce<BondData | null>(
      (best, b) => (best == null || (b.score ?? 0) > (best.score ?? 0) ? b : best),
      null
    )

  const cosmicFriction = scored
    .filter((b) => b.hookDimension === 'communication')
    .reduce<BondData | null>(
      (best, b) => (best == null || (b.score ?? 0) < (best.score ?? 0) ? b : best),
      null
    )

  const karmicAnchor = scored
    .filter((b) => b.hookDimension === 'emotional')
    .reduce<BondData | null>(
      (best, b) => (best == null || (b.score ?? 0) > (best.score ?? 0) ? b : best),
      null
    )

  return [
    { category: 'soul', labelKey: 'leaderboard_soul_match', descKey: 'long_term', bond: topScore },
    {
      category: 'fatal',
      labelKey: 'leaderboard_fatal_attraction',
      descKey: 'attraction',
      bond: fatalAttr,
    },
    {
      category: 'friction',
      labelKey: 'leaderboard_cosmic_friction',
      descKey: 'communication',
      bond: cosmicFriction,
    },
    {
      category: 'karmic',
      labelKey: 'leaderboard_karmic_anchor',
      descKey: 'emotional',
      bond: karmicAnchor,
    },
  ]
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function BondLeaderboardScreen() {
  const { colors, isDark } = useTheme()
  const { t } = useI18n()
  const { userId } = useAuth()
  const router = useRouter()

  const { data: bonds = [] } = useBondsQuery(userId)
  const ios = useIosPalette()

  const scoredCount = bonds.filter((b) => b.status === 'active' && b.score != null).length
  const isUnlocked = scoredCount >= MIN_BONDS_REQUIRED
  const remaining = Math.max(0, MIN_BONDS_REQUIRED - scoredCount)

  const entries = useMemo(() => computeLeaderboard(bonds), [bonds])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 12,
          gap: 12,
        }}
      >
        <BackButton />
        <Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: ios.text,
            letterSpacing: 1,
            flex: 1,
          }}
        >
          {t('leaderboard_title')}
        </Text>
        <Zap size={14} color={ios.accent} strokeWidth={1.2} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Cold start gate */}
        {!isUnlocked ? (
          <View
            style={{
              borderWidth: 0.5,
              borderColor: ios.separator,
              padding: 24,
              marginTop: 24,
              alignItems: 'center',
              gap: 16,
            }}
          >
            <Lock size={20} color={ios.dim} strokeWidth={1} />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '300',
                color: ios.secondary,
                textAlign: 'center',
                lineHeight: 18,
                letterSpacing: 0.5,
              }}
            >
              {t('leaderboard_cold_start', { n: remaining })}
            </Text>

            {/* Skeleton cards */}
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} ios={ios} />
            ))}
          </View>
        ) : (
          <View style={{ gap: 16, marginTop: 24 }}>
            {entries.map((entry) => (
              <LeaderboardCard
                key={entry.category}
                entry={entry}
                ios={ios}
                t={t}
                onPress={
                  entry.bond ? () => router.push(`/bond-detail?id=${entry.bond?.id}`) : undefined
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

type Ios = {
  bg: string
  card: string
  separator: string
  text: string
  secondary: string
  tint: string
  tintFg: string
  accent: string
  dim: string
}

function LeaderboardCard({
  entry,
  ios,
  t,
  onPress,
}: {
  entry: LeaderboardEntry
  ios: Ios
  t: ReturnType<typeof useI18n>['t']
  onPress?: () => void
}) {
  const { bond } = entry

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        borderWidth: 0.5,
        borderColor: ios.separator,
        padding: 20,
        gap: 10,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text
        style={{
          fontSize: 9,
          fontWeight: '500',
          color: ios.secondary,
          letterSpacing: 3,
          textTransform: 'uppercase',
        }}
      >
        {t(entry.labelKey)}
      </Text>

      {bond ? (
        <>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Text style={{ fontSize: 18, fontWeight: '300', color: ios.text, letterSpacing: 0.3 }}>
              {bond.targetName}
            </Text>
            {bond.score != null ? (
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '100',
                  color: ios.accent,
                  letterSpacing: -1,
                }}
              >
                {bond.score}
              </Text>
            ) : null}
          </View>
          {bond.archetypeName ? (
            <Text
              style={{
                fontSize: 11,
                fontWeight: '300',
                fontStyle: 'italic',
                color: ios.secondary,
              }}
            >
              {bond.archetypeName}
            </Text>
          ) : null}
          {bond.grade ? (
            <Text
              style={{
                fontSize: 9,
                fontWeight: '300',
                color: ios.dim,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              {bond.grade}
            </Text>
          ) : null}
        </>
      ) : (
        <Text
          style={{
            fontSize: 11,
            fontWeight: '300',
            color: ios.dim,
            letterSpacing: 0.5,
            fontStyle: 'italic',
          }}
        >
          — no match yet
        </Text>
      )}
    </Pressable>
  )
}

function SkeletonCard({ ios }: { ios: Ios }) {
  return (
    <View
      style={{
        width: '100%',
        borderWidth: 0.5,
        borderColor: ios.separator,
        padding: 20,
        gap: 10,
        opacity: 0.4,
      }}
    >
      <View style={{ width: '40%', height: 8, backgroundColor: ios.separator }} />
      <View style={{ width: '70%', height: 16, backgroundColor: ios.separator }} />
    </View>
  )
}
