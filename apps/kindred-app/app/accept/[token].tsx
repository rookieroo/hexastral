/**
 * /accept/[token] — B-user entry from the shared invite link / DDL claim.
 *
 * The invite is channel-agnostic (ADR-0021 §3): A shares a web URL through any
 * app (Messages / WhatsApp / WeChat / Mail / AirDrop), so nothing here assumes
 * email or SMS.
 *
 * Flow:
 *   1. B opened the shared invite link → web /resonate/[token]
 *      → B filled birth info → web tagged DDL token → App Store
 *   2. After install, the app's DDL handshake (via @zhop/ddl-client) resolves
 *      the pending claim and navigates here. If the app was already installed,
 *      the link's token comes straight through the URL (no DDL needed).
 *   3. We load /api/bonds/invite/:token/info → render <InviteAcceptSheet>.
 *   4. On "Open" → POST /respond (if not yet done by web) → navigate to
 *      /(bonds)/[bondId] which plays RevealMoment + report.
 *
 * The route is presented as a modal so dismissing returns to the empty bonds
 * list; the bond is still accessible from there.
 */

import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import {
  InviteAcceptSheet,
  type RelationshipType,
  useBondInvitation,
} from '@zhop/scenario-kindred'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { KindredMoon } from '@/components/KindredMoon'
import { privacyPolicyUrl, type TranslationKey, useI18n } from '@/lib/i18n'

const RELATIONSHIP_I18N: Record<RelationshipType, TranslationKey> = {
  romantic: 'common.relationship.romantic',
  friend: 'common.relationship.friend',
  family: 'common.relationship.family',
  partner: 'common.relationship.partner',
  colleague: 'common.relationship.colleague',
  other: 'invite.accept.relationship.other',
}

/**
 * Map free-text relationshipLabel from API → enum used by InviteAcceptSheet.
 * Loose match — falls back to 'other' if no synonym hits.
 */
function inferRelationshipType(label: string): RelationshipType {
  const lower = label.toLowerCase()
  if (/恋人|伴侣|partner|romantic/.test(lower)) return 'romantic'
  if (/朋友|friend/.test(lower)) return 'friend'
  if (/家人|父母|兄弟|姐妹|family|parent|sibling/.test(lower)) return 'family'
  if (/合伙|business|cofounder/.test(lower)) return 'partner'
  if (/同事|上司|colleague|manager/.test(lower)) return 'colleague'
  return 'other'
}

export default function AcceptTokenScreen() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const router = useRouter()
  const { locale, t } = useI18n()
  const { invitation, isLoading, error, respond } = useBondInvitation(token)
  const [accepting, setAccepting] = useState<boolean>(false)
  const [respondError, setRespondError] = useState<string | null>(null)
  const [consentGiven, setConsentGiven] = useState(false)

  const toggleConsent = useCallback(() => setConsentGiven((v) => !v), [])
  const privacyUrl = useMemo(() => privacyPolicyUrl(locale), [locale])
  const relationshipType = useMemo(
    () => (invitation ? inferRelationshipType(invitation.relationshipLabel) : 'other'),
    [invitation]
  )

  // Auto-fail safe if we somehow land here without a token
  useEffect(() => {
    if (!token) router.replace('/(bonds)')
  }, [token, router])

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <KindredMoon size={72} />
        </View>
      </SafeAreaView>
    )
  }

  if (error || !invitation) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <View
          style={{
            flex: 1,
            padding: kindredSpacing.lg,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={[kindredType.body, { color: kindredDark.seal, textAlign: 'center' }]}>
            {error?.message ?? 'Invitation not found'}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  const handleOpen = async () => {
    if (!token) return
    setAccepting(true)
    setRespondError(null)
    try {
      // If invitation status is already 'accepted' (web already POSTed respond),
      // this will return 410 — treat as success.
      try {
        const result = await respond(token, { action: 'accept' })
        router.replace(`/(bonds)/${result.bondId}`)
        return
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (/already accepted/i.test(msg) || /410/.test(msg)) {
          // Fall through — assume bondId is on the invitation object; otherwise
          // the bonds list will pick it up next refetch.
          router.replace('/(bonds)')
          return
        }
        throw err
      }
    } catch (err) {
      setRespondError(err instanceof Error ? err.message : 'Failed')
      setAccepting(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' }} edges={['bottom']}>
      <View style={{ flex: 1 }} onTouchEnd={() => router.back()} />
      {accepting ? (
        <View
          style={{
            padding: kindredSpacing.xxl,
            alignItems: 'center',
            backgroundColor: kindredDark.bg,
          }}
        >
          <ActivityIndicator color={kindredDark.accent} />
        </View>
      ) : (
        <InviteAcceptSheet
          inviterName={invitation.inviterName}
          inviterNote={invitation.message ?? undefined}
          relationshipType={relationshipType}
          relationshipLabel={t(RELATIONSHIP_I18N[relationshipType])}
          copy={{
            prefix: t('invite.accept.prefix'),
            suffix: t('invite.accept.suffix'),
            relationshipPrefix: t('invite.accept.relationshipPrefix'),
            open: t('invite.accept.open'),
            later: t('invite.accept.later'),
          }}
          onOpen={handleOpen}
          onDismiss={() => router.replace('/(bonds)')}
          openDisabled={!consentGiven}
          consentSlot={
            <Pressable
              onPress={toggleConsent}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: kindredSpacing.sm,
                paddingHorizontal: kindredSpacing.md,
              }}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 3,
                  borderWidth: 1.5,
                  borderColor: consentGiven ? kindredDark.accent : kindredDark.borderStrong,
                  backgroundColor: consentGiven ? kindredDark.accent : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 2,
                }}
              >
                {consentGiven && (
                  <Text style={{ color: kindredDark.bg, fontSize: 12, fontWeight: '700' }}>
                    {'✓'}
                  </Text>
                )}
              </View>
              <Text style={[kindredType.caption, { color: kindredDark.textSecondary, flex: 1 }]}>
                {t('invite.accept.consent.lead')}
                {invitation.inviterName}
                {t('invite.accept.consent.trail')}
                <Text
                  style={{ color: kindredDark.accent, textDecorationLine: 'underline' }}
                  onPress={() => Linking.openURL(privacyUrl)}
                >
                  {t('invite.accept.consent.privacyPolicy')}
                </Text>
              </Text>
            </Pressable>
          }
        />
      )}
      {respondError && (
        <Text
          style={[
            kindredType.caption,
            {
              color: kindredDark.seal,
              padding: kindredSpacing.md,
              textAlign: 'center',
              backgroundColor: kindredDark.bg,
            },
          ]}
        >
          {respondError}
        </Text>
      )}
    </SafeAreaView>
  )
}
