/**
 * Threads (合盘) — secondary screen reached from the solo home.
 *
 * Shows ALL pending invitations + active bonds in one scrollable surface:
 *
 *   - Pending invites at the top, rendered as a horizontal pager (one card
 *     per page, snap to width). The user can swipe between them — earlier
 *     this screen blocked the whole list with a single full-page
 *     WaitingForOther for the first pending only, so a user with 3 invites
 *     could only see 1.
 *   - Active bonds below, in a vertical list.
 *
 * Phase F migration: bond cards use <Card>; empty/error states use
 * <EmptyState> / <ErrorState>. Editorial typography (kindredType) and
 * gold-underline CTAs (kindredPresets.ctaText) remain Kindred-specific.
 * This is a secondary screen, so it does NOT carry the home's floating
 * ··· settings shortcut or the swipe-left-to-Settings gesture.
 */

import { Card, EmptyState, ErrorState } from '@zhop/core-ui'
import { AutoMoonPhaseLoader } from '@zhop/core-ui/motion'
import {
  kindredDark,
  kindredRadius,
  kindredSpacing,
  kindredType,
} from '@zhop/hexastral-tokens/kindred'
import { SKIN_CINNABAR } from '@zhop/hexastral-tokens/moon'
import { type BondData, useBondList } from '@zhop/scenario-kindred'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FlatList,
  Pressable,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { HomeSplash } from '@/components/HomeSplash'
import { KindredMoon } from '@/components/KindredMoon'
import { PrimaryButton } from '@/components/PrimaryButton'
import { useAuth } from '@/lib/auth'
import { relativeSentLabel, resolveLocale, t } from '@/lib/i18n'
import { consumeSplashDecision } from '@/lib/splash-control'

export default function BondListScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const { resyncCredentials } = useAuth()
  const { bonds, isLoading, error, refetch } = useBondList()
  const authRetryDone = useRef(false)
  const [showSplash, setShowSplash] = useState(() => !consumeSplashDecision())

  useEffect(() => {
    if (!error?.message.includes('Authentication failed') || authRetryDone.current) return
    authRetryDone.current = true
    void resyncCredentials()
      .then(() => refetch())
      .catch((err) => {
        if (__DEV__) console.warn('[Kindred bonds] auth resync failed', err)
      })
  }, [error, resyncCredentials, refetch])

  const pendingBonds = useMemo(
    () => bonds.filter((b) => b.status === 'pending_invite' && b.invitation),
    [bonds]
  )
  const activeBonds = useMemo(() => bonds.filter((b) => b.status === 'active'), [bonds])

  // ── Render branches ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <AutoMoonPhaseLoader size={72} skin={SKIN_CINNABAR} />
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <ErrorState
          variant='fullscreen'
          illustration={<KindredMoon size={72} />}
          title={t(locale, 'bondList.error.title')}
          message={error.message}
          customAction={
            <PrimaryButton label='Retry →' onPress={() => void refetch()} block={false} />
          }
        />
      </SafeAreaView>
    )
  }

  const hasAnything = pendingBonds.length > 0 || activeBonds.length > 0

  if (!hasAnything) {
    return (
      <View style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <EmptyState
              illustration={<KindredMoon size={96} />}
              title={t(locale, 'bondList.empty.title')}
              subtitle={t(locale, 'bondList.subtitle')}
              customAction={
                <PrimaryButton
                  label={t(locale, 'bondList.empty.cta')}
                  onPress={() => router.push('/(onboarding)/mode')}
                  block={false}
                />
              }
            />
          </View>
        </SafeAreaView>
        {showSplash && <HomeSplash onDone={() => setShowSplash(false)} />}
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: kindredDark.bg }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <FlatList
          contentContainerStyle={{
            paddingTop: kindredSpacing.lg,
            paddingBottom: kindredSpacing.xxl,
            gap: kindredSpacing.md,
          }}
          ListHeaderComponent={
            <View style={{ marginBottom: kindredSpacing.lg }}>
              {/* Header chrome — the add-thread button. This is a secondary
                  screen; settings entry lives on the home, not here. The "+"
                  now opens the new single-page add-partner flow (mode → the
                  one-page BirthForm), not the old self birth wizard. */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  marginBottom: kindredSpacing.md,
                  paddingHorizontal: kindredSpacing.screenH,
                }}
              >
                <AddThreadButton
                  label={t(locale, 'bondList.add')}
                  onPress={() => router.push('/(onboarding)/mode')}
                />
              </View>
              {/* Brand anchor — same cinnabar moon that HomeSplash flies into */}
              <View style={{ alignItems: 'center', gap: kindredSpacing.sm }}>
                <KindredMoon size={56} />
                <Text style={[kindredType.title, { color: kindredDark.text }]}>
                  {t(locale, 'bondList.title')}
                </Text>
                <Text
                  style={[
                    kindredType.caption,
                    { color: kindredDark.textMuted, textAlign: 'center' },
                  ]}
                >
                  {t(locale, 'bondList.subtitle')}
                </Text>
              </View>

              {/* Pending pager — full-width snap pages so the user can swipe
                  through every outstanding invite. Lives ABOVE the active
                  list because pending threads need attention (resend/cancel)
                  while actives are just navigation destinations. */}
              {pendingBonds.length > 0 ? (
                <PendingPager
                  bonds={pendingBonds}
                  locale={locale}
                  onOpen={(id) => router.push(`/(bonds)/${id}`)}
                />
              ) : null}
            </View>
          }
          // Active bonds get the existing card row.
          data={activeBonds}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: kindredSpacing.screenH }}>
              <BondListItem bond={item} onPress={() => router.push(`/(bonds)/${item.id}`)} />
            </View>
          )}
          ListEmptyComponent={
            // The pager covers all pendings; if there are no actives we just
            // show a quiet hint so the screen isn't visually empty below.
            pendingBonds.length > 0 ? (
              <Text
                style={[
                  kindredType.caption,
                  {
                    color: kindredDark.textMuted,
                    textAlign: 'center',
                    paddingHorizontal: kindredSpacing.screenH,
                    paddingTop: kindredSpacing.lg,
                  },
                ]}
              >
                {t(locale, 'bondList.noActiveYet')}
              </Text>
            ) : null
          }
          onRefresh={() => void refetch()}
          refreshing={false}
        />
      </SafeAreaView>
      {showSplash && <HomeSplash onDone={() => setShowSplash(false)} />}
    </View>
  )
}

/** A small bordered pill — the new-thread CTA in the list header. */
function AddThreadButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole='button'
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: kindredSpacing.md,
        paddingVertical: kindredSpacing.sm,
        borderRadius: kindredRadius.sm,
        borderWidth: 0.5,
        borderColor: kindredDark.accent,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: kindredDark.accent, fontSize: 16, lineHeight: 16 }}>+</Text>
      <Text style={[kindredType.caption, { color: kindredDark.accent }]}>{label}</Text>
    </Pressable>
  )
}

/**
 * PendingPager — horizontal snap-scroll pager, one card per page. Each card
 * carries the partner name + relationship + a "waiting since" line + a quiet
 * "tap to manage" affordance. The pager dot row underneath tells the user
 * there are more pages without needing arrows.
 */
function PendingPager({
  bonds,
  locale,
  onOpen,
}: {
  bonds: BondData[]
  locale: ReturnType<typeof resolveLocale>
  onOpen: (id: string) => void
}) {
  const { width } = useWindowDimensions()
  // Cards are slightly inset from screen edges so the next page peeks at the
  // edge — discoverability without an explicit indicator.
  const PAGE = width
  const CARD_INSET = kindredSpacing.screenH
  const [page, setPage] = useState(0)

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / PAGE)
    if (next !== page) setPage(next)
  }

  return (
    <View style={{ marginTop: kindredSpacing.lg }}>
      <Text
        style={[
          kindredType.seal,
          {
            color: kindredDark.textSecondary,
            paddingHorizontal: kindredSpacing.screenH,
            marginBottom: kindredSpacing.md,
          },
        ]}
      >
        {t(locale, 'bondList.pendingSection')}
      </Text>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={PAGE}
        decelerationRate='fast'
        onMomentumScrollEnd={onScrollEnd}
      >
        {bonds.map((bond) => (
          <View key={bond.id} style={{ width: PAGE, paddingHorizontal: CARD_INSET }}>
            <PendingBondCard
              bond={bond}
              locale={locale}
              onPress={() => onOpen(bond.id)}
            />
          </View>
        ))}
      </ScrollView>

      {/* Page dots — only when there's more than one page. */}
      {bonds.length > 1 ? (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 6,
            marginTop: kindredSpacing.md,
          }}
        >
          {bonds.map((b, i) => (
            <View
              key={b.id}
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === page ? kindredDark.accent : kindredDark.border,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  )
}

function PendingBondCard({
  bond,
  locale,
  onPress,
}: {
  bond: BondData
  locale: ReturnType<typeof resolveLocale>
  onPress: () => void
}) {
  return (
    <Pressable onPress={onPress}>
      <Card
        variant='outlined'
        padding='lg'
        style={{
          backgroundColor: kindredDark.card,
          gap: kindredSpacing.xs,
        }}
      >
        <Text style={[kindredType.seal, { color: kindredDark.textMuted }]}>
          {t(locale, 'bondList.pendingTag')}
        </Text>
        <Text style={[kindredType.heading, { color: kindredDark.text }]}>{bond.targetName}</Text>
        <Text style={[kindredType.caption, { color: kindredDark.textSecondary }]}>
          {bond.relationshipLabel}
        </Text>
        <Text
          style={[
            kindredType.caption,
            { color: kindredDark.textMuted, marginTop: kindredSpacing.sm },
          ]}
        >
          {relativeSentLabel(locale, bond.createdAt)}
        </Text>
      </Card>
    </Pressable>
  )
}

/**
 * BondListItem — uses core-ui <Card> for elevation + consistent padding.
 * kindredType (16/28 body, 22/32 heading) is preserved over core-ui Text variants
 * because Kindred's editorial line-heights are part of the brand.
 */
function BondListItem({ bond, onPress }: { bond: BondData; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card variant='outlined' padding='lg' style={{ backgroundColor: kindredDark.card, gap: 6 }}>
        <Text style={[kindredType.heading, { color: kindredDark.text }]}>{bond.targetName}</Text>
        <Text style={[kindredType.caption, { color: kindredDark.textSecondary }]}>
          {bond.relationshipLabel}
        </Text>
        {bond.score != null && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              gap: kindredSpacing.sm,
              marginTop: kindredSpacing.sm,
            }}
          >
            <Text
              style={{
                fontSize: 36,
                fontWeight: '300',
                color: kindredDark.text,
                letterSpacing: -1,
              }}
            >
              {bond.score}
            </Text>
            {bond.archetypeTagline && (
              <Text
                style={[kindredType.caption, { color: kindredDark.textMuted, flex: 1 }]}
                numberOfLines={1}
              >
                {bond.archetypeTagline}
              </Text>
            )}
          </View>
        )}
      </Card>
    </Pressable>
  )
}
