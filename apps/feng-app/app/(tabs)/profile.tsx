/**
 * (tabs)/profile — account, birth info, sign-out.
 */

import { Button, Card, useHaptic, useTheme } from '@zhop/core-ui'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { deleteAccount } from '@/lib/account'
import { useAuth } from '@/lib/auth'
import { type FengBirthInfo, fetchBirthInfo } from '@/lib/birth-info'
import { resolveLocale, useStrings } from '@/lib/i18n'
import { fetchMemoryPreference, setCrossAppMemory } from '@/lib/memory-preference'

function accountKindLabel(userId: string | null, t: ReturnType<typeof useStrings>): string {
  if (!userId) return '—'
  if (userId.startsWith('apple_')) return t.account_kind_apple
  if (userId.startsWith('google_')) return t.account_kind_google
  if (userId.startsWith('guest_')) return t.account_kind_guest
  return t.account_kind_device
}

export default function ProfileTab() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors, spacing } = useTheme()
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
      {
        text: t.profile_sign_out,
        style: 'destructive',
        onPress: () => {
          void signOut()
        },
      },
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

  return (
    <ScrollView
      contentContainerStyle={{
        paddingTop: insets.top + spacing.xl,
        paddingHorizontal: spacing.xl,
        paddingBottom: insets.bottom + spacing.xl,
        gap: spacing.lg,
        backgroundColor: colors.bg,
        flexGrow: 1,
      }}
    >
      <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text }}>{t.tab_profile}</Text>

      <Card variant='elevated' padding='lg' style={{ gap: spacing.sm }}>
        <Text style={{ color: colors.secondary, fontSize: 12, letterSpacing: 1 }}>
          {accountKindLabel(userId, t).toUpperCase()}
        </Text>
        {user?.name ? (
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{user.name}</Text>
        ) : null}
        {user?.email ? (
          <Text style={{ color: colors.secondary, fontSize: 14 }}>{user.email}</Text>
        ) : null}
        <Text style={{ color: colors.text, fontFamily: 'Menlo', fontSize: 11 }} selectable>
          {userId ?? '—'}
        </Text>
      </Card>

      <Card variant='elevated' padding='lg' style={{ gap: spacing.md }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
          {t.profile_birth_section}
        </Text>
        {birthInfo ? (
          <Text style={{ color: colors.secondary, fontSize: 14, lineHeight: 22 }}>
            {birthInfo.birthSolarDate} · {birthInfo.gender}
            {birthInfo.birthCity ? ` · ${birthInfo.birthCity}` : ''}
          </Text>
        ) : (
          <Text style={{ color: colors.secondary, fontSize: 14, lineHeight: 22 }}>
            {t.profile_birth_required}
          </Text>
        )}
        <View style={{ alignSelf: 'flex-start' }}>
          <Button variant='secondary' size='md' onPress={() => router.push('/(birth-info)')}>
            {birthInfo ? t.profile_birth_edit_cta : t.profile_birth_required_cta}
          </Button>
        </View>
      </Card>

      <Card variant='elevated' padding='lg' style={{ gap: spacing.md }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
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
          <Text style={{ color: colors.text, fontSize: 15, flex: 1 }}>
            {t.cross_app_memory_label}
          </Text>
          <Switch
            value={crossAppMemory}
            onValueChange={handleCrossAppToggle}
            disabled={crossAppBusy || !userId}
            accessibilityLabel={t.cross_app_memory_label}
          />
        </View>
        <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 20 }}>
          {t.cross_app_memory_hint}
        </Text>
      </Card>

      <View style={{ flex: 1 }} />

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
        <Text style={{ color: colors.danger, fontSize: 14 }}>{t.profile_sign_out}</Text>
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
        <Text style={{ color: colors.secondary, fontSize: 13, textDecorationLine: 'underline' }}>
          {t.profile_delete_account}
        </Text>
      </Pressable>
    </ScrollView>
  )
}
