/**
 * Settings — account, birth info, tools (罗盘 / 历史), privacy, sign-out, delete.
 *
 * Yuel model: a full-screen 墨青 settings route reached from the home gear +
 * left-swipe (edge-only back). Replaces the old Profile tab; folds in the
 * retired Compass / Readings tabs as tool links.
 */

import { Button, useHaptic } from '@zhop/core-ui'
import { useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { deleteAccount } from '@/lib/account'
import { useAuth } from '@/lib/auth'
import { type FengBirthInfo, fetchBirthInfo } from '@/lib/birth-info'
import { resolveLocale, useStrings } from '@/lib/i18n'
import { fetchMemoryPreference, setCrossAppMemory } from '@/lib/memory-preference'
import { FENG_PALETTE, spacing } from '@/lib/theme'

const CARD = {
  backgroundColor: 'rgba(245,239,227,0.05)',
  borderWidth: 1,
  borderColor: 'rgba(176,141,91,0.18)',
  borderRadius: 14,
  padding: spacing.lg,
} as const

function accountKindLabel(userId: string | null, t: ReturnType<typeof useStrings>): string {
  if (!userId) return '—'
  if (userId.startsWith('apple_')) return t.account_kind_apple
  if (userId.startsWith('google_')) return t.account_kind_google
  if (userId.startsWith('guest_')) return t.account_kind_guest
  return t.account_kind_device
}

export default function SettingsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const t = useStrings(resolveLocale())
  const haptic = useHaptic()
  const { user, userId, signOut } = useAuth()

  const [birthInfo, setBirthInfo] = useState<FengBirthInfo | null>(null)
  const [crossAppMemory, setCrossAppMemoryState] = useState(false)
  const [crossAppBusy, setCrossAppBusy] = useState(false)

  const loadBirth = useCallback(async () => {
    try {
      setBirthInfo(await fetchBirthInfo())
    } catch {
      setBirthInfo(null)
    }
  }, [])

  useEffect(() => {
    void loadBirth()
  }, [loadBirth, userId])

  useEffect(() => {
    if (!userId) return
    fetchMemoryPreference(userId)
      .then((p) => setCrossAppMemoryState(p.crossAppEnabled))
      .catch(() => {})
  }, [userId])

  const handleCrossAppToggle = async (value: boolean) => {
    if (!userId || crossAppBusy) return
    setCrossAppBusy(true)
    setCrossAppMemoryState(value)
    try {
      await setCrossAppMemory(userId, value)
    } catch {
      setCrossAppMemoryState(!value)
    } finally {
      setCrossAppBusy(false)
    }
  }

  const handleSignOut = () => {
    void haptic('light')
    Alert.alert(t.profile_sign_out, t.profile_sign_out_confirm, [
      { text: t.cancel, style: 'cancel' },
      { text: t.profile_sign_out, style: 'destructive', onPress: () => void signOut() },
    ])
  }

  const handleDeleteAccount = () => {
    void haptic('warning')
    Alert.alert(t.profile_delete_confirm_title, t.profile_delete_confirm_body, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.profile_delete_confirm_cta,
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteAccount()
              await signOut()
            } catch {
              Alert.alert(t.profile_delete_failed)
            }
          })()
        },
      },
    ])
  }

  const toolRow = (label: string, onPress: () => void) => (
    <Pressable
      onPress={() => {
        void haptic('light')
        onPress()
      }}
      accessibilityRole='button'
      accessibilityLabel={label}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <Text style={{ color: FENG_PALETTE.rice, fontSize: 15 }}>{label}</Text>
      <ChevronRight color={FENG_PALETTE.riceMute} size={18} />
    </Pressable>
  )

  return (
    <View style={{ flex: 1, backgroundColor: FENG_PALETTE.inkTeal }}>
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole='button'
          accessibilityLabel={t.nav_back}
          hitSlop={12}
        >
          <Text style={{ color: FENG_PALETTE.copperGold, fontSize: 24 }}>‹</Text>
        </Pressable>
        <Text style={{ color: FENG_PALETTE.rice, fontSize: 18, fontWeight: '700' }}>
          {t.tab_profile}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          gap: spacing.lg,
        }}
      >
        <View style={[CARD, { gap: spacing.sm }]}>
          <Text style={{ color: FENG_PALETTE.riceMute, fontSize: 12, letterSpacing: 1 }}>
            {accountKindLabel(userId, t).toUpperCase()}
          </Text>
          {user?.name ? (
            <Text style={{ color: FENG_PALETTE.rice, fontSize: 17, fontWeight: '600' }}>
              {user.name}
            </Text>
          ) : null}
          {user?.email ? (
            <Text style={{ color: FENG_PALETTE.riceMute, fontSize: 14 }}>{user.email}</Text>
          ) : null}
          <Text
            style={{ color: FENG_PALETTE.riceMute, fontFamily: 'Menlo', fontSize: 11 }}
            selectable
          >
            {userId ?? '—'}
          </Text>
        </View>

        <View style={[CARD, { gap: spacing.md }]}>
          <Text style={{ color: FENG_PALETTE.rice, fontSize: 15, fontWeight: '600' }}>
            {t.profile_birth_section}
          </Text>
          <Text style={{ color: FENG_PALETTE.riceMute, fontSize: 14, lineHeight: 22 }}>
            {birthInfo
              ? `${birthInfo.birthSolarDate} · ${birthInfo.gender}${birthInfo.birthCity ? ` · ${birthInfo.birthCity}` : ''}`
              : t.profile_birth_required}
          </Text>
          <View style={{ alignSelf: 'flex-start' }}>
            <Button variant='secondary' size='md' onPress={() => router.push('/(birth-info)')}>
              {birthInfo ? t.profile_birth_edit_cta : t.profile_birth_required_cta}
            </Button>
          </View>
        </View>

        <View style={[CARD, { gap: spacing.md }]}>
          {toolRow(t.tab_compass, () => router.push('/(tabs)/compass'))}
          <View style={{ height: 1, backgroundColor: 'rgba(176,141,91,0.14)' }} />
          {toolRow(t.tab_readings, () => router.push('/(tabs)/readings'))}
        </View>

        <View style={[CARD, { gap: spacing.md }]}>
          <Text style={{ color: FENG_PALETTE.rice, fontSize: 15, fontWeight: '600' }}>
            {t.privacy_section}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing.md,
            }}
          >
            <Text style={{ color: FENG_PALETTE.rice, fontSize: 15, flex: 1 }}>
              {t.cross_app_memory_label}
            </Text>
            <Switch
              value={crossAppMemory}
              onValueChange={handleCrossAppToggle}
              disabled={crossAppBusy || !userId}
              accessibilityLabel={t.cross_app_memory_label}
            />
          </View>
          <Text style={{ color: FENG_PALETTE.riceMute, fontSize: 13, lineHeight: 20 }}>
            {t.cross_app_memory_hint}
          </Text>
        </View>

        <Pressable
          onPress={handleSignOut}
          accessibilityRole='button'
          accessibilityLabel={t.profile_sign_out}
          hitSlop={8}
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
          }}
        >
          <Text style={{ color: FENG_PALETTE.cinnabar, fontSize: 14 }}>{t.profile_sign_out}</Text>
        </Pressable>

        <Pressable
          onPress={handleDeleteAccount}
          accessibilityRole='button'
          accessibilityLabel={t.profile_delete_account}
          hitSlop={8}
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
          }}
        >
          <Text
            style={{ color: FENG_PALETTE.riceMute, fontSize: 13, textDecorationLine: 'underline' }}
          >
            {t.profile_delete_account}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}
