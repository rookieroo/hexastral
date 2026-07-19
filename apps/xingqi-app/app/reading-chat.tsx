/**
 * Xingqi reading chat — follow-up on a physiognomy portfolio reading.
 */

import { ReadingChatScreen, type ReadingChatStrings, useTheme } from '@zhop/core-ui'
import { getPortfolioUserId } from '@zhop/satellite-runtime'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { draftFromQuote, fetchChatHistory, reportChatMessage, sendChatMessage } from '@/lib/chat'
import { resolveLocale } from '@/lib/i18n'

export default function XingqiReadingChatScreen() {
  const { readingId, quote } = useLocalSearchParams<{ readingId?: string; quote?: string }>()
  const router = useRouter()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const zh = locale.startsWith('zh')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    void getPortfolioUserId().then(setUserId)
  }, [])

  const copy = useMemo<ReadingChatStrings>(
    () => ({
      title: zh ? '追问本期形气' : 'Ask about this reading',
      emptyHint: zh
        ? '就划词或章节提问。回答是文化研读，非命运判决。'
        : 'Ask about a quote or chapter. Cultural study — not fate.',
      placeholder: zh ? '输入问题…' : 'Ask…',
      loading: zh ? '思考中…' : 'Thinking…',
      errorGeneric: zh ? '发送失败，请重试' : 'Could not send — try again',
      proUnlimited: zh ? 'Pro 追问' : 'Pro chat',
      buyCredits: zh ? '升级 Pro' : 'Go Pro',
      freeRemaining: zh ? '还剩 {remaining} 次免费追问' : '{remaining} free left',
      poolRemaining: zh ? '积分余额 {remaining}' : 'Pool {remaining}',
      suggestions: zh
        ? ['这句话的形气依据是什么？', '本期宜留意什么窗口？', '和八字对照怎么读？']
        : ['What is the form basis?', 'What windows are worth noting?', 'How does this contrast with BaZi?'],
      report: zh ? '举报' : 'Report',
      reportConfirmTitle: zh ? '举报此回复？' : 'Report this reply?',
      reportConfirmBody: zh ? '我们会审核不当内容。' : 'We will review objectionable content.',
      reportDone: zh ? '已提交' : 'Submitted',
    }),
    [zh]
  )

  const initialDraft = draftFromQuote(
    typeof quote === 'string' ? decodeURIComponent(quote) : undefined
  )

  const header = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: insets.top,
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
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{copy.title}</Text>
    </View>
  )

  if (!readingId || !userId) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ReadingChatScreen
        readingType='physiognomy'
        readingId={readingId}
        fetchHistory={() => fetchChatHistory(readingId)}
        sendMessage={(msg, requestId) => sendChatMessage(readingId, msg, requestId)}
        onReportMessage={(messageId) => reportChatMessage(messageId)}
        onPaywallRequest={() => router.push('/(commerce)/paywall' as never)}
        copy={copy}
        header={header}
        initialDraft={initialDraft || undefined}
      />
    </View>
  )
}
