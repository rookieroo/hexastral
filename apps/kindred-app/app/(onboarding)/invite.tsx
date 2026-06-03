/**
 * Threads · Invite them — SMS (primary) or email (ADR-0021 §3).
 *
 * POST /api/bonds/invite creates the bond + token server-side WITHOUT touching
 * B's contact info (deliveryMode 'user'); the returned message body is handed
 * to A's own Messages or Mail composer:
 *   - SMS:   recipient-less `sms:` draft — A picks the recipient. No input needed.
 *   - Email: A enters the address locally (never sent to the server) → mailto.
 *
 * The bond lands as pending; the (reading) home Threads section and
 * (bonds)/index.tsx then show the waiting state.
 *
 * See lib/inviteSubmit.ts for delivery + paywall + relationship-label helpers.
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
import {
  deliverInviteMailto,
  deliverInviteSms,
  isPaywall,
  isValidEmail,
  relationshipLabel,
} from '@/lib/inviteSubmit'
import { clearDraft, updateDraft, useDraft } from '@/lib/onboardingDraft'
import { suppressNextSplash } from '@/lib/splash-control'
import { markOnboardingComplete } from '../index'

type Channel = 'sms' | 'email'

export default function InviteScreen() {
  const router = useRouter()
  const locale = useMemo<Locale>(() => resolveLocale(), [])
  const draft = useDraft()
  const { create } = useBondInvitation()
  const [name, setName] = useState<string>('')
  const [email, setEmail] = useState<string>(draft.otherEmail)
  const [relType, setRelType] = useState<RelationshipType>('romantic')
  const [sending, setSending] = useState<Channel | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canSendSms = sending === null
  const canSendEmail = isValidEmail(email) && sending === null

  const handleSend = async (channel: Channel) => {
    if (channel === 'email' && !canSendEmail) return
    if (channel === 'sms' && !canSendSms) return
    setSending(channel)
    setError(null)
    try {
      const label = relationshipLabel(relType, locale)
      const recipient = email.trim()
      // targetName: what A calls B. Falls back to the email prefix (email
      // channel) or the relationship label (SMS channel, where there is no
      // other identifier to derive a name from).
      const targetName =
        name.trim() || (channel === 'email' ? (recipient.split('@')[0] ?? label) : label)
      const result = await create({ targetName, relationshipLabel: label })
      if (channel === 'sms') {
        await deliverInviteSms(result.mailto)
      } else {
        await deliverInviteMailto(recipient, result.mailto)
      }
      updateDraft({
        otherMode: 'invite',
        otherEmail: channel === 'email' ? recipient : '',
        relationshipLabel: label,
      })
      await markOnboardingComplete()
      await clearDraft()
      suppressNextSplash()
      // Home's Threads section shows the pending thread.
      router.replace('/(reading)')
    } catch (err) {
      if (isPaywall(err)) {
        setSending(null)
        router.push({
          pathname: '/(commerce)/paywall',
          params: { reason: err instanceof Error ? err.message : '' },
        })
        return
      }
      setError(err instanceof Error ? err.message : 'Failed')
      setSending(null)
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
          {t(locale, 'invite.heading')}
        </Text>

        {/* Relationship + optional name */}
        <View style={{ height: kindredSpacing.lg }} />
        <Text style={[kindredType.caption, { color: kindredDark.textSecondary }]}>
          {t(locale, 'invite.subtitle')}
        </Text>
        <View style={{ height: kindredSpacing.md }} />
        <RelationshipTypeSelector value={relType} onChange={setRelType} />

        <View style={{ height: kindredSpacing.lg }} />
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t(locale, 'invite.name.placeholder')}
          placeholderTextColor={kindredDark.textMuted}
          style={{
            fontSize: kindredType.body.fontSize,
            color: kindredDark.text,
            borderBottomWidth: 0.5,
            borderBottomColor: kindredDark.border,
            paddingVertical: kindredSpacing.md,
          }}
        />

        <View style={{ height: kindredSpacing.lg }} />
        <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>
          {t(locale, 'invite.hint')}
        </Text>

        {/* Channel 1 — Messages (primary; no recipient input needed) */}
        <View style={{ height: kindredSpacing.xl }} />
        <Pressable
          onPress={() => void handleSend('sms')}
          disabled={!canSendSms}
          hitSlop={12}
          accessibilityRole='button'
          style={{ alignSelf: 'flex-start', opacity: canSendSms ? 1 : 0.3 }}
        >
          {sending === 'sms' ? (
            <ActivityIndicator color={kindredDark.accent} />
          ) : (
            <Text style={kindredPresets.ctaText}>{t(locale, 'invite.channel.sms')}</Text>
          )}
        </Pressable>

        {/* Channel 2 — Mail (requires their address, kept on-device) */}
        <View style={{ height: kindredSpacing.xl }} />
        <View
          style={{
            borderTopWidth: 0.5,
            borderTopColor: kindredDark.separator,
            paddingTop: kindredSpacing.lg,
          }}
        >
          <Text style={[kindredType.caption, { color: kindredDark.textSecondary }]}>
            {t(locale, 'invite.title')}
          </Text>
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
              fontSize: kindredType.body.fontSize,
              color: kindredDark.text,
              borderBottomWidth: 0.5,
              borderBottomColor: kindredDark.border,
              paddingVertical: kindredSpacing.md,
            }}
          />
          <View style={{ height: kindredSpacing.md }} />
          <Pressable
            onPress={() => void handleSend('email')}
            disabled={!canSendEmail}
            hitSlop={12}
            accessibilityRole='button'
            style={{ alignSelf: 'flex-start', opacity: canSendEmail ? 1 : 0.3 }}
          >
            {sending === 'email' ? (
              <ActivityIndicator color={kindredDark.accent} />
            ) : (
              <Text style={kindredPresets.ctaText}>{t(locale, 'invite.send')}</Text>
            )}
          </Pressable>
        </View>

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
        <View style={{ height: kindredSpacing.xl }} />
      </View>
    </SafeAreaView>
  )
}
