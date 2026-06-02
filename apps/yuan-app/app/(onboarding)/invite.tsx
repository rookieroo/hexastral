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
import { yuanDark, yuanPresets, yuanSpacing, yuanType } from '@zhop/hexastral-tokens/yuan'
import {
  type RelationshipType,
  RelationshipTypeSelector,
  useBondInvitation,
} from '@zhop/scenario-yuan'
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
    <SafeAreaView style={{ flex: 1, backgroundColor: yuanDark.bg }}>
      <View style={{ flex: 1, paddingHorizontal: yuanSpacing.screenH, paddingTop: yuanSpacing.xl }}>
        <View style={{ alignItems: 'center', marginBottom: yuanSpacing.xl }}>
          <V15Moon size={56} />
        </View>
        <Text style={[yuanType.title, { color: yuanDark.text }]}>{t(locale, 'invite.title')}</Text>

        <View style={{ height: yuanSpacing.lg }} />
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
          placeholderTextColor={yuanDark.textMuted}
          style={{
            fontSize: yuanType.heading.fontSize,
            color: yuanDark.text,
            borderBottomWidth: 0.5,
            borderBottomColor: yuanDark.border,
            paddingVertical: yuanSpacing.md,
          }}
        />

        <View style={{ height: yuanSpacing.xl }} />
        <Text style={[yuanType.caption, { color: yuanDark.textSecondary }]}>
          {t(locale, 'invite.subtitle')}
        </Text>
        <View style={{ height: yuanSpacing.md }} />
        <RelationshipTypeSelector value={relType} onChange={setRelType} />

        <View style={{ height: yuanSpacing.lg }} />
        <Text style={[yuanType.caption, { color: yuanDark.textMuted }]}>
          {t(locale, 'invite.hint')}
        </Text>

        <View style={{ flex: 1 }} />
        {error && (
          <Text style={[yuanType.caption, { color: yuanDark.seal, marginBottom: yuanSpacing.md }]}>
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
            <ActivityIndicator color={yuanDark.accent} />
          ) : (
            <Text style={yuanPresets.ctaText}>{t(locale, 'invite.send')}</Text>
          )}
        </Pressable>
        <View style={{ height: yuanSpacing.xl }} />
      </View>
    </SafeAreaView>
  )
}
