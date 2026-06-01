/**
 * /accept/[token] — B-user entry from email deep link / DDL claim.
 *
 * Flow:
 *   1. B clicked the link in the invitation email → web /yuan/invite/[token]
 *      → B filled birth info → web tagged DDL token → App Store
 *   2. After install, the app's DDL handshake (via @zhop/ddl-client) resolves
 *      the pending claim and navigates here.
 *   3. We load /api/bonds/invite/:token/info → render <InviteAcceptSheet>.
 *   4. On "Open" → POST /respond (if not yet done by web) → navigate to
 *      /(bonds)/[bondId] which plays RevealMoment + report.
 *
 * The route is presented as a modal so dismissing returns to the empty bonds
 * list; the bond is still accessible from there.
 */

import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  InviteAcceptSheet,
  YuanSeal,
  useBondInvitation,
  type RelationshipType,
} from '@zhop/scenario-yuan'
import { yuanLight, yuanType, yuanSpacing } from '@zhop/hexastral-tokens/yuan'

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
  const { invitation, isLoading, error, respond } = useBondInvitation(token)
  const [accepting, setAccepting] = useState<boolean>(false)
  const [respondError, setRespondError] = useState<string | null>(null)

  // Auto-fail safe if we somehow land here without a token
  useEffect(() => {
    if (!token) router.replace('/(bonds)')
  }, [token, router])

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: yuanLight.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <YuanSeal mode="breathing" size={72} />
        </View>
      </SafeAreaView>
    )
  }

  if (error || !invitation) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: yuanLight.bg }}>
        <View style={{ flex: 1, padding: yuanSpacing.lg, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={[yuanType.body, { color: yuanLight.seal, textAlign: 'center' }]}>
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
        <View style={{ padding: yuanSpacing.xxl, alignItems: 'center', backgroundColor: yuanLight.bg }}>
          <ActivityIndicator color={yuanLight.accent} />
        </View>
      ) : (
        <InviteAcceptSheet
          inviterName={invitation.inviterName}
          inviterNote={invitation.message ?? undefined}
          relationshipType={inferRelationshipType(invitation.relationshipLabel)}
          onOpen={handleOpen}
          onDismiss={() => router.replace('/(bonds)')}
        />
      )}
      {respondError && (
        <Text
          style={[
            yuanType.caption,
            { color: yuanLight.seal, padding: yuanSpacing.md, textAlign: 'center', backgroundColor: yuanLight.bg },
          ]}
        >
          {respondError}
        </Text>
      )}
    </SafeAreaView>
  )
}
