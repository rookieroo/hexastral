/**
 * Bond synastry chat — Pro AI follow-up over a synastry reading.
 *
 * Thin wrapper over core-ui `<ReadingChatScreen>`: provides Kindred's HMAC API
 * adapter (lib/chat), branded header, paywall route, and i18n strings.
 *
 * Pushed from (bonds)/[id] with `id` = the pairReadings id (`hehunReadingId`),
 * which is what the server's `'pair'` reading-context query expects.
 */

import { ReadingChatScreen, type ReadingChatStrings } from '@zhop/core-ui'
import { kindredDark, kindredType } from '@zhop/hexastral-tokens/kindred'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useAuth } from '@/lib/auth'
import { type ChatTone, clearChatHistory, fetchChatHistory, sendChatMessage } from '@/lib/chat'
import { useI18n } from '@/lib/i18n'

const TONES: ChatTone[] = ['warm', 'balanced', 'direct']

/** Quoted-draft cap — keeps a long passage from flooding the input. */
const QUOTE_MAX_CHARS = 140

export default function BondChatScreen() {
  const { id, title, quote } = useLocalSearchParams<{
    id: string
    title?: string
    quote?: string
  }>()
  const router = useRouter()
  const { userId } = useAuth()
  const { t } = useI18n()
  // Reply-tone steer (chat config). Default 'balanced' = the unchanged voice.
  const [tone, setTone] = useState<ChatTone>('balanced')

  const copy = useMemo<ReadingChatStrings>(
    () => ({
      title: t('chat.title'),
      emptyHint: t('chat.empty'),
      placeholder: t('chat.placeholder'),
      loading: t('chat.loading'),
      errorGeneric: t('chat.error'),
      proUnlimited: t('chat.proUnlimited'),
      buyCredits: t('chat.buyCredits'),
      freeRemaining: t('chat.freeRemaining'),
      poolRemaining: t('chat.poolRemaining'),
      suggestions: [t('chat.suggest1'), t('chat.suggest2'), t('chat.suggest3')],
      newConversation: t('chat.newConversation'),
    }),
    [t]
  )

  // 划词 → chat: a long-pressed sentence pre-fills the input as a quoted draft
  // the user completes with their question (never auto-sent). Mirrors the solo
  // reader's (reading)/chat.tsx pattern.
  const initialDraft = useMemo(() => {
    if (!quote) return undefined
    const trimmed = quote.length > QUOTE_MAX_CHARS ? `${quote.slice(0, QUOTE_MAX_CHARS)}…` : quote
    return `「${trimmed}」\n`
  }, [quote])

  if (!userId || !id) {
    return <View style={{ flex: 1, backgroundColor: kindredDark.bg }} />
  }

  const header = (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: 56,
        paddingBottom: 10,
        gap: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: '#00000014',
        backgroundColor: kindredDark.bg,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft color={kindredDark.text} size={24} strokeWidth={1.2} />
        </Pressable>
        <Text
          style={[kindredType.heading, { color: kindredDark.text, fontSize: 17, flex: 1 }]}
          numberOfLines={1}
        >
          {title || copy.title}
        </Text>
      </View>
      {/* Reply-tone steer — 3 chips. 'balanced' is the unchanged default voice. */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {TONES.map((tn) => {
          const on = tn === tone
          return (
            <Pressable
              key={tn}
              onPress={() => setTone(tn)}
              accessibilityRole='button'
              accessibilityState={{ selected: on }}
              style={{
                paddingVertical: 4,
                paddingHorizontal: 11,
                borderRadius: 999,
                borderWidth: 0.5,
                borderColor: on ? kindredDark.accent : kindredDark.border,
                backgroundColor: on ? `${kindredDark.accent}22` : 'transparent',
              }}
            >
              <Text
                style={[
                  kindredType.caption,
                  { color: on ? kindredDark.accent : kindredDark.textMuted, fontSize: 12 },
                ]}
              >
                {t(`chat.tone.${tn}`)}
              </Text>
            </Pressable>
          )
        })}
      </View>
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
          borderBottomColor: '#00000014',
          backgroundColor: kindredDark.bg,
        }}
      >
        <Text style={[kindredType.caption, { color: kindredDark.textMuted, fontSize: 11, lineHeight: 16 }]}>
          {t('chat.legalDisclaimer')}
        </Text>
      </View>
    </>
  )

  return (
    <ReadingChatScreen
      readingType='pair'
      readingId={id}
      fetchHistory={() => fetchChatHistory(userId, 'pair', id)}
      sendMessage={(msg, requestId) => sendChatMessage(userId, 'pair', id, msg, requestId, tone)}
      onNewConversation={() => clearChatHistory(userId, 'pair', id)}
      onPaywallRequest={() =>
        router.push({ pathname: '/(commerce)/paywall', params: { reason: 'chat' } })
      }
      copy={copy}
      header={headerWithDisclaimer}
      initialDraft={initialDraft}
    />
  )
}
