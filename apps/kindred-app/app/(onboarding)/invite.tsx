/**
 * Onboarding · Invite them by email.
 *
 * Slim form — email + relationship type. POST /api/bonds/invite creates the
 * bond + token server-side WITHOUT touching B's email (deliveryMode 'user');
 * the returned mailto template hands A's own mail app the message. The bond
 * lands as pending; (bonds)/index.tsx then shows WaitingForOther.
 *
 * See lib/inviteSubmit.ts for the mailto + paywall + relationship-label
 * helpers shared with this screen.
 */

import { V15Moon } from '@zhop/core-ui/motion'
import {
  kindredDark,
  kindredPresets,
  kindredSpacing,
  kindredType,
} from '@zhop/hexastral-tokens/kindred'
import {
  type RelationshipType,
  RelationshipTypeSelector,
  useBondInvitation,
} from '@zhop/scenario-kindred'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { type Locale, resolveLocale, t } from '@/lib/i18n'
import { deliverInviteMailto, isPaywall, isValidEmail, relationshipLabel } from '@/lib/inviteSubmit'
import { clearDraft, updateDraft, useDraft } from '@/lib/onboardingDraft'
import { suppressNextSplash } from '@/lib/splash-control'
import { markOnboardingComplete } from '../index'

export default function InviteScreen() {
  const router = useRouter()
  const locale = useMemo<Locale>(() => resolveLocale(), [])
  const draft = useDraft()
  const { create } = useBondInvitation()
  const [email, setEmail] = useState<string>(draft.otherEmail)
  const [relType, setRelType] = useState<RelationshipType>('romantic')
  const [sending, setSending] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const canSend = isValidEmail(email) && !sending

  const handleSend = async () => {
    if (!canSend) return
    setSending(true)
    setError(null)
    try {
      const label = relationshipLabel(relType, locale)
      const recipient = email.trim()
      const result = await create({
        targetName: recipient.split('@')[0] ?? '',
        relationshipLabel: label,
      })
      await deliverInviteMailto(recipient, result.mailto)
      updateDraft({ otherMode: 'invite', otherEmail: recipient, relationshipLabel: label })
      await markOnboardingComplete()
      await clearDraft()
      suppressNextSplash()
      router.replace('/(bonds)')
    } catch (err) {
      if (isPaywall(err)) {
        setSending(false)
        router.push({
          pathname: '/(commerce)/paywall',
          params: { reason: err instanceof Error ? err.message : '' },
        })
        return
      }
      setError(err instanceof Error ? err.message : 'Failed')
      setSending(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: kindredSpacing.screenH,
          paddingTop: kindredSpacing.xl,
        }}
      >
        <View style={{ alignItems: 'center', marginBottom: kindredSpacing.xl }}>
          <V15Moon size={56} />
        </View>
        <Text style={[kindredType.title, { color: kindredDark.text }]}>
          {t(locale, 'invite.title')}
        </Text>

        <View style={{ height: kindredSpacing.lg }} />
        <TextInput
          value={email}
          onChangeText={(v) => {
            setEmail(v)
            updateDraft({ otherEmail: v })
          }}
          autoCapitalize='none'
          autoComplete='email'
          keyboardType='email-address'
          placeholder='email@example.com'
          placeholderTextColor={kindredDark.textMuted}
          style={{
            fontSize: kindredType.heading.fontSize,
            color: kindredDark.text,
            borderBottomWidth: 0.5,
            borderBottomColor: kindredDark.border,
            paddingVertical: kindredSpacing.md,
          }}
        />

        <View style={{ height: kindredSpacing.xl }} />
        <Text style={[kindredType.caption, { color: kindredDark.textSecondary }]}>
          {t(locale, 'invite.subtitle')}
        </Text>
        <View style={{ height: kindredSpacing.md }} />
        <RelationshipTypeSelector value={relType} onChange={setRelType} />

        <View style={{ height: kindredSpacing.lg }} />
        <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>
          {t(locale, 'invite.hint')}
        </Text>

        <View style={{ flex: 1 }} />
        {error && (
          <Text
            style={[
              kindredType.caption,
              { color: kindredDark.seal, marginBottom: kindredSpacing.md },
            ]}
          >
            {error}
          </Text>
        )}
        <Pressable
          onPress={() => void handleSend()}
          disabled={!canSend}
          hitSlop={12}
          style={{ alignSelf: 'flex-end', opacity: canSend ? 1 : 0.3 }}
        >
          {sending ? (
            <ActivityIndicator color={kindredDark.accent} />
          ) : (
            <Text style={kindredPresets.ctaText}>{t(locale, 'invite.send')}</Text>
          )}
        </Pressable>
        <View style={{ height: kindredSpacing.xl }} />
      </View>
    </SafeAreaView>
  )
}
