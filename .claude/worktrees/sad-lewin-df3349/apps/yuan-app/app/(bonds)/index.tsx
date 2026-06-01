/**
 * Main bond list — the home screen after onboarding.
 *
 * Three sub-modes:
 *   - Empty: WaitingForOther if a pending invitation exists, otherwise
 *     an empty-state with "Begin →" CTA back to onboarding
 *   - Active bonds: list them; tap → /(bonds)/[id]
 *   - Mixed: pending invite card on top, active bonds below
 */

import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { useBondList, WaitingForOther, YuanSeal, type BondData } from '@zhop/scenario-yuan'
import { yuanLight, yuanType, yuanSpacing, yuanPresets } from '@zhop/hexastral-tokens/yuan'
import { resolveLocale, t } from '@/lib/i18n'

export default function BondListScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const { bonds, isLoading, error, refetch } = useBondList()

  // First pending invitation (if any) → show waiting state above the list
  const firstPending = useMemo(
    () => bonds.find((b) => b.status === 'pending_invite' && b.invitation),
    [bonds],
  )
  const activeBonds = useMemo(
    () => bonds.filter((b) => b.status === 'active'),
    [bonds],
  )

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: yuanLight.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <YuanSeal mode="breathing" size={72} />
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: yuanLight.bg }}>
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: yuanSpacing.lg }}
        >
          <Text style={[yuanType.body, { color: yuanLight.seal, textAlign: 'center' }]}>
            {error.message}
          </Text>
          <Pressable onPress={() => void refetch()} hitSlop={12} style={{ marginTop: yuanSpacing.md }}>
            <Text style={yuanPresets.ctaText}>Retry →</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  // Pending invite as primary state (most common right after onboarding A→invite)
  if (firstPending && firstPending.invitation) {
    return (
      <WaitingForOther
        state="pending"
        invitedEmail={firstPending.invitation.targetEmail}
        sentAt={firstPending.createdAt}
        otherName={firstPending.targetName}
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

  // No bonds at all
  if (activeBonds.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: yuanLight.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: yuanSpacing.xl }}>
          <YuanSeal mode="static" size={72} />
          <Text style={[yuanType.title, { color: yuanLight.text, textAlign: 'center' }]}>
            {t(locale, 'bondList.empty.title')}
          </Text>
          <Pressable onPress={() => router.push('/(onboarding)/welcome')} hitSlop={12}>
            <Text style={yuanPresets.ctaText}>{t(locale, 'bondList.empty.cta')}</Text>
          </Pressable>
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
          <View style={{ marginBottom: yuanSpacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[yuanType.seal, { color: yuanLight.textMuted }]}>緣</Text>
            <Pressable onPress={() => router.push('/(onboarding)/welcome')} hitSlop={8}>
              <Text style={[yuanType.caption, { color: yuanLight.accent }]}>+</Text>
            </Pressable>
          </View>
        }
        data={activeBonds}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => <BondListItem bond={item} onPress={() => router.push(`/(bonds)/${item.id}`)} />}
        onRefresh={() => void refetch()}
        refreshing={false}
      />
    </SafeAreaView>
  )
}

function BondListItem({ bond, onPress }: { bond: BondData; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        padding: yuanSpacing.lg,
        borderWidth: 0.5,
        borderColor: yuanLight.border,
        backgroundColor: yuanLight.card,
        gap: 6,
      }}
    >
      <Text style={[yuanType.heading, { color: yuanLight.text }]}>{bond.targetName}</Text>
      <Text style={[yuanType.caption, { color: yuanLight.textSecondary }]}>
        {bond.relationshipLabel}
      </Text>
      {bond.score != null && (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: yuanSpacing.sm, marginTop: yuanSpacing.sm }}>
          <Text style={{ fontSize: 36, fontWeight: '300', color: yuanLight.text, letterSpacing: -1 }}>
            {bond.score}
          </Text>
          {bond.archetypeTagline && (
            <Text style={[yuanType.caption, { color: yuanLight.textMuted, flex: 1 }]} numberOfLines={1}>
              {bond.archetypeTagline}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  )
}
