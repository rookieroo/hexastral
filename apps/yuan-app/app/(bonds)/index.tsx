/**
 * Main bond list — the home screen after onboarding.
 *
 * Three sub-modes:
 *   - Empty: WaitingForOther if a pending invitation exists, otherwise
 *     an empty-state with "Begin →" CTA back to onboarding
 *   - Active bonds: list them; tap → /(bonds)/[id]
 *   - Mixed: pending invite card on top, active bonds below
 *
 * Phase F migration: bond cards use <Card>; empty/error states use
 * <EmptyState> / <ErrorState> from @zhop/core-ui. Editorial typography
 * (yuanType) and gold-underline CTAs (yuanPresets.ctaText) remain Yuán-specific.
 */

import { Card, EmptyState, ErrorState } from '@zhop/core-ui'
import { yuanLight, yuanPresets, yuanSpacing, yuanType } from '@zhop/hexastral-tokens/yuan'
import { type BondData, useBondList, WaitingForOther, YuanSeal } from '@zhop/scenario-yuan'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useRef } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth'
import { resolveLocale, t } from '@/lib/i18n'

export default function BondListScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const { resyncCredentials, userEmail } = useAuth()
  const { bonds, isLoading, error, refetch } = useBondList()
  const authRetryDone = useRef(false)

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

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: yuanLight.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <YuanSeal mode='breathing' size={72} />
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: yuanLight.bg }}>
        <ErrorState
          variant='fullscreen'
          illustration={<YuanSeal mode='static' size={72} />}
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

  // No bonds at all — EmptyState with the breathing seal as illustration.
  // Use customAction slot so the gold-underline CTA pattern (yuanPresets.ctaText)
  // sits cleanly inside the EmptyState block, not as a separate footer.
  if (activeBonds.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: yuanLight.bg }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            illustration={<YuanSeal mode='static' size={96} />}
            title={t(locale, 'bondList.empty.title')}
            customAction={
              <Pressable onPress={() => router.push('/(onboarding)/pair-input')} hitSlop={12}>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: yuanLight.bg }}>
      <FlatList
        contentContainerStyle={{
          paddingHorizontal: yuanSpacing.screenH,
          paddingTop: yuanSpacing.lg,
          paddingBottom: yuanSpacing.xxl,
          gap: yuanSpacing.md,
        }}
        ListHeaderComponent={
          <View
            style={{
              marginBottom: yuanSpacing.lg,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={[yuanType.seal, { color: yuanLight.textMuted }]}>緣</Text>
            <View style={{ flexDirection: 'row', gap: yuanSpacing.lg, alignItems: 'center' }}>
              <Pressable onPress={() => router.push('/(settings)')} hitSlop={8}>
                <Text style={[yuanType.caption, { color: yuanLight.textMuted }]}>···</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/(onboarding)/pair-input')} hitSlop={8}>
                <Text style={[yuanType.caption, { color: yuanLight.accent }]}>+</Text>
              </Pressable>
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
}

/**
 * BondListItem — uses core-ui <Card> for elevation + consistent padding.
 * Wrapped in Pressable so the whole card is the tap target.
 *
 * Note: yuanType (16/28 body, 22/32 heading) is preserved over core-ui Text
 * variants because Yuán's editorial line-heights are part of the brand.
 */
function BondListItem({ bond, onPress }: { bond: BondData; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card variant='outlined' padding='lg' style={{ backgroundColor: yuanLight.card, gap: 6 }}>
        <Text style={[yuanType.heading, { color: yuanLight.text }]}>{bond.targetName}</Text>
        <Text style={[yuanType.caption, { color: yuanLight.textSecondary }]}>
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
              style={{ fontSize: 36, fontWeight: '300', color: yuanLight.text, letterSpacing: -1 }}
            >
              {bond.score}
            </Text>
            {bond.archetypeTagline && (
              <Text
                style={[yuanType.caption, { color: yuanLight.textMuted, flex: 1 }]}
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
