/**
 * Threads (合盘) — secondary screen reached from the solo home.
 *
 * A single vertical list of every thread (pending invites + active bonds +
 * declined/expired), newest-attention first. Each row is a lean list item — not
 * a card — showing the basic info a user manages by: who they are, the
 * relationship, when the thread was started, and whether their info is in yet.
 * Swiping a row left reveals a Delete action (soft-delete via the bonds API).
 *
 * Replaces the earlier card-slider (a horizontal pager for pending invites over
 * a card list) per 2026-06 feedback — "threads card slider 不如直接做成 list".
 *
 * Phase F migration: empty/error states use <EmptyState> / <ErrorState>.
 * Editorial typography (kindredType) stays Kindred-specific. This is a secondary
 * screen, so it does NOT carry the home's floating ··· settings shortcut.
 */

import { EmptyState, ErrorState } from '@zhop/core-ui'
import { AutoMoonPhaseLoader } from '@zhop/core-ui/motion'
import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import { SKIN_CINNABAR } from '@zhop/hexastral-tokens/moon'
import { type BondData, type BondStatus, kindredFonts, useBondList } from '@zhop/scenario-kindred'
import { useRouter } from 'expo-router'
import { GitCommitVertical, Plus } from 'lucide-react-native'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { HomeSplash } from '@/components/HomeSplash'
import { KindredMoon } from '@/components/KindredMoon'
import { PrimaryButton } from '@/components/PrimaryButton'
import { ThreadListItem } from '@/components/ThreadListItem'
import { useAuth } from '@/lib/auth'
import { resolveLocale, t } from '@/lib/i18n'
import { consumeSplashDecision } from '@/lib/splash-control'

// Pending threads need attention (resend/cancel); actives are destinations;
// declined/expired are tail noise the user may want to clear. Sort accordingly.
const STATUS_ORDER: Record<BondStatus, number> = {
  pending_invite: 0,
  active: 1,
  declined: 2,
  expired: 3,
  removed: 4,
}

export default function BondListScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const { resyncCredentials } = useAuth()
  const { bonds, isLoading, error, refetch, deleteBond } = useBondList()
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

  const threads = useMemo(
    () =>
      [...bonds].sort((a, b) => {
        const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
        if (byStatus !== 0) return byStatus
        // Newest first within a status group.
        return b.createdAt.localeCompare(a.createdAt)
      }),
    [bonds]
  )

  const confirmDelete = (bond: BondData) => {
    Alert.alert(t(locale, 'bondList.deleteTitle'), t(locale, 'bondList.deleteBody'), [
      { text: t(locale, 'bondList.cancel'), style: 'cancel' },
      {
        text: t(locale, 'bondList.delete'),
        style: 'destructive',
        onPress: () => {
          void deleteBond(bond.id).catch((err) => {
            if (__DEV__) console.warn('[Kindred bonds] delete failed', err)
          })
        },
      },
    ])
  }

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

  if (threads.length === 0) {
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
          }}
          ListHeaderComponent={
            <View style={{ marginBottom: kindredSpacing.lg }}>
              {/* Brand anchor — same cinnabar moon that HomeSplash flies into */}
              <View
                style={{
                  alignItems: 'center',
                  gap: kindredSpacing.sm,
                  marginBottom: kindredSpacing.lg,
                }}
              >
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
              {/* Two entry pills directly above the list — same shape as auspice's
                  home EntryPills (icon + label rounded-rect), NOT floating circular
                  icon buttons. Timeline (合盘 time axis) · New thread. */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: kindredSpacing.sm,
                  paddingHorizontal: kindredSpacing.screenH,
                }}
              >
                <HeaderPill
                  icon={
                    <GitCommitVertical
                      color={kindredDark.textSecondary}
                      size={18}
                      strokeWidth={1.7}
                    />
                  }
                  label={t(locale, 'timeline.title')}
                  onPress={() => router.push('/(timeline)')}
                />
                <HeaderPill
                  icon={<Plus color={kindredDark.accent} size={18} strokeWidth={1.9} />}
                  label={t(locale, 'bondList.add')}
                  onPress={() => router.push('/(onboarding)/mode')}
                  accent
                />
              </View>
            </View>
          }
          data={threads}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => (
            <ThreadListItem
              bond={item}
              locale={locale}
              onPress={() => router.push(`/(bonds)/${item.id}`)}
              onDelete={() => confirmDelete(item)}
            />
          )}
          ItemSeparatorComponent={() => (
            <View
              style={{
                height: StyleSheet.hairlineWidth,
                backgroundColor: kindredDark.border,
                marginLeft: kindredSpacing.screenH,
              }}
            />
          )}
          onRefresh={() => void refetch()}
          refreshing={false}
          ListFooterComponent={
            threads.length > 0 ? (
              <Pressable
                onPress={() => router.push('/(settings)/glossary')}
                hitSlop={8}
                style={{
                  alignSelf: 'center',
                  marginTop: kindredSpacing.xl,
                  paddingVertical: kindredSpacing.sm,
                }}
              >
                <Text
                  style={{
                    fontFamily: kindredFonts.mono,
                    fontSize: 11,
                    letterSpacing: 1.5,
                    color: kindredDark.textMuted,
                    textTransform: 'uppercase',
                  }}
                >
                  {t(locale, 'primer.more')}
                </Text>
              </Pressable>
            ) : null
          }
        />
      </SafeAreaView>
      {showSplash && <HomeSplash onDone={() => setShowSplash(false)} />}
    </View>
  )
}

/** An entry pill — icon + label rounded-rect, mirroring auspice's home EntryPill
 *  (no floating circular button). Two split the row (flex:1). */
function HeaderPill({
  icon,
  label,
  onPress,
  accent,
}: {
  icon: React.ReactNode
  label: string
  onPress: () => void
  accent?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: kindredSpacing.sm,
        paddingVertical: kindredSpacing.sm,
        paddingHorizontal: kindredSpacing.md,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: accent ? kindredDark.accent : kindredDark.border,
        backgroundColor: kindredDark.card,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {icon}
      <Text
        style={[
          kindredType.caption,
          { color: accent ? kindredDark.accent : kindredDark.textSecondary, fontWeight: '600' },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  )
}
