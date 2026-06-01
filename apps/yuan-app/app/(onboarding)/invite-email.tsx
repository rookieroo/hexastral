/**
 * Onboarding · Screen 7a — Invite by email (user-initiated)
 *
 * A enters B's email + relationship label → POST /api/bonds/invite creates
 * the bond + token server-side WITHOUT touching B's email. The server
 * returns a locale-aware mailto subject/body; this screen hands those to
 * the system mail composer via expo-linking. A's own mailbox sends the
 * actual message, sidestepping cross-jurisdiction commercial-email
 * regulation (JP 特定電子メール法, SG Spam Control Act, MY PDPA, US
 * CAN-SPAM) since the message originates as a private one-to-one email.
 *
 * On mail-composer-unavailable (rare — typically dev simulators), we copy
 * the resonate URL to the clipboard and route to bonds with an explanatory
 * banner; bonds then offers a Share Sheet fallback.
 */

import { yuanLight, yuanPresets, yuanSpacing, yuanType } from '@zhop/hexastral-tokens/yuan'
import {
  type RelationshipType,
  RelationshipTypeSelector,
  useBondInvitation,
} from '@zhop/scenario-yuan'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, Share, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ProgressIndicator } from '@/components/ProgressIndicator'
import { resolveLocale, t } from '@/lib/i18n'
import { clearDraft, updateDraft, useDraft } from '@/lib/onboardingDraft'
import { markOnboardingComplete } from '../index'

const RELATIONSHIP_LABEL_BY_TYPE: Record<RelationshipType, Record<string, string>> = {
  romantic: { en: 'Partner', zh: '恋人', 'zh-Hant': '戀人', ja: '恋人' },
  friend: { en: 'Friend', zh: '朋友', 'zh-Hant': '朋友', ja: '友人' },
  family: { en: 'Family', zh: '家人', 'zh-Hant': '家人', ja: '家族' },
  partner: { en: 'Business partner', zh: '合伙人', 'zh-Hant': '合夥人', ja: 'パートナー' },
  colleague: { en: 'Colleague', zh: '同事', 'zh-Hant': '同事', ja: '同僚' },
  other: { en: 'Other', zh: '其他', 'zh-Hant': '其他', ja: 'その他' },
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export default function InviteEmailScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const draft = useDraft()
  const { create } = useBondInvitation()
  const [email, setEmail] = useState<string>(draft.otherEmail)
  const [relType, setRelType] = useState<RelationshipType | null>('romantic')
  const [message, setMessage] = useState<string>('')
  const [sending, setSending] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const canSend = isValidEmail(email) && relType !== null && !sending

  const handleSend = async () => {
    if (!relType || !canSend) return
    setSending(true)
    setError(null)
    try {
      const label =
        RELATIONSHIP_LABEL_BY_TYPE[relType][locale] ??
        RELATIONSHIP_LABEL_BY_TYPE[relType].en ??
        'Other'
      const targetName = email.split('@')[0] ?? ''
      const recipient = email.trim()
      // deliveryMode defaults to 'user' server-side — targetEmail is
      // intentionally omitted so the server never receives B's address.
      const result = await create({
        targetName,
        relationshipLabel: label,
        message: message.trim() || undefined,
      })

      // Compose the system mailto URL using server-provided locale-aware
      // copy. URL-encode subject + body so newlines / Unicode survive the
      // round-trip to the OS handler.
      const subject = encodeURIComponent(result.mailto.subject)
      const body = encodeURIComponent(result.mailto.body)
      const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${subject}&body=${body}`

      const canOpenMail = await Linking.canOpenURL(mailtoUrl).catch(() => false)
      if (canOpenMail) {
        await Linking.openURL(mailtoUrl)
      } else {
        // Fallback: hand the bond URL to the system share sheet so A can
        // send it through any channel (Messages, WhatsApp, AirDrop, etc).
        // The bond is already pending server-side; the link is the only
        // thing B needs.
        await Share.share({ message: result.mailto.body }).catch(() => undefined)
      }

      updateDraft({ otherEmail: recipient, relationshipLabel: label, message })
      await markOnboardingComplete()
      await clearDraft()
      router.replace('/(bonds)')
    } catch (err) {
      const code = (err as Error & { code?: string }).code
      if (code === 'paywall_required' || code === 'subscription_required') {
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
    <SafeAreaView style={{ flex: 1, backgroundColor: yuanLight.bg }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: yuanSpacing.screenH,
          paddingTop: yuanSpacing.xl,
        }}
      >
        <ProgressIndicator step={6} total={6} />
        <View style={{ height: yuanSpacing.xl }} />
        <Text style={[yuanType.title, { color: yuanLight.text }]}>{t(locale, 'invite.title')}</Text>
        <View style={{ height: yuanSpacing.lg }} />
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoFocus
          autoCapitalize='none'
          autoComplete='email'
          keyboardType='email-address'
          placeholder='email@example.com'
          placeholderTextColor={yuanLight.textMuted}
          style={{
            fontSize: yuanType.heading.fontSize,
            color: yuanLight.text,
            borderBottomWidth: 0.5,
            borderBottomColor: yuanLight.border,
            paddingVertical: yuanSpacing.md,
          }}
        />

        <View style={{ height: yuanSpacing.xl }} />
        <Text style={[yuanType.caption, { color: yuanLight.textSecondary }]}>
          {t(locale, 'invite.subtitle')}
        </Text>
        <View style={{ height: yuanSpacing.md }} />
        <RelationshipTypeSelector
          value={relType}
          onChange={setRelType}
          labels={Object.fromEntries(
            (Object.keys(RELATIONSHIP_LABEL_BY_TYPE) as RelationshipType[]).map((r) => [
              r,
              RELATIONSHIP_LABEL_BY_TYPE[r][locale] ?? RELATIONSHIP_LABEL_BY_TYPE[r].en,
            ])
          )}
        />

        <View style={{ height: yuanSpacing.xl }} />
        <Text style={[yuanType.caption, { color: yuanLight.textMuted }]}>
          {t(locale, 'invite.hint')}
        </Text>

        <View style={{ flex: 1 }} />
        {error && (
          <Text style={[yuanType.caption, { color: yuanLight.seal, marginBottom: yuanSpacing.md }]}>
            {error}
          </Text>
        )}
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          hitSlop={12}
          style={{ alignSelf: 'flex-end', opacity: canSend ? 1 : 0.3 }}
        >
          {sending ? (
            <ActivityIndicator color={yuanLight.accent} />
          ) : (
            <Text style={yuanPresets.ctaText}>{t(locale, 'invite.send')}</Text>
          )}
        </Pressable>
        <View style={{ height: yuanSpacing.xxl }} />
      </View>
    </SafeAreaView>
  )
}
