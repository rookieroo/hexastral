/**
 * Settings — modular sections: profile, tools, learn, legal, DEV, account actions.
 *
 * Yuel/Yuun model: full-screen settings from home fingerprint / left-swipe.
 * Destructive actions stay centered small text; 删除账号 is the only red.
 */

import { useHaptic } from '@zhop/core-ui'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ChevronRight } from 'lucide-react-native'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Alert, Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { deleteAccount } from '@/lib/account'
import { useAuth } from '@/lib/auth'
import { type FengBirthInfo, fetchBirthInfo } from '@/lib/birth-info'
import { privacyUrl, termsUrl } from '@/lib/config'
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

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text
        style={{
          color: FENG_PALETTE.riceMute,
          fontSize: 11,
          letterSpacing: 2,
          paddingHorizontal: spacing.xs,
        }}
      >
        {title.toUpperCase()}
      </Text>
      <View style={CARD}>{children}</View>
    </View>
  )
}

export default function SettingsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const t = useStrings(resolveLocale())
  const locale = resolveLocale()
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
          style={{ color: FENG_PALETTE.riceMute, fontSize: 13, maxWidth: '55%' }}
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
        <SettingsSection title={t.settings_section_profile}>
          {navRow(t.profile_birth_section, birthValue, () => router.push('/(birth-info)'), true)}
        </SettingsSection>

        <SettingsSection title={t.settings_section_tools}>
          {navRow(t.tab_compass, null, () => router.push('/(tabs)/compass'))}
          {navRow(t.tab_readings, null, () => router.push('/(tabs)/readings'), true)}
        </SettingsSection>

        <SettingsSection title={t.settings_section_learn}>
          {navRow(t.tool_glossary, null, () => router.push('/(glossary)'))}
          {navRow(t.tool_imagery, null, () => router.push('/(imagery)'), true)}
        </SettingsSection>

        <SettingsSection title={t.settings_section_legal}>
          {navRow(t.privacy_section, null, () => {
            void Linking.openURL(privacyUrl(locale)).catch(() => {})
          })}
          {navRow(t.terms_section, null, () => {
            void Linking.openURL(termsUrl(locale)).catch(() => {})
          }, true)}
        </SettingsSection>

        {__DEV__ ? (
          <SettingsSection title='DEV'>
            {user?.name ? (
              <Text style={{ color: FENG_PALETTE.rice, fontSize: 14, paddingTop: spacing.md }}>
                {user.name}
              </Text>
            ) : null}
            {user?.email ? (
              <Text style={{ color: FENG_PALETTE.riceMute, fontSize: 13 }} selectable>
                {user.email}
              </Text>
            ) : null}
            <Text
              style={{
                color: FENG_PALETTE.riceMute,
                fontFamily: 'Menlo',
                fontSize: 11,
                paddingBottom: spacing.sm,
                paddingTop: user?.email || user?.name ? 0 : spacing.md,
              }}
              selectable
            >
              {userId ?? '—'}
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
          </SettingsSection>
        ) : null}

        <View style={{ alignItems: 'center', gap: spacing.md, marginTop: spacing.sm }}>
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
