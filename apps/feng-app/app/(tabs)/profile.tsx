/**
 * Settings — account, birth info, tools (罗盘 / 历史 / 术语表), DEV, account actions.
 *
 * Yuel/Yuun model: a full-screen 墨 settings route reached from the home gear +
 * left-swipe. Grouped rows (no fixed-height cards with dead whitespace); the
 * destructive actions are centered small text with 删除账号 as the only red.
 * Cross-app memory is hidden for MVP. A __DEV__-only block exposes reset-intro +
 * a DEV-Pro bypass so analysis can be tested without IAP.
 */

import { useHaptic } from '@zhop/core-ui'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ChevronRight } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { deleteAccount } from '@/lib/account'
import { useAuth } from '@/lib/auth'
import { type FengBirthInfo, fetchBirthInfo } from '@/lib/birth-info'
import { getDevPro, setDevPro } from '@/lib/dev-flags'
import { resolveLocale, useStrings } from '@/lib/i18n'
import { resetFengIntro } from '@/lib/onboarding'
import { FENG_PALETTE, spacing } from '@/lib/theme'

const CARD = {
  backgroundColor: FENG_PALETTE.nightRaised,
  borderWidth: 1,
  borderColor: FENG_PALETTE.hairline,
  borderRadius: 14,
  paddingHorizontal: spacing.lg,
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
  const [devPro, setDevProState] = useState(false)

  const loadBirth = useCallback(async () => {
    try {
      setBirthInfo(await fetchBirthInfo())
    } catch {
      setBirthInfo(null)
    }
  }, [])

  useEffect(() => {
    void loadBirth()
  }, [loadBirth])

  useEffect(() => {
    if (__DEV__) void getDevPro().then(setDevProState)
  }, [])

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

  const birthValue = birthInfo
    ? `${birthInfo.birthSolarDate} · ${birthInfo.gender}${birthInfo.birthCity ? ` · ${birthInfo.birthCity}` : ''}`
    : t.profile_birth_required

  const navRow = (label: string, value: string | null, onPress: () => void, last?: boolean) => (
    <Pressable
      onPress={() => {
        void haptic('light')
        onPress()
      }}
      accessibilityRole='button'
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: FENG_PALETTE.hairline,
        gap: spacing.sm,
      }}
    >
      <Text style={{ color: FENG_PALETTE.rice, fontSize: 15 }}>{label}</Text>
      <View style={{ flex: 1 }} />
      {value ? (
        <Text
          numberOfLines={1}
          style={{ color: FENG_PALETTE.riceMute, fontSize: 13, maxWidth: '60%' }}
        >
          {value}
        </Text>
      ) : null}
      <ChevronRight color={FENG_PALETTE.riceMute} size={18} />
    </Pressable>
  )

  return (
    <View style={{ flex: 1, backgroundColor: FENG_PALETTE.night }}>
      <StatusBar style='light' />
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
        {/* account */}
        <View style={[CARD, { paddingVertical: spacing.lg, gap: spacing.xs }]}>
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

        {/* rows: birth + tools */}
        <View style={CARD}>
          {navRow(t.profile_birth_section, birthValue, () => router.push('/(birth-info)'))}
          {navRow(t.tab_compass, null, () => router.push('/(tabs)/compass'))}
          {navRow(t.tab_readings, null, () => router.push('/(tabs)/readings'))}
          {navRow(t.tool_glossary, null, () => router.push('/(glossary)'), true)}
        </View>

        {/* DEV */}
        {__DEV__ ? (
          <View style={CARD}>
            <Text
              style={{
                color: FENG_PALETTE.copperGold,
                fontSize: 11,
                letterSpacing: 2,
                paddingTop: spacing.md,
              }}
            >
              DEV
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: FENG_PALETTE.hairline,
              }}
            >
              <Text style={{ color: FENG_PALETTE.rice, fontSize: 15, flex: 1 }}>
                DEV Pro (skip IAP)
              </Text>
              <Switch
                value={devPro}
                onValueChange={(v) => {
                  setDevProState(v)
                  void setDevPro(v)
                }}
              />
            </View>
            <Pressable
              onPress={() => {
                void haptic('light')
                void resetFengIntro()
                Alert.alert('Intro reset', 'The cold-open will replay next launch.')
              }}
              accessibilityRole='button'
              style={{ paddingVertical: spacing.md }}
            >
              <Text style={{ color: FENG_PALETTE.rice, fontSize: 15 }}>Reset intro</Text>
            </Pressable>
          </View>
        ) : null}

        {/* account actions — centered; 删除账号 is the only red */}
        <View style={{ alignItems: 'center', gap: spacing.md, marginTop: spacing.lg }}>
          <Pressable onPress={handleSignOut} accessibilityRole='button' hitSlop={8}>
            <Text style={{ color: FENG_PALETTE.riceMute, fontSize: 14 }}>{t.profile_sign_out}</Text>
          </Pressable>
          <Pressable onPress={handleDeleteAccount} accessibilityRole='button' hitSlop={8}>
            <Text style={{ color: FENG_PALETTE.cinnabar, fontSize: 13 }}>
              {t.profile_delete_account}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  )
}
