/**
 * Yuun personal-reading chat — 划词 AI follow-up over the user's own 八字紫微
 * 命书 (the Yuun side of the Yuel/Yuun split; mirrors Yuel's (reading)/chat.tsx).
 *
 * Pushed from /reading with:
 *   - `slug`  — the report chapter ('ch1_personality' / 'ch4_timeline' / a Pro
 *               chapter slug)
 *   - `quote` — optional long-pressed paragraph; pre-fills the input as a quoted
 *               draft (never auto-sent)
 *
 * Server contract: readingType 'report' with readingId `${userId}-${slug}` — the
 * chat context builder loads that chapter as grounding, and the quoted passage
 * rides inside the user's message. lib/chat.ts sends `X-Target-App: auspice`, so
 * the capability resolver gates this under auspice_pro (not fate_pro). Identity
 * comes from the portfolio session (getPortfolioUserId).
 */

import { ReadingChatScreen, type ReadingChatStrings, useTheme } from '@zhop/core-ui'
import { getPortfolioUserId } from '@zhop/satellite-runtime'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { AuspicePaywallSheet } from '@/components/AuspicePaywallSheet'
import { fetchChatHistory, sendChatMessage } from '@/lib/chat'
import { useStrings } from '@/lib/i18n-context'

/** Quoted-draft cap — keeps a long paragraph from flooding the input. */
const QUOTE_MAX_CHARS = 140

export default function ReadingChatRoute() {
  const { slug, quote, title } = useLocalSearchParams<{
    slug: string
    quote?: string
    title?: string
  }>()
  const router = useRouter()
  const { colors } = useTheme()
  const { t } = useStrings()

  const [userId, setUserId] = useState<string | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)
  useEffect(() => {
    getPortfolioUserId()
      .then(setUserId)
      .catch(() => setUserId(null))
  }, [])

  const copy = useMemo<ReadingChatStrings>(
    () => ({
      title: t.readingChat.title,
      emptyHint: t.readingChat.empty,
      placeholder: t.readingChat.placeholder,
      loading: t.readingChat.loading,
      errorGeneric: t.readingChat.error,
      proUnlimited: t.readingChat.proUnlimited,
      buyCredits: t.readingChat.buyCredits,
      freeRemaining: t.readingChat.freeRemaining,
      poolRemaining: t.readingChat.poolRemaining,
      suggestions: [t.readingChat.suggest1, t.readingChat.suggest2, t.readingChat.suggest3],
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
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />
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
        borderBottomColor: colors.separator,
        backgroundColor: colors.bg,
      }}
    >
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/reading'))}
        hitSlop={12}
        accessibilityRole='button'
      >
        <ChevronLeft color={colors.text} size={24} strokeWidth={1.2} />
      </Pressable>
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }} numberOfLines={1}>
        {title || copy.title}
      </Text>
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ReadingChatScreen
        readingType='report'
        readingId={readingId}
        fetchHistory={() => fetchChatHistory(userId, 'report', readingId)}
        sendMessage={(msg, requestId) =>
          sendChatMessage(userId, 'report', readingId, msg, requestId)
        }
        onPaywallRequest={() => setPaywallOpen(true)}
        copy={copy}
        header={header}
        initialDraft={initialDraft}
      />
      <AuspicePaywallSheet visible={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </View>
  )
}
