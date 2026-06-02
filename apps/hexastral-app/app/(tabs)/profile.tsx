/**
 * 道 — Path Profile
 *
 * Metaphysics-structured personal centre:
 *   命 (Destiny) — identity, birth info, usage stats
 *   运 (Fortune) — subscription status, tone preference
 *   道 (Path)    — settings: language, about
 *   账 (Account) — restore, sign-out
 *
 * 本文件仅做编排与状态管理；所有视觉模块抽到 components/profile/*.
 */

import type { User } from '@zhop/hexastral-client'
import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BRAND_PHASE, HexastralPlanetLogo } from '@/components/branding/HexastralPlanetLogo'
import { AccountCard } from '@/components/profile/AccountCard'
import { DestinyCard } from '@/components/profile/DestinyCard'
import { DevToolsModal } from '@/components/profile/DevToolsModal'
import { FortuneCard } from '@/components/profile/FortuneCard'
import { SettingsCard } from '@/components/profile/SettingsCard'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { checkSubscriptionStatus, restorePurchases } from '@/lib/domain/subscription'
import { useDevMenu } from '@/lib/hooks/useDevMenu'
import { useUpdatePreferences } from '@/lib/hooks/useUpdatePreferences'
import { useI18n } from '@/lib/i18n'
import { useIosPalette } from '@/lib/theme'

type TonePreference = 'gentle' | 'straight' | 'poetic'

export default function ProfileScreen() {
  const { user, userId, isAuthenticated, signInWithApple, signInAsGuest, signOut, deleteAccount } =
    useAuth()
  const ios = useIosPalette()
  const { t } = useI18n()

  const [stellarUser, setStellarUser] = useState<User | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [tonePreference, setTonePreference] = useState<TonePreference>('gentle')
  const updatePreferences = useUpdatePreferences()
  const devMenu = useDevMenu()

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    void (async () => {
      try {
        const resp = await apiClient.api.user[':userId'].$get({ param: { userId } })
        if (!resp.ok || cancelled) return
        const json = await resp.json()
        if (!cancelled) setStellarUser(json.data as unknown as User)
      } catch {
        // 静默处理
      }
    })()
    void (async () => {
      const status = await checkSubscriptionStatus()
      if (!cancelled) setIsSubscribed(status.isSubscribed)
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  const handleTonePreferenceChange = useCallback(
    (next: TonePreference) => {
      if (!userId) return
      setTonePreference(next)
      updatePreferences.mutate({ userId, tonePreference: next })
    },
    [userId, updatePreferences]
  )

  const handleRestore = useCallback(async () => {
    const success = await restorePurchases()
    if (success) {
      setIsSubscribed(true)
      Alert.alert(t('alert_restore_success'), t('alert_restore_success_msg'))
    } else {
      Alert.alert(t('alert_no_subscription'))
    }
  }, [t])

  const handleSignOut = useCallback(() => {
    Alert.alert(t('profile_sign_out'), t('profile_sign_out_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('profile_sign_out'), style: 'destructive', onPress: signOut },
    ])
  }, [signOut, t])

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <HexastralPlanetLogo size={64} phase={BRAND_PHASE} withBackground />
          <Text
            style={{
              fontSize: 20,
              fontWeight: '200',
              color: ios.text,
              letterSpacing: 8,
              marginTop: 16,
              marginBottom: 4,
            }}
          >
            HEXASTRAL
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: ios.secondary,
              marginBottom: 40,
              textAlign: 'center',
              lineHeight: 20,
            }}
          >
            {t('profile_sign_in_hint')}
          </Text>
          <Pressable
            onPress={signInWithApple}
            style={{
              backgroundColor: ios.tint,
              paddingVertical: 15,
              width: '100%',
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: ios.tintFg }}>
                {t('profile_sign_in_apple')}
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={signInAsGuest}
            style={{ width: '100%', paddingVertical: 15, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 15, color: ios.secondary }}>{t('profile_sign_in_guest')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }}>
      {/* Page header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '300',
            color: ios.secondary,
            letterSpacing: 6,
            textTransform: 'uppercase',
          }}
        >
          {t('tab_me')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <DestinyCard user={user} stellarUser={stellarUser} onIdentityPress={devMenu.triggerTap} />
        <FortuneCard
          isSubscribed={isSubscribed}
          tonePreference={tonePreference}
          onTonePreferenceChange={handleTonePreferenceChange}
        />
        <SettingsCard onDevTap={devMenu.triggerTap} onOpenDevTools={devMenu.open} />
        <AccountCard
          isSubscribed={isSubscribed}
          onRestore={handleRestore}
          onSignOut={handleSignOut}
        />
      </ScrollView>

      {(__DEV__ || user?.email?.endsWith('@hexastral.com')) && (
        <DevToolsModal
          visible={devMenu.visible}
          onClose={devMenu.close}
          birthInfoSnapshot={devMenu.birthInfoSnapshot}
          onResetAccount={deleteAccount}
        />
      )}
    </SafeAreaView>
  )
}
