/**
 * Report chat — bundled with a purchased feng report (unlimited follow-ups).
 */

import { ReadingChatScreen, type ReadingChatStrings, useTheme } from '@zhop/core-ui'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { useAuth } from '@/lib/auth'
import { fetchChatHistory, reportChatMessage, sendChatMessage } from '@/lib/chat'
import { resolveLocale, useStrings } from '@/lib/i18n'
import { fetchFengReportChatAccess } from '@/lib/purchase'

export default function ReportChatScreen() {
  const { reportId, siteId, title, quote } = useLocalSearchParams<{
    reportId: string
    siteId?: string
    title?: string
    quote?: string
  }>()
  const router = useRouter()
  const { userId } = useAuth()
  const t = useStrings(resolveLocale())
  const { colors } = useTheme()
  const [chatUnlocked, setChatUnlocked] = useState<boolean | null>(null)

  useEffect(() => {
    if (!userId || !reportId) return
    let alive = true
    fetchFengReportChatAccess(userId, reportId)
      .then((access) => {
        if (alive) setChatUnlocked(access.chatUnlocked)
      })
      .catch(() => {
        if (alive) setChatUnlocked(false)
      })
    return () => {
      alive = false
    }
  }, [userId, reportId])

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

  const headerWithDisclaimer = (
    <>
      {header}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.separator,
          backgroundColor: colors.bg,
        }}
      >
        <Text style={{ color: colors.dim, fontSize: 11, lineHeight: 16 }}>
          {t.chat_legal_disclaimer}
        </Text>
      </View>
    </>
  )

  if (chatUnlocked === null) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        {header}
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      </View>
    )
  }

  if (!chatUnlocked) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {header}
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 16 }}>
          <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24, textAlign: 'center' }}>
            {t.chat_pro_required}
          </Text>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/paywall',
                params: { intent: 'chat', siteId: siteId ?? '' },
              })
            }
            style={{
              backgroundColor: colors.accent,
              paddingVertical: 14,
              alignItems: 'center',
              borderWidth: 0.5,
              borderColor: colors.separator,
            }}
          >
            <Text style={{ color: colors.bg, fontWeight: '700' }}>{t.paywall_cta}</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <ReadingChatScreen
      readingType='feng'
      readingId={reportId}
      fetchHistory={() => fetchChatHistory(userId, 'feng', reportId)}
      sendMessage={(msg, requestId) => sendChatMessage(userId, 'feng', reportId, msg, requestId)}
      onReportMessage={(messageId) => reportChatMessage(userId, messageId)}
      onPaywallRequest={() =>
        router.push({ pathname: '/paywall', params: { intent: 'chat', siteId: siteId ?? '' } })
      }
      copy={copy}
      header={headerWithDisclaimer}
      initialDraft={quote || undefined}
    />
  )
}
