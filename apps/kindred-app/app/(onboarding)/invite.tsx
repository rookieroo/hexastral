/**
 * Threads · Invite them — one channel-agnostic share (ADR-0021 §3).
 *
 * Simplified layout (2026-06): the earlier page had ~6 stacked elements
 * (moon, title, subtitle, picker, name input, hint, button, error) at equal
 * weight and read as "scattered with no focus". The single decision here is
 * "what relation are you?" — the relationship picker is now the focal block;
 * name is a quiet optional below it; the hint folds into one short caption.
 *
 * POST /api/bonds/invite creates the bond + token server-side WITHOUT
 * touching B's contact info (deliveryMode 'user'); the returned message body
 * (with the invite link) is handed to the system share sheet, so A can send
 * it through ANY app — Messages, WhatsApp, WeChat, Mail, AirDrop. No channel
 * is special, so there is no email/phone field and no per-channel copy.
 *
 * The bond lands as pending; the (reading) home Threads section and
 * (bonds)/index.tsx then show the waiting state.
 *
 * See lib/inviteSubmit.ts for share + paywall + relationship-label helpers.
 */

import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import {
  type RelationshipType,
  RelationshipTypeSelector,
  useBondInvitation,
} from '@zhop/scenario-kindred'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Keyboard, Pressable, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PrimaryButton } from '@/components/PrimaryButton'
import { SignInSheet } from '@/components/SignInSheet'
import { YuelMark } from '@/components/YuelMark'
import { useAuth } from '@/lib/auth'
import { type Locale, resolveLocale, t } from '@/lib/i18n'
import { isPaywall, relationshipLabel, shareInvite } from '@/lib/inviteSubmit'
import { clearDraft, updateDraft, useDraft } from '@/lib/onboardingDraft'
import {
  clearSelfBirthSyncedFlag,
  ensureSelfBirthSynced,
  isSelfBirthReady,
  loadSelfBirth,
} from '@/lib/selfBirth'
import { markInviteSignInNudgeShown, shouldNudgeSignInAfterInvite } from '@/lib/sign-in-nudge'
import { suppressNextSplash } from '@/lib/splash-control'
import { markOnboardingComplete } from '../index'

export default function InviteScreen() {
  const router = useRouter()
  const locale = useMemo<Locale>(() => resolveLocale(), [])
  const draft = useDraft()
  const { create } = useBondInvitation()
  const { unlockBondId } = useLocalSearchParams<{ unlockBondId?: string }>()
  const [name, setName] = useState<string>(draft.otherName)
  const [relType, setRelType] = useState<RelationshipType>('romantic')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNameField, setShowNameField] = useState(true)
  const [ready, setReady] = useState(false)
  const [signInOpen, setSignInOpen] = useState(false)
  const { hasLinkedSignIn, userId, isLoading: authLoading } = useAuth()

  const goSelfForInvite = useCallback(() => {
    router.replace({
      pathname: '/(onboarding)/self',
      params: {
        next: 'invite',
        ...(unlockBondId ? { unlockBondId } : {}),
      },
    })
  }, [router, unlockBondId])

  const finishToHome = () => {
    suppressNextSplash()
    router.replace('/(reading)')
  }

  // Local-first: missing birth → self immediately (ignore effect cancel).
  // Local ready → paint UI; soft sync in background.
  useEffect(() => {
    if (authLoading) return

    let cancelled = false
    void (async () => {
      const birth = await loadSelfBirth()
      if (!isSelfBirthReady(birth)) {
        goSelfForInvite()
        return
      }
      if (cancelled) return
      setReady(true)
      if (userId) {
        void ensureSelfBirthSynced(userId)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [authLoading, goSelfForInvite, userId])

  if (authLoading || !ready) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: kindredDark.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={kindredDark.accent} />
      </SafeAreaView>
    )
  }

  const handleShare = async () => {
    if (sending) return
    setSending(true)
    setError(null)
    try {
      const birth = await loadSelfBirth()
      if (!isSelfBirthReady(birth)) {
        setSending(false)
        goSelfForInvite()
        return
      }
      if (!userId) {
        setError(t(locale, 'settings.dailyPush.failedBody'))
        setSending(false)
        return
      }
      const synced = await ensureSelfBirthSynced(userId)
      if (!synced) {
        setError(t(locale, 'settings.dailyPush.failedBody'))
        setSending(false)
        return
      }
      const label = relationshipLabel(relType, locale)
      const targetName = name.trim() || label
      const result = await create({
        targetName,
        relationshipLabel: label,
        language: locale,
        unlockBondId: unlockBondId || undefined,
      })
      await shareInvite(result.mailto, result.resonateUrl)
      updateDraft({ otherMode: 'invite', otherName: targetName, relationshipLabel: label })
      void markOnboardingComplete()
      void clearDraft()
      if (!hasLinkedSignIn && (await shouldNudgeSignInAfterInvite())) {
        await markInviteSignInNudgeShown()
        setSending(false)
        setSignInOpen(true)
        return
      }
      finishToHome()
    } catch (err) {
      if (isPaywall(err)) {
        setSending(false)
        router.push({
          pathname: '/(commerce)/paywall',
          params: { reason: err instanceof Error ? err.message : '' },
        })
        return
      }
      const msg = err instanceof Error ? err.message : 'Failed'
      // Server still missing birth — send them to the form instead of a dead-end error.
      if (/birth/i.test(msg) || /missing_required/i.test(msg)) {
        setSending(false)
        void clearSelfBirthSyncedFlag()
        goSelfForInvite()
        return
      }
      setError(msg)
      setSending(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
      {/* Tap anywhere off an input dismisses the keyboard. */}
      <Pressable
        accessible={false}
        onPress={() => Keyboard.dismiss()}
        style={{
          flex: 1,
          paddingHorizontal: kindredSpacing.screenH,
          paddingTop: kindredSpacing.xl,
        }}
      >
        {/* Brand mark + one prompt — no separate title + subtitle stack. */}
        <View style={{ alignItems: 'center', marginBottom: kindredSpacing.xl }}>
          <YuelMark vertical size={56} color={kindredDark.seal} />
        </View>
        <Text
          style={[
            kindredType.title,
            { color: kindredDark.text, textAlign: 'center', marginBottom: kindredSpacing.xs },
          ]}
        >
          {t(locale, 'invite.heading')}
        </Text>
        <Text
          style={[
            kindredType.caption,
            {
              color: kindredDark.textSecondary,
              textAlign: 'center',
              marginBottom: kindredSpacing.xxl,
            },
          ]}
        >
          {t(locale, 'invite.subtitle')}
        </Text>

        {/* Focal block — the one decision the user is here to make. */}
        <RelationshipTypeSelector value={relType} onChange={setRelType} locale={locale} />

        {/* Optional name — collapsed by default to keep this page about the
            relationship choice. Tap to expand if the user wants a personal
            label; otherwise the relationship name itself becomes targetName. */}
        <View style={{ marginTop: kindredSpacing.lg }}>
          {showNameField ? (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t(locale, 'invite.name.placeholder')}
              placeholderTextColor={kindredDark.textMuted}
              autoFocus
              style={{
                fontSize: kindredType.body.fontSize,
                color: kindredDark.text,
                borderBottomWidth: 0.5,
                borderBottomColor: kindredDark.border,
                paddingVertical: kindredSpacing.sm,
              }}
            />
          ) : (
            <Pressable onPress={() => setShowNameField(true)} hitSlop={6}>
              <Text
                style={[kindredType.caption, { color: kindredDark.textMuted, textAlign: 'center' }]}
              >
                + {t(locale, 'invite.name.placeholder')}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={{ flex: 1 }} />

        {error ? (
          <Text
            style={[
              kindredType.caption,
              {
                color: kindredDark.seal,
                marginBottom: kindredSpacing.md,
                textAlign: 'center',
              },
            ]}
          >
            {error}
          </Text>
        ) : null}

        <PrimaryButton
          label={t(locale, 'invite.share')}
          onPress={() => void handleShare()}
          loading={sending}
        />
        <View style={{ height: kindredSpacing.lg }} />
      </Pressable>

      <SignInSheet
        visible={signInOpen}
        onClose={() => {
          setSignInOpen(false)
          finishToHome()
        }}
        onAuthed={() => {
          setSignInOpen(false)
          finishToHome()
        }}
      />
    </SafeAreaView>
  )
}
