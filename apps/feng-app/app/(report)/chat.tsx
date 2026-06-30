/**
 * Report chat — Pro AI follow-up over a feng-shui report.
 *
 * Thin wrapper over core-ui `<ReadingChatScreen>`: provides Fēng's HMAC API
 * adapter (lib/chat), branded header, and i18n strings. Pushed from
 * (report)/[siteId] with `reportId` = the fengReports id, which the server's
 * `'feng'` reading-context query expects.
 *
 * Fēng has no paywall screen yet, so a non-Pro 402 surfaces a Pro notice rather
 * than routing to a purchase flow. The server gate is the source of truth.
 */

import { ReadingChatScreen, type ReadingChatStrings, useTheme } from '@zhop/core-ui'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { useAuth } from '@/lib/auth'
import { fetchChatHistory, reportChatMessage, sendChatMessage } from '@/lib/chat'
import { resolveLocale, useStrings } from '@/lib/i18n'

export default function ReportChatScreen() {
  const { reportId, title } = useLocalSearchParams<{ reportId: string; title?: string }>()
  const router = useRouter()
  const { userId } = useAuth()
  const t = useStrings(resolveLocale())
  const { colors } = useTheme()

  const copy = useMemo<ReadingChatStrings>(
    () => ({
      title: t.chat_title,
      emptyHint: t.chat_empty,
      placeholder: t.chat_placeholder,
      loading: t.chat_loading,
      errorGeneric: t.chat_error,
      proUnlimited: t.chat_pro_unlimited,
      buyCredits: t.chat_buy_credits,
      freeRemaining: t.chat_free_remaining,
      poolRemaining: t.chat_pool_remaining,
      suggestions: [t.chat_suggest_1, t.chat_suggest_2, t.chat_suggest_3],
      report: t.chat_report,
      reportConfirmTitle: t.chat_report_confirm_title,
      reportConfirmBody: t.chat_report_confirm_body,
      reportDone: t.chat_report_done,
    }),
    [t]
  )

  if (!userId || !reportId) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />
  }

  const header = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 56,
        paddingBottom: 12,
        gap: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.separator,
        backgroundColor: colors.bg,
      }}
    >
      <Pressable onPress={() => router.back()} hitSlop={12}>
        <Text style={{ color: colors.accent, fontSize: 22 }}>‹</Text>
      </Pressable>
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }} numberOfLines={1}>
        {title || copy.title}
      </Text>
    </View>
  )

  return (
    <ReadingChatScreen
      readingType='feng'
      readingId={reportId}
      fetchHistory={() => fetchChatHistory(userId, 'feng', reportId)}
      sendMessage={(msg, requestId) => sendChatMessage(userId, 'feng', reportId, msg, requestId)}
      onReportMessage={(messageId) => reportChatMessage(userId, messageId)}
      onPaywallRequest={() => Alert.alert(t.chat_pro_required)}
      copy={copy}
      header={header}
    />
  )
}
