/**
 * Main bond list — the home screen after onboarding.
 *
 * Three sub-modes: WaitingForOther (pending invite), empty-state, or the bond
 * list. Swipe left → Settings (ADR-0018 SWIPE_TO_ME; ··· header is the a11y
 * fallback). On cold launch a V15Moon HomeSplash flourishes once.
 *
 * Phase F migration: bond cards use <Card>; empty/error states use
 * <EmptyState> / <ErrorState>. Editorial typography (kindredType) and
 * gold-underline CTAs (kindredPresets.ctaText) remain Kindred-specific.
 */

import { Card, EmptyState, ErrorState } from '@zhop/core-ui'
import { AutoMoonPhaseLoader } from '@zhop/core-ui/motion'
import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import { SKIN_CINNABAR } from '@zhop/hexastral-tokens/moon'
import { SWIPE_TO_ME } from '@zhop/satellite-ui'
import { type BondData, useBondList, WaitingForOther } from '@zhop/scenario-kindred'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
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
  const insets = useSafeAreaInsets()

  // Swipe-left → Settings (ADR-0018 rule 2). The floating ··· is the a11y fallback.
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
        if (__DEV__) console.warn('[Kindred bonds] auth resync failed', err)
      })
  }, [error, resyncCredentials, refetch])

  // First pending invitation (if any) → show waiting state above the list
  const firstPending = useMemo(
    () => bonds.find((b) => b.status === 'pending_invite' && b.invitation),
    [bonds]
  )
  const activeBonds = useMemo(() => bonds.filter((b) => b.status === 'active'), [bonds])

  // Localized copy for the pending-invite waiting screen. The component itself is
  // shared + presentational (scenario-kindred); the app owns i18n + the relative
  // "sent N ago" label, so nothing in it is hardcoded to one language.
  const waitingCopy = useMemo(
    () => ({
      pendingTitle: t(locale, 'waiting.title'),
      pendingSubtitle: t(locale, 'waiting.subtitle'),
      pendingHint: t(locale, 'waiting.hint'),
      resend: t(locale, 'waiting.resend'),
      cancel: t(locale, 'waiting.cancel'),
      acceptedTitle: t(locale, 'waiting.acceptedTitle'),
      acceptedSubtitle: t(locale, 'waiting.acceptedSubtitle'),
      viewReport: t(locale, 'waiting.viewReport'),
    }),
    [locale]
  )

  const content = (() => {
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

    // Pending invite as primary state (most common right after onboarding A→invite)
    if (firstPending?.invitation) {
      return (
        <WaitingForOther
          state='pending'
          otherName={firstPending.targetName}
          sentAtLabel={relativeSentLabel(locale, firstPending.createdAt)}
          copy={waitingCopy}
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
        <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <EmptyState
              illustration={<KindredMoon size={96} />}
              title={t(locale, 'bondList.empty.title')}
              customAction={
                <PrimaryButton
                  label={t(locale, 'bondList.empty.cta')}
                  onPress={() => router.push('/(onboarding)/self')}
                  block={false}
                />
              }
            />
          </View>
        </SafeAreaView>
      )
    }

    // Normal list
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <FlatList
          contentContainerStyle={{
            paddingHorizontal: kindredSpacing.screenH,
            paddingTop: kindredSpacing.lg,
            paddingBottom: kindredSpacing.xxl,
            gap: kindredSpacing.md,
          }}
          ListHeaderComponent={
            <View style={{ marginBottom: kindredSpacing.lg }}>
              {/* Header chrome — just the new-thread "+". Settings moved to the
                  bottom-floating ··· + the swipe-left gesture (ADR-0018). */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  marginBottom: kindredSpacing.md,
                }}
              >
                <Pressable onPress={() => router.push('/(onboarding)/self')} hitSlop={8}>
                  <Text style={[kindredType.caption, { color: kindredDark.accent }]}>+</Text>
                </Pressable>
              </View>
              {/* Brand anchor — same cinnabar moon that HomeSplash flies into */}
              <View style={{ alignItems: 'center' }}>
                <KindredMoon size={56} />
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
      <View style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        {content}
        {/* Floating "more" — relocated from the top-left. The discoverable a11y
            fallback for the swipe-left → Settings gesture (ADR-0018). */}
        <View
          pointerEvents='box-none'
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: insets.bottom + 16,
            alignItems: 'center',
          }}
        >
          <Pressable
            onPress={goToSettings}
            hitSlop={12}
            accessibilityRole='button'
            accessibilityLabel={t(locale, 'settings.title')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: kindredDark.card,
              borderWidth: 0.5,
              borderColor: kindredDark.border,
              opacity: 0.85,
            }}
          >
            <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>···</Text>
          </Pressable>
        </View>
        {showSplash && <HomeSplash onDone={() => setShowSplash(false)} />}
      </View>
    </GestureDetector>
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
