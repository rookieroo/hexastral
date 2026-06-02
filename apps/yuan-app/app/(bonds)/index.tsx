/**
 * Main bond list — the home screen after onboarding.
 *
 * Three sub-modes: WaitingForOther (pending invite), empty-state, or the bond
 * list. Swipe left → Settings (ADR-0018 SWIPE_TO_ME; ··· header is the a11y
 * fallback). On cold launch a V15Moon HomeSplash flourishes once.
 *
 * Phase F migration: bond cards use <Card>; empty/error states use
 * <EmptyState> / <ErrorState>. Editorial typography (yuanType) and
 * gold-underline CTAs (yuanPresets.ctaText) remain Yuán-specific.
 */

import { Card, EmptyState, ErrorState } from '@zhop/core-ui'
import { AutoMoonPhaseLoader, V15Moon } from '@zhop/core-ui/motion'
import { SKIN_CINNABAR } from '@zhop/hexastral-tokens/moon'
import { yuanDark, yuanPresets, yuanSpacing, yuanType } from '@zhop/hexastral-tokens/yuan'
import { SWIPE_TO_ME } from '@zhop/satellite-ui'
import { type BondData, useBondList, WaitingForOther } from '@zhop/scenario-yuan'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { HomeSplash } from '@/components/HomeSplash'
import { useAuth } from '@/lib/auth'
import { resolveLocale, t } from '@/lib/i18n'
import { consumeSplashDecision } from '@/lib/splash-control'

export default function BondListScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const { resyncCredentials, userEmail } = useAuth()
  const { bonds, isLoading, error, refetch } = useBondList()
  const authRetryDone = useRef(false)
  const [showSplash, setShowSplash] = useState(() => !consumeSplashDecision())

  // Swipe-left → Settings (ADR-0018 rule 2). The ··· header is the a11y fallback.
  const goToSettings = useCallback(() => router.push('/(settings)'), [router])
  const { activeOffsetX, failOffsetY, commitDx, maxDy } = SWIPE_TO_ME
  const swipeToMe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(activeOffsetX)
        .failOffsetY(failOffsetY)
        .onEnd((e) => {
          if (e.translationX < commitDx && Math.abs(e.translationY) < maxDy) {
            runOnJS(goToSettings)()
          }
        }),
    [goToSettings, activeOffsetX, failOffsetY, commitDx, maxDy]
  )

  useEffect(() => {
    if (!error?.message.includes('Authentication failed') || authRetryDone.current) return
    authRetryDone.current = true
    void resyncCredentials()
      .then(() => refetch())
      .catch((err) => {
        if (__DEV__) console.warn('[Yuán bonds] auth resync failed', err)
      })
  }, [error, resyncCredentials, refetch])

  // First pending invitation (if any) → show waiting state above the list
  const firstPending = useMemo(
    () => bonds.find((b) => b.status === 'pending_invite' && b.invitation),
    [bonds]
  )
  const activeBonds = useMemo(() => bonds.filter((b) => b.status === 'active'), [bonds])

  const content = (() => {
    if (isLoading) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: yuanDark.bg }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <AutoMoonPhaseLoader size={72} skin={SKIN_CINNABAR} />
          </View>
        </SafeAreaView>
      )
    }

    if (error) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: yuanDark.bg }}>
          <ErrorState
            variant='fullscreen'
            illustration={<V15Moon size={72} />}
            title={t(locale, 'bondList.error.title')}
            message={error.message}
            customAction={
              <Pressable onPress={() => void refetch()} hitSlop={12}>
                <Text style={yuanPresets.ctaText}>Retry →</Text>
              </Pressable>
            }
          />
        </SafeAreaView>
      )
    }

    // Pending invite as primary state (most common right after onboarding A→invite)
    if (firstPending?.invitation) {
      return (
        <WaitingForOther
          state='pending'
          invitedEmail={firstPending.invitation.targetEmail}
          sentAt={firstPending.createdAt}
          otherName={firstPending.targetName}
          linkEmailHint={!userEmail ? t(locale, 'waiting.linkEmail') : undefined}
          onLinkEmail={!userEmail ? () => router.push('/(settings)') : undefined}
          onResend={() => {
            /* TODO: resend RPC */
          }}
          onCancel={() => {
            /* TODO: cancel RPC */
          }}
          onViewReport={() => router.push(`/(bonds)/${firstPending.id}`)}
        />
      )
    }

    // No bonds at all — EmptyState with the seal as illustration.
    if (activeBonds.length === 0) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: yuanDark.bg }}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <EmptyState
              illustration={<V15Moon size={96} />}
              title={t(locale, 'bondList.empty.title')}
              customAction={
                <Pressable onPress={() => router.push('/(onboarding)/self')} hitSlop={12}>
                  <Text style={yuanPresets.ctaText}>{t(locale, 'bondList.empty.cta')}</Text>
                </Pressable>
              }
            />
          </View>
        </SafeAreaView>
      )
    }

    // Normal list
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: yuanDark.bg }}>
        <FlatList
          contentContainerStyle={{
            paddingHorizontal: yuanSpacing.screenH,
            paddingTop: yuanSpacing.lg,
            paddingBottom: yuanSpacing.xxl,
            gap: yuanSpacing.md,
          }}
          ListHeaderComponent={
            <View style={{ marginBottom: yuanSpacing.lg }}>
              {/* Header chrome — Settings (left) + Add (right), tucked into the corners */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: yuanSpacing.md,
                }}
              >
                <Pressable
                  onPress={() => router.push('/(settings)')}
                  hitSlop={8}
                  accessibilityRole='button'
                  accessibilityLabel={t(locale, 'settings.title')}
                >
                  <Text style={[yuanType.caption, { color: yuanDark.textMuted }]}>···</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/(onboarding)/self')} hitSlop={8}>
                  <Text style={[yuanType.caption, { color: yuanDark.accent }]}>+</Text>
                </Pressable>
              </View>
              {/* Brand anchor — same V15Moon that HomeSplash flies into */}
              <View style={{ alignItems: 'center' }}>
                <V15Moon size={56} />
              </View>
            </View>
          }
          data={activeBonds}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => (
            <BondListItem bond={item} onPress={() => router.push(`/(bonds)/${item.id}`)} />
          )}
          onRefresh={() => void refetch()}
          refreshing={false}
        />
      </SafeAreaView>
    )
  })()

  return (
    <GestureDetector gesture={swipeToMe}>
      <View style={{ flex: 1, backgroundColor: yuanDark.bg }}>
        {content}
        {showSplash && <HomeSplash onDone={() => setShowSplash(false)} />}
      </View>
    </GestureDetector>
  )
}

/**
 * BondListItem — uses core-ui <Card> for elevation + consistent padding.
 * yuanType (16/28 body, 22/32 heading) is preserved over core-ui Text variants
 * because Yuán's editorial line-heights are part of the brand.
 */
function BondListItem({ bond, onPress }: { bond: BondData; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card variant='outlined' padding='lg' style={{ backgroundColor: yuanDark.card, gap: 6 }}>
        <Text style={[yuanType.heading, { color: yuanDark.text }]}>{bond.targetName}</Text>
        <Text style={[yuanType.caption, { color: yuanDark.textSecondary }]}>
          {bond.relationshipLabel}
        </Text>
        {bond.score != null && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              gap: yuanSpacing.sm,
              marginTop: yuanSpacing.sm,
            }}
          >
            <Text
              style={{ fontSize: 36, fontWeight: '300', color: yuanDark.text, letterSpacing: -1 }}
            >
              {bond.score}
            </Text>
            {bond.archetypeTagline && (
              <Text
                style={[yuanType.caption, { color: yuanDark.textMuted, flex: 1 }]}
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
