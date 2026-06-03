/**
 * Settings — email binding, Apple Sign In (recovery), sign out, plus the
 * legal links (privacy / terms) the App Store requires and a daily-reading
 * push toggle.
 */

import { Card } from '@zhop/core-ui'
import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { EmailVerifyModal } from '@/components/EmailVerifyModal'
import { useAuth } from '@/lib/auth'
import { resolveLocale, t } from '@/lib/i18n'
import { fetchMemoryPreference, setCrossAppMemory } from '@/lib/memory-preference'
import { clearDraft } from '@/lib/onboardingDraft'
import { getDailyPushEnabled, setDailyPushEnabled } from '@/lib/push-preference'
import { resetOnboarding } from '../index'

// Privacy + Terms URLs — Apple App Store requires both to be reachable from
// inside a signed-in surface. Hosted on the LLC corp site so the legal
// document lives under our company entity, independent of the app brand.
const LEGAL_BASE = 'https://hexastral.com'
function legalUrl(path: '/privacy' | '/terms', locale: string): string {
  // Locale prefix matches hexastral-web's [locale] segment. Default falls
  // through to the English version when the user's locale isn't published.
  const known = ['en', 'zh', 'tw', 'ja']
  const seg = known.includes(locale) ? locale : 'en'
  return `${LEGAL_BASE}/${seg}${path}`
}

type Status = 'idle' | 'pending' | 'linked' | 'recovered' | 'already_linked' | 'error'

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  if (local.length <= 2) return `${local[0]}***@${domain}`
  return `${local.slice(0, 2)}***@${domain}`
}

export default function SettingsScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const { userId, userEmail, linkApple, signOut, refreshProfile, setUserEmail } = useAuth()
  const [appleAvailable, setAppleAvailable] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [crossAppMemory, setCrossAppMemoryState] = useState(false)
  const [crossAppBusy, setCrossAppBusy] = useState(false)
  const [dailyPush, setDailyPushState] = useState(false)
  const [dailyPushBusy, setDailyPushBusy] = useState(false)

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable)
    }
  }, [])

  useEffect(() => {
    void getDailyPushEnabled().then(setDailyPushState)
  }, [])

  const handleDailyPushToggle = async (value: boolean) => {
    if (dailyPushBusy) return
    setDailyPushBusy(true)
    setDailyPushState(value)
    try {
      await setDailyPushEnabled(value)
    } catch {
      setDailyPushState(!value)
    } finally {
      setDailyPushBusy(false)
    }
  }

  const openLegal = useCallback(
    (path: '/privacy' | '/terms') => {
      void Linking.openURL(legalUrl(path, locale))
    },
    [locale]
  )

  useEffect(() => {
    void refreshProfile()
  }, [refreshProfile])

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

  const handleApple = async () => {
    setStatus('pending')
    setErrorMsg(null)
    try {
      // Request EMAIL alongside FULL_NAME — Apple sends the email on the
      // FIRST authorization per device (and on every authorization for
      // non-relay addresses). The hexastral-api apple-link endpoint already
      // persists it when present
      // (apps/hexastral-api/src/routes/onboarding/apple-link.ts:156); without
      // this scope we were silently dropping the email even for users who
      // signed in. With it the bound email survives a device wipe and the
      // user gets a real recovery handle.
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })
      if (!credential.identityToken) throw new Error('Apple returned no identity token')
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ')
        .trim()
      const result = await linkApple({
        identityToken: credential.identityToken,
        fullName: fullName || undefined,
      })
      setStatus(result.outcome)
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'ERR_REQUEST_CANCELED') {
        setStatus('idle')
        return
      }
      if (code === 'conflict') {
        setStatus('error')
        setErrorMsg(t(locale, 'settings.error.conflict'))
        return
      }
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : t(locale, 'settings.error.generic'))
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.replace('/')
  }

  const onEmailVerified = useCallback(
    (email: string) => {
      setUserEmail(email)
      void refreshProfile()
    },
    [setUserEmail, refreshProfile]
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: kindredSpacing.screenH,
          paddingTop: kindredSpacing.xl,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[kindredType.heading, { color: kindredDark.textMuted }]}>←</Text>
        </Pressable>
        <Text style={[kindredType.seal, { color: kindredDark.textMuted }]}>
          {t(locale, 'settings.title')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        // Settings is now long enough (email + account + notifications + privacy +
        // legal + sign-out + DEV tools) that it needs to scroll on smaller phones.
        contentContainerStyle={{
          paddingHorizontal: kindredSpacing.screenH,
          paddingTop: kindredSpacing.xl,
          paddingBottom: kindredSpacing.xxl,
        }}
        showsVerticalScrollIndicator={false}
      >

        <Text
          style={[
            kindredType.seal,
            { color: kindredDark.textSecondary, marginBottom: kindredSpacing.md },
          ]}
        >
          {t(locale, 'settings.email.section')}
        </Text>

        <Card
          variant='outlined'
          padding='lg'
          style={{
            backgroundColor: kindredDark.card,
            gap: kindredSpacing.sm,
            marginBottom: kindredSpacing.lg,
          }}
        >
          {userEmail ? (
            <Text style={[kindredType.body, { color: kindredDark.text }]}>
              {maskEmail(userEmail)}
            </Text>
          ) : (
            <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>
              {t(locale, 'settings.email.notLinked')}
            </Text>
          )}
          <Pressable onPress={() => setEmailModalOpen(true)} hitSlop={8}>
            <Text style={[kindredType.caption, { color: kindredDark.accent }]}>
              {userEmail ? t(locale, 'settings.email.change') : t(locale, 'settings.email.link')}
            </Text>
          </Pressable>
          <Text style={[kindredType.caption, { color: kindredDark.textMuted, lineHeight: 18 }]}>
            {t(locale, 'settings.email.hint')}
          </Text>
        </Card>

        <Text
          style={[
            kindredType.seal,
            { color: kindredDark.textSecondary, marginBottom: kindredSpacing.md },
          ]}
        >
          {t(locale, 'settings.account')}
        </Text>

        <Card
          variant='outlined'
          padding='lg'
          style={{ backgroundColor: kindredDark.card, gap: kindredSpacing.md }}
        >
          {appleAvailable ? (
            <View style={{ gap: kindredSpacing.sm }}>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={8}
                style={{ width: '100%', height: 48 }}
                onPress={handleApple}
              />
              <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>
                {t(locale, 'settings.signInWithApple.hint')}
              </Text>
            </View>
          ) : (
            <Text style={[kindredType.body, { color: kindredDark.textMuted }]}>
              {t(locale, 'settings.signInWithApple')} — iOS only
            </Text>
          )}

          {status === 'linked' || status === 'already_linked' ? (
            <Text style={[kindredType.caption, { color: kindredDark.accent }]}>
              ✓ {t(locale, 'settings.linked')}
            </Text>
          ) : null}
          {status === 'recovered' ? (
            <Text style={[kindredType.caption, { color: kindredDark.accent }]}>
              ✓ {t(locale, 'settings.recovered')}
            </Text>
          ) : null}
          {status === 'error' && errorMsg ? (
            <Text style={[kindredType.caption, { color: kindredDark.seal }]}>{errorMsg}</Text>
          ) : null}
        </Card>

        <View style={{ height: kindredSpacing.lg }} />

        <Text
          style={[
            kindredType.seal,
            { color: kindredDark.textSecondary, marginBottom: kindredSpacing.md },
          ]}
        >
          {t(locale, 'settings.privacy.section')}
        </Text>

        <Card
          variant='outlined'
          padding='lg'
          style={{ backgroundColor: kindredDark.card, gap: kindredSpacing.sm }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: kindredSpacing.md,
            }}
          >
            <Text style={[kindredType.body, { color: kindredDark.text, flex: 1 }]}>
              {t(locale, 'settings.crossAppMemory.label')}
            </Text>
            <Switch
              value={crossAppMemory}
              onValueChange={handleCrossAppToggle}
              disabled={crossAppBusy || !userId}
            />
          </View>
          <Text style={[kindredType.caption, { color: kindredDark.textMuted, lineHeight: 18 }]}>
            {t(locale, 'settings.crossAppMemory.hint')}
          </Text>
        </Card>

        <View style={{ height: kindredSpacing.lg }} />

        {/* Notifications — daily reading nudge. Delivery is server-driven
            (svc-notify cron), so the toggle persists the user's preference
            and the API reads it on profile sync. Off by default to avoid
            unsolicited push (App Store guideline). */}
        <Text
          style={[
            kindredType.seal,
            { color: kindredDark.textSecondary, marginBottom: kindredSpacing.md },
          ]}
        >
          {t(locale, 'settings.notifications.section')}
        </Text>

        <Card
          variant='outlined'
          padding='lg'
          style={{ backgroundColor: kindredDark.card, gap: kindredSpacing.sm }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: kindredSpacing.md,
            }}
          >
            <Text style={[kindredType.body, { color: kindredDark.text, flex: 1 }]}>
              {t(locale, 'settings.dailyPush.label')}
            </Text>
            <Switch
              value={dailyPush}
              onValueChange={handleDailyPushToggle}
              disabled={dailyPushBusy}
            />
          </View>
          <Text style={[kindredType.caption, { color: kindredDark.textMuted, lineHeight: 18 }]}>
            {t(locale, 'settings.dailyPush.hint')}
          </Text>
        </Card>

        <View style={{ height: kindredSpacing.lg }} />

        {/* Legal — App Store requires Privacy + Terms to be reachable from
            the signed-in surface. We open the hosted versions on hexastral.com
            so the documents stay versioned in one place. */}
        <Text
          style={[
            kindredType.seal,
            { color: kindredDark.textSecondary, marginBottom: kindredSpacing.md },
          ]}
        >
          {t(locale, 'settings.legal.section')}
        </Text>

        <Card
          variant='outlined'
          padding='lg'
          style={{ backgroundColor: kindredDark.card, gap: 0 }}
        >
          <Pressable
            onPress={() => openLegal('/privacy')}
            hitSlop={4}
            style={({ pressed }) => ({
              paddingVertical: kindredSpacing.md,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={[kindredType.body, { color: kindredDark.text }]}>
              {t(locale, 'settings.legal.privacy')}
            </Text>
          </Pressable>
          <View style={{ height: 0.5, backgroundColor: kindredDark.border }} />
          <Pressable
            onPress={() => openLegal('/terms')}
            hitSlop={4}
            style={({ pressed }) => ({
              paddingVertical: kindredSpacing.md,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={[kindredType.body, { color: kindredDark.text }]}>
              {t(locale, 'settings.legal.terms')}
            </Text>
          </Pressable>
        </Card>

        <View style={{ height: kindredSpacing.xxl }} />

        <Pressable onPress={handleSignOut} hitSlop={12} style={{ alignSelf: 'center' }}>
          <Text
            style={[
              kindredType.caption,
              {
                color: kindredDark.textMuted,
                textDecorationLine: 'underline',
              },
            ]}
          >
            {t(locale, 'settings.signOut')}
          </Text>
        </Pressable>
        <Text
          style={[
            kindredType.caption,
            { color: kindredDark.textMuted, textAlign: 'center', marginTop: kindredSpacing.xs },
          ]}
        >
          {t(locale, 'settings.signOut.hint')}
        </Text>

        {__DEV__ ? (
          <Pressable
            onPress={async () => {
              await resetOnboarding()
              await clearDraft()
              router.replace('/')
            }}
            hitSlop={12}
            style={{ alignSelf: 'center', marginTop: kindredSpacing.lg }}
          >
            <Text
              style={[
                kindredType.caption,
                { color: kindredDark.seal, textDecorationLine: 'underline' },
              ]}
            >
              DEV · replay intro + reset onboarding
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {userId ? (
        <EmailVerifyModal
          visible={emailModalOpen}
          userId={userId}
          currentEmail={userEmail}
          onSuccess={onEmailVerified}
          onClose={() => setEmailModalOpen(false)}
        />
      ) : null}
    </SafeAreaView>
  )
}
