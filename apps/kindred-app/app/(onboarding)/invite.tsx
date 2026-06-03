/**
 * Threads · Invite them — one channel-agnostic share (ADR-0021 §3).
 *
 * POST /api/bonds/invite creates the bond + token server-side WITHOUT touching
 * B's contact info (deliveryMode 'user'); the returned message body (with the
 * invite link) is handed to the system share sheet, so A can send it through
 * ANY app — Messages, WhatsApp, WeChat, Mail, AirDrop. No channel is special,
 * so there is no email/phone field and no per-channel copy to get wrong.
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
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { KindredMoon } from '@/components/KindredMoon'
import { PrimaryButton } from '@/components/PrimaryButton'
import { type Locale, resolveLocale, t } from '@/lib/i18n'
import { isPaywall, relationshipLabel, shareInvite } from '@/lib/inviteSubmit'
import { clearDraft, updateDraft, useDraft } from '@/lib/onboardingDraft'
import { suppressNextSplash } from '@/lib/splash-control'
import { markOnboardingComplete } from '../index'

export default function InviteScreen() {
  const router = useRouter()
  const locale = useMemo<Locale>(() => resolveLocale(), [])
  const draft = useDraft()
  const { create } = useBondInvitation()
  const [name, setName] = useState<string>(draft.otherName)
  const [relType, setRelType] = useState<RelationshipType>('romantic')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleShare = async () => {
    if (sending) return
    setSending(true)
    setError(null)
    try {
      const label = relationshipLabel(relType, locale)
      // targetName: what A calls B. Falls back to the relationship label when no
      // name is given — the channel is anonymous, so there's no other identifier.
      const targetName = name.trim() || label
      const result = await create({ targetName, relationshipLabel: label })
      await shareInvite(result.mailto)
      updateDraft({ otherMode: 'invite', otherName: targetName, relationshipLabel: label })
      await markOnboardingComplete()
      await clearDraft()
      suppressNextSplash()
      // Home's Threads section shows the pending thread.
      router.replace('/(reading)')
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
          <KindredMoon size={56} />
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

        {/* One channel-agnostic share — the system share sheet picks the app. */}
        <View style={{ height: kindredSpacing.xl }} />
        <PrimaryButton
          label={t(locale, 'invite.share')}
          onPress={() => void handleShare()}
          loading={sending}
        />

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
