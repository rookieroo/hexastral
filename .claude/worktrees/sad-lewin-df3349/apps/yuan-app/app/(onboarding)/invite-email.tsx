/**
 * Onboarding · Screen 7a — Invite by email
 *
 * Email + relationship chip selector + optional message → POST /api/bonds/invite
 * via scenario-yuan's useBondInvitation().create(). On success, mark
 * onboarding complete and route to /(bonds) which shows the waiting state.
 */

import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { RelationshipTypeSelector, useBondInvitation, type RelationshipType } from '@zhop/scenario-yuan'
import { yuanLight, yuanType, yuanSpacing, yuanPresets } from '@zhop/hexastral-tokens/yuan'
import { ProgressIndicator } from '@/components/ProgressIndicator'
import { resolveLocale, t } from '@/lib/i18n'
import { useDraft, updateDraft, clearDraft } from '@/lib/onboardingDraft'
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
  const [relType, setRelType] = useState<RelationshipType | null>(null)
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
        RELATIONSHIP_LABEL_BY_TYPE[relType][locale] ?? RELATIONSHIP_LABEL_BY_TYPE[relType].en
      const targetName = email.split('@')[0] ?? ''
      await create({
        targetEmail: email.trim(),
        targetName,
        relationshipLabel: label,
        message: message.trim() || undefined,
      })
      updateDraft({ otherEmail: email.trim(), relationshipLabel: label, message })
      await markOnboardingComplete()
      await clearDraft()
      router.replace('/(bonds)')
    } catch (err) {
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
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="email@example.com"
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
            ]),
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
