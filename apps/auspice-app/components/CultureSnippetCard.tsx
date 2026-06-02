/**
 * Home 今日文化 snippet — a 1-2 sentence summary of the day's (or upcoming) 节气 /
 * 节日. "Read more" + tap-through to `/festival/[id]` appear ONLY when a full
 * authored entry exists (`hasAuthoredBody`); otherwise the summary stands on its
 * own (no dead-end "coming soon" link). Per 2026-06 home feedback.
 */

import { useTheme } from '@zhop/core-ui'
import { ChevronRightIcon } from '@zhop/hexastral-icons/action'
import { type Href, useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'

import { CultureWikiLink } from '@/components/culture/CultureWikiLink'
import { getCultureEntryWikipediaUrl } from '@/lib/culture'
import type { CultureSnippet } from '@/lib/culture-preview'
import { useStrings } from '@/lib/i18n-context'

interface CultureSnippetCardProps {
  snippet: CultureSnippet
  /** When previewing the next 节气 (not a term/festival day): a "upcoming · {name}" hint. */
  upcomingTagline?: string
}

export function CultureSnippetCard({ snippet, upcomingTagline }: CultureSnippetCardProps) {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const router = useRouter()
  const wikiUrl = getCultureEntryWikipediaUrl(snippet.targetId, locale)

  const body = snippet.summary || snippet.excerpt || snippet.tagline || ''
  const canReadMore = snippet.hasAuthoredBody
  const goDetail = () => router.push(`/festival/${snippet.targetId}` as Href)

  const inner = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3 }}>
          {t.cultureSnippetTitle}
        </Text>
        {canReadMore ? <ChevronRightIcon size={16} color={colors.dim} strokeWidth={1.4} /> : null}
      </View>
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{snippet.title}</Text>
      {upcomingTagline ? (
        <Text style={{ color: colors.accent, fontSize: 13, lineHeight: 19 }}>
          {upcomingTagline}
        </Text>
      ) : null}
      {body ? (
        <Text style={{ color: colors.secondary, fontSize: 14, lineHeight: 21 }}>{body}</Text>
      ) : null}
      {canReadMore ? (
        <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600', letterSpacing: 0.5 }}>
          {t.cultureReadMore}
        </Text>
      ) : null}
    </>
  )

  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 0.5,
        borderColor: colors.separator,
        backgroundColor: colors.card,
        padding: spacing.lg,
        gap: spacing.sm,
      }}
    >
      {canReadMore ? (
        <Pressable
          onPress={goDetail}
          accessibilityRole='button'
          accessibilityLabel={`${snippet.title}, ${t.cultureReadMore}`}
          style={({ pressed }) => ({ gap: spacing.sm, opacity: pressed ? 0.7 : 1 })}
        >
          {inner}
        </Pressable>
      ) : (
        <View style={{ gap: spacing.sm }}>{inner}</View>
      )}
      {wikiUrl ? <CultureWikiLink url={wikiUrl} /> : null}
    </View>
  )
}
