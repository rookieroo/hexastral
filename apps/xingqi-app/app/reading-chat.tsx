/**
 * Xingqi reading chat — follow-up on a physiognomy portfolio reading.
 * Pro-only entry (oneshot report has no chat).
 */

import {
  ReadingChatScreen,
  type ReadingChatStrings,
  useChatSharePreview,
  useTheme,
} from '@zhop/core-ui'
import {
  getPortfolioUserId,
  hasEntitlement,
  useEntitlements,
} from '@zhop/satellite-runtime'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  draftFromQuote,
  fetchChatHistory,
  rateChatMessage,
  reportChatMessage,
  sendChatMessage,
} from '@/lib/chat'
import { resolveLocale } from '@/lib/i18n'
import { isCjkZh, isJa, isZhHant, pickUi } from '@/lib/locale-zh'
import { XINGQI_BRAND_URL, XINGQI_INSTALL_URL, xingqiShareCaption } from '@/lib/xingqiShare'

export default function XingqiReadingChatScreen() {
  const { readingId, quote } = useLocalSearchParams<{ readingId?: string; quote?: string }>()
  const router = useRouter()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const s = (hans: string, hant: string, en: string, ja?: string) =>
    pickUi(locale, hans, hant, en, ja)
  const [userId, setUserId] = useState<string | null>(null)
  const entitlements = useEntitlements()
  const isPro =
    hasEntitlement(entitlements, 'faceoracle_pro') || hasEntitlement(entitlements, 'universe_pro')

  useEffect(() => {
    void getPortfolioUserId().then(setUserId)
  }, [])

  useEffect(() => {
    if (!isPro) {
      router.replace('/(commerce)/paywall' as never)
    }
  }, [isPro, router])

  const copy = useMemo<ReadingChatStrings>(
    () => ({
      title: s(
        '追问本期形气',
        '追問本期形氣',
        'Ask about this reading',
        '今回の形気について質問'
      ),
      emptyHint: s(
        '就划词或章节提问。回答是文化研读，非命运判决。',
        '就劃詞或章節提問。回答是文化研讀，非命運判決。',
        'Ask about a quote or chapter. Cultural study — not fate.',
        '引用や章について質問できます。回答は文化研究であり、運命の判決ではありません。'
      ),
      placeholder: s('输入问题…', '輸入問題…', 'Ask…', '質問を入力…'),
      loading: s('思考中…', '思考中…', 'Thinking…', '考え中…'),
      errorGeneric: s(
        '发送失败，请重试',
        '發送失敗，請重試',
        'Could not send — try again',
        '送信に失敗しました。もう一度お試しください'
      ),
      proUnlimited: s('Pro 追问', 'Pro 追問', 'Pro chat', 'Pro 質問'),
      buyCredits: s('升级 Pro', '升級 Pro', 'Go Pro', 'Pro にアップグレード'),
      freeRemaining: s(
        '还剩 {remaining} 次免费追问',
        '還剩 {remaining} 次免費追問',
        '{remaining} free left',
        '無料質問 残り {remaining} 回'
      ),
      poolRemaining: s(
        '积分余额 {remaining}',
        '積分餘額 {remaining}',
        'Pool {remaining}',
        '残高 {remaining}'
      ),
      suggestions: isCjkZh(locale)
        ? isZhHant(locale)
          ? ['這句話的形氣依據是什麼？', '本期宜留意什麼窗口？', '和八字對照怎麼讀？']
          : ['这句话的形气依据是什么？', '本期宜留意什么窗口？', '和八字对照怎么读？']
        : isJa(locale)
          ? [
              'この文の形気の根拠は？',
              '今回留意すべき窓は？',
              '八字との対照はどう読む？',
            ]
          : [
              'What is the form basis?',
              'What windows are worth noting?',
              'How does this contrast with BaZi?',
            ],
      report: s('举报', '舉報', 'Report', '報告'),
      reportConfirmTitle: s(
        '举报此回复？',
        '舉報此回覆？',
        'Report this reply?',
        'この返信を報告しますか？'
      ),
      reportConfirmBody: s(
        '我们会审核不当内容。',
        '我們會審核不當內容。',
        'We will review objectionable content.',
        '不適切な内容を確認します。'
      ),
      reportDone: s('已提交', '已提交', 'Submitted', '送信しました'),
      aiDisclaimer: s(
        '本回答由 AI 生成，内容仅供参考，请仔细甄别。',
        '本回答由 AI 生成，內容僅供參考，請仔細甄別。',
        'AI-generated for reference only — please use your judgment.',
        'AI が生成した回答です。参考情報としてご利用ください。'
      ),
      copyAction: s('复制', '複製', 'Copy', 'コピー'),
      copied: s('已复制', '已複製', 'Copied', 'コピーしました'),
      like: s('有用', '有用', 'Like', '役に立った'),
      dislike: s('没用', '沒用', 'Dislike', '役に立たなかった'),
      share: s('分享', '分享', 'Share', '共有'),
      dislikeNotAccurate: s(
        '内容不准',
        '內容不準',
        'Not accurate',
        '内容が不正確'
      ),
      dislikeReport: s(
        '举报不当内容',
        '舉報不當內容',
        'Report objectionable content',
        '不適切な内容を報告'
      ),
      shareSelectHint: s(
        '选择要放入分享图的消息',
        '選擇要放入分享圖的訊息',
        'Select messages for the share image',
        '共有画像に含めるメッセージを選択'
      ),
      generateShareImage: s(
        '生成分享图',
        '生成分享圖',
        'Generate image',
        '共有画像を作成'
      ),
      cancel: s('取消', '取消', 'Cancel', 'キャンセル'),
    }),
    [locale]
  )

  const { openShare, enableShare, shareModal } = useChatSharePreview({
    brandName: 'Syel',
    brandUrl: XINGQI_BRAND_URL,
    installUrl: XINGQI_INSTALL_URL,
    logoSource: require('../assets/icon.png'),
    userBubbleColor: '#2F6F5E',
    locale,
    caption: (lead) => xingqiShareCaption(locale, lead),
    labels: {
      cancel: copy.cancel ?? 'Cancel',
      generateShareImage: copy.generateShareImage ?? 'Generate image',
      share: copy.share ?? 'Share',
    },
  })

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

  if (!isPro || !readingId || !userId) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ReadingChatScreen
        readingType='physiognomy'
        readingId={readingId}
        fetchHistory={() => fetchChatHistory(readingId)}
        sendMessage={(msg, requestId) => sendChatMessage(readingId, msg, requestId, locale)}
        onReportMessage={(messageId) => reportChatMessage(messageId)}
        onRateMessage={(messageId, feedback) => rateChatMessage(messageId, feedback)}
        enableShare={enableShare}
        onShareMessages={openShare}
        onPaywallRequest={() => router.push('/(commerce)/paywall' as never)}
        copy={copy}
        header={header}
        initialDraft={initialDraft || undefined}
      />
      {shareModal}
    </View>
  )
}
