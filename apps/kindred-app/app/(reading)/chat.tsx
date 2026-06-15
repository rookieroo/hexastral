/**
 * Solo reading chat — 划词 AI follow-up over the user's own 八字紫微 report
 * (ADR-0021 K3).
 *
 * Pushed from the reading overlay with:
 *   - `slug`  — the report chapter ('ch1_personality' / 'ch4_timeline')
 *   - `quote` — optional long-pressed paragraph; pre-fills the input as a
 *               quoted draft (never auto-sent)
 *
 * Server contract: readingType 'report' with readingId `${userId}-${slug}` —
 * the chat context builder loads that chapter's content as grounding, and the
 * quoted passage rides inside the user's message. lib/chat.ts sends
 * X-Target-App: kindred so the capability resolver gates this under
 * kindred_pro (not fate_pro).
 */

import { ReadingChatScreen, type ReadingChatStrings } from '@zhop/core-ui'
import { kindredDark, kindredType } from '@zhop/hexastral-tokens/kindred'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useAuth } from '@/lib/auth'
import { fetchChatHistory, sendChatMessage } from '@/lib/chat'
import { useI18n } from '@/lib/i18n'

/** Quoted-draft cap — keeps a long paragraph from flooding the input. */
const QUOTE_MAX_CHARS = 140

export default function ReadingChatRoute() {
  const { slug, quote, title } = useLocalSearchParams<{
    slug: string
    quote?: string
    title?: string
  }>()
  const router = useRouter()
  const { userId } = useAuth()
  const { t } = useI18n()

  const copy = useMemo<ReadingChatStrings>(
    () => ({
      // Personal-reading framing — the synastry chat (couple-framed `chat.*`) lives
      // on /(bonds)/chat. The functional strings stay shared; only the framing
      // (title / empty / suggestions) is "about your own chart", not "you two".
      title: t('readingChat.title'),
      emptyHint: t('readingChat.empty'),
      placeholder: t('chat.placeholder'),
      loading: t('chat.loading'),
      errorGeneric: t('chat.error'),
      proUnlimited: t('chat.proUnlimited'),
      buyCredits: t('chat.buyCredits'),
      freeRemaining: t('chat.freeRemaining'),
      poolRemaining: t('chat.poolRemaining'),
      suggestions: [
        t('readingChat.suggest1'),
        t('readingChat.suggest2'),
        t('readingChat.suggest3'),
      ],
    }),
    [t]
  )

  // Quoted paragraph → pre-filled draft the user completes with their question.
  const initialDraft = useMemo(() => {
    if (!quote) return undefined
    const trimmed = quote.length > QUOTE_MAX_CHARS ? `${quote.slice(0, QUOTE_MAX_CHARS)}…` : quote
    return `「${trimmed}」\n`
  }, [quote])

  if (!userId || !slug) {
    return <View style={{ flex: 1, backgroundColor: kindredDark.bg }} />
  }

  // Server contract for 'report' readings: readingId = `${ownerUserId}-${chapterSlug}`.
  const readingId = `${userId}-${slug}`

  const header = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 56,
        paddingBottom: 12,
        gap: 8,
        borderBottomWidth: 0.5,
        borderBottomColor: '#00000014',
        backgroundColor: kindredDark.bg,
      }}
    >
      <Pressable onPress={() => router.back()} hitSlop={12}>
        <ChevronLeft color={kindredDark.text} size={24} strokeWidth={1.2} />
      </Pressable>
      <Text
        style={[kindredType.heading, { color: kindredDark.text, fontSize: 17 }]}
        numberOfLines={1}
      >
        {title || copy.title}
      </Text>
    </View>
  )

  return (
    <ReadingChatScreen
      readingType='report'
      readingId={readingId}
      fetchHistory={() => fetchChatHistory(userId, 'report', readingId)}
      sendMessage={(msg, requestId) => sendChatMessage(userId, 'report', readingId, msg, requestId)}
      onPaywallRequest={() =>
        router.push({ pathname: '/(commerce)/paywall', params: { reason: 'chat' } })
      }
      copy={copy}
      header={header}
      initialDraft={initialDraft}
    />
  )
}
