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
import { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useAuth } from '@/lib/auth'
import { fetchChatHistory, sendChatMessage } from '@/lib/chat'
import { useI18n } from '@/lib/i18n'

export default function BondChatScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>()
  const router = useRouter()
  const { userId } = useAuth()
  const { t } = useI18n()

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
    }),
    [t]
  )

  if (!userId || !id) {
    return <View style={{ flex: 1, backgroundColor: kindredDark.bg }} />
  }

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
      readingType='pair'
      readingId={id}
      fetchHistory={() => fetchChatHistory(userId, 'pair', id)}
      sendMessage={(msg, requestId) => sendChatMessage(userId, 'pair', id, msg, requestId)}
      onPaywallRequest={() =>
        router.push({ pathname: '/(commerce)/paywall', params: { reason: 'chat' } })
      }
      copy={copy}
      header={header}
    />
  )
}
