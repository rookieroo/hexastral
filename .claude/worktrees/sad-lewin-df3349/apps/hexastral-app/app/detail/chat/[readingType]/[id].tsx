/**
 * AI 大师对话屏幕
 * Route: /detail/chat/[readingType]/[id]
 *
 * 展示与某次 reading 绑定的多轮对话。
 * Pro 用户无限追问，非 Pro 用户每条 50 ✦。
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Send } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { BRAND_PHASE, HexastralPlanetLogo } from '@/components/branding/HexastralPlanetLogo'
import { GuardBlockModal } from '@/components/modal/GuardBlockModal'
import { BackButton } from '@/components/ui/BackButton'
import { getIsPro, useAuth } from '@/lib/auth'
import { config } from '@/lib/config'
import { signRequest } from '@/lib/hmac'
import { useI18n } from '@/lib/i18n'
import { useIosPalette, useTheme } from '@/lib/theme'
import { randomUUID } from '@/lib/uuid'
import { usePaywall } from '@/lib/ux/useQuota'

// ── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface ChatHistory {
  conversationId: string | null
  messages: ChatMessage[]
}

interface SendMessageResult {
  conversationId: string
  reply: string
  isPro: boolean
  billingMode: 'free' | 'pool' | 'chat_credits'
  freeMessagesRemaining: number
}

// ── API helpers ─────────────────────────────────────────────────────────────

async function fetchChatHistory(
  userId: string,
  readingType: string,
  readingId: string
): Promise<ChatHistory> {
  const path = `/api/chat/${readingType}/${readingId}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${userId}`,
  }
  const sig = await signRequest({ body: '', userId, method: 'GET', path })
  if (sig) Object.assign(headers, sig)

  const res = await fetch(`${config.apiUrl}${path}`, { headers })
  if (!res.ok) throw new Error(`Chat history fetch failed: ${res.status}`)
  const json = (await res.json()) as ChatHistory
  return json
}

async function sendChatMessage(
  userId: string,
  readingType: string,
  readingId: string,
  message: string,
  requestId: string
): Promise<SendMessageResult> {
  const path = '/api/chat'
  const bodyObj = { readingType, readingId, message, requestId }
  const bodyStr = JSON.stringify(bodyObj)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${userId}`,
  }
  const sig = await signRequest({ body: bodyStr, userId, method: 'POST', path })
  if (sig) Object.assign(headers, sig)

  const res = await fetch(`${config.apiUrl}${path}`, {
    method: 'POST',
    headers,
    body: bodyStr,
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Send failed: ${res.status}`)
  }
  return res.json() as Promise<SendMessageResult>
}

// ── Screen ──────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { readingType, id } = useLocalSearchParams<{ readingType: string; id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const { t } = useI18n()
  const { colors, isDark } = useTheme()
  const queryClient = useQueryClient()
  const flatListRef = useRef<FlatList>(null)

  const [input, setInput] = useState('')
  const [billingMode, setBillingMode] = useState<SendMessageResult['billingMode'] | null>(null)
  const [freeRemaining, setFreeRemaining] = useState<number | null>(null)

  const { guard, dismissGuard, handleApiError, showPaywallModal } = usePaywall()

  const ios = useIosPalette()

  const userId = user?.id ?? null

  // Guest users cannot access chat — redirect back
  useEffect(() => {
    if (user?.id.startsWith('guest_')) {
      router.back()
    }
  }, [user, router])

  // ── Load history ──────────────────────────────────────────────────────────

  const historyQuery = useQuery<ChatHistory>({
    queryKey: ['chat-history', readingType, id],
    queryFn: () => fetchChatHistory(userId!, readingType!, id!),
    enabled: !!userId && !!readingType && !!id,
    staleTime: 30 * 1000,
  })

  const messages = historyQuery.data?.messages ?? []

  // ── Send message mutation ─────────────────────────────────────────────────

  const sendMutation = useMutation<SendMessageResult, Error, string>({
    mutationFn: (message: string) =>
      sendChatMessage(userId!, readingType!, id!, message, randomUUID()),
    onSuccess: (result) => {
      setInput('')
      setBillingMode(result.billingMode)
      setFreeRemaining(result.freeMessagesRemaining)
      // Optimistically add the reply to the query cache
      queryClient.setQueryData<ChatHistory>(['chat-history', readingType, id], (prev) => {
        if (!prev) return { conversationId: result.conversationId, messages: [] }
        return {
          ...prev,
          conversationId: result.conversationId,
          messages: [
            ...prev.messages,
            {
              id: randomUUID(),
              role: 'assistant',
              content: result.reply,
              createdAt: new Date().toISOString(),
            },
          ],
        }
      })
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    },
    onError: (err) => {
      if (handleApiError(err)) return
      if (err.message === 'insufficient_credits') {
        showPaywallModal()
      } else {
        Alert.alert(t('chat_error'))
      }
    },
  })

  const handleSend = (textOverride?: string) => {
    const trimmed = (textOverride ?? input).trim()
    if (!trimmed || sendMutation.isPending || !userId) return

    // Optimistically add user message
    queryClient.setQueryData<ChatHistory>(['chat-history', readingType, id], (prev) => {
      const base = prev ?? { conversationId: null, messages: [] }
      return {
        ...base,
        messages: [
          ...base.messages,
          {
            id: randomUUID(),
            role: 'user' as const,
            content: trimmed,
            createdAt: new Date().toISOString(),
          },
        ],
      }
    })
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50)

    sendMutation.mutate(trimmed)
  }

  const handleSuggestionTap = (
    key: 'chat_prompt_career' | 'chat_prompt_love' | 'chat_prompt_money' | 'chat_prompt_recent'
  ) => {
    handleSend(t(key))
  }

  const isPro = getIsPro(user)

  // Billing status label for header subtitle
  const billingLabel = (() => {
    if (billingMode === 'free' && freeRemaining !== null && freeRemaining <= 3) {
      return t('chat_free_remaining').replace('{remaining}', String(freeRemaining))
    }
    if (billingMode === 'pool' && freeRemaining !== null) {
      return t('chat_pool_remaining').replace('{remaining}', String(freeRemaining))
    }
    if (billingMode === 'chat_credits') return t('buy_credits')
    if (isPro) return t('chat_pro_unlimited')
    return null
  })()

  const showOverflowWarning = billingMode === 'chat_credits'

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: ios.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 56,
          paddingBottom: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: ios.separator,
          backgroundColor: ios.bg,
          gap: 12,
        }}
      >
        <BackButton />
        <HexastralPlanetLogo size={28} phase={BRAND_PHASE} strokeWidth={0.8} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '600', color: ios.text, letterSpacing: 0.3 }}>
            {t('chat_title')}
          </Text>
          {billingLabel ? (
            <Text style={{ fontSize: 11, color: ios.dim, marginTop: 2 }}>{billingLabel}</Text>
          ) : null}
        </View>
      </View>

      {/* Message list */}
      {historyQuery.isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={ios.text} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: 16,
            flexGrow: 1,
            justifyContent: messages.length === 0 ? 'center' : 'flex-end',
          }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingHorizontal: 24 }}>
              {/* Minimal hero — single greeting line, no logo restatement
                  (the planet logo is already in the header). */}
              <Text
                style={{
                  textAlign: 'center',
                  color: ios.text,
                  fontSize: 18,
                  lineHeight: 26,
                  fontWeight: '300',
                  letterSpacing: -0.2,
                }}
              >
                {t('chat_empty_hint')}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isUser = item.role === 'user'
            return (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    maxWidth: '80%',
                    backgroundColor: isUser ? ios.tint : ios.card,
                    borderRadius: 0,
                    borderBottomRightRadius: isUser ? 4 : 16,
                    borderBottomLeftRadius: isUser ? 16 : 4,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      lineHeight: 22,
                      color: isUser ? ios.tintFg : ios.text,
                    }}
                  >
                    {isUser
                      ? item.content
                      : item.content.split(/(\*\*[^*]+\*\*)/).map((part: string, i: number) =>
                          part.startsWith('**') && part.endsWith('**') ? (
                            <Text key={i} style={{ fontWeight: '600' }}>
                              {part.slice(2, -2)}
                            </Text>
                          ) : (
                            part
                          )
                        )}
                  </Text>
                </View>
              </View>
            )
          }}
        />
      )}

      {/* Overflow billing warning */}
      {showOverflowWarning && (
        <View
          style={{
            marginHorizontal: 12,
            marginBottom: 4,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: ios.highlightBrown,
            borderWidth: 0.5,
            borderColor: isDark ? '#7C2D12' : '#FED7AA',
          }}
        >
          <Text style={{ fontSize: 12, color: isDark ? '#FB923C' : '#C2410C' }}>
            {t('buy_credits')}
          </Text>
        </View>
      )}

      {/* Free / pool messages remaining counter */}
      {(billingMode === 'free' || billingMode === 'pool') &&
        freeRemaining !== null &&
        freeRemaining > 0 && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
            <Text style={{ fontSize: 11, color: ios.secondary }}>
              {billingMode === 'free'
                ? t('chat_free_remaining').replace('{remaining}', String(freeRemaining))
                : t('chat_pool_remaining').replace('{remaining}', String(freeRemaining))}
            </Text>
          </View>
        )}

      {/* Typing indicator */}
      {sendMutation.isPending && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <View
            style={{
              backgroundColor: ios.card,
              borderRadius: 0,
              borderBottomLeftRadius: 4,
              paddingHorizontal: 14,
              paddingVertical: 10,
              alignSelf: 'flex-start',
            }}
          >
            <Text style={{ fontSize: 13, color: ios.secondary }}>{t('chat_loading')}</Text>
          </View>
        </View>
      )}

      {/* Quick-start suggestions — horizontal scrollable pill row above the input.
          Visible only when no messages yet; matches DeepSeek-style mobile pattern
          where suggestions sit close to the keyboard rather than as a vertical wall. */}
      {messages.length === 0 && !sendMutation.isPending ? (
        <View style={{ borderTopWidth: 0.5, borderTopColor: ios.separator }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}
            style={{ flexGrow: 0 }}
          >
            {(
              [
                'chat_prompt_career',
                'chat_prompt_love',
                'chat_prompt_money',
                'chat_prompt_recent',
              ] as const
            ).map((key) => (
              <Pressable
                key={key}
                onPress={() => handleSuggestionTap(key)}
                style={({ pressed }) => ({
                  borderWidth: 0.5,
                  borderColor: ios.separator,
                  backgroundColor: pressed ? ios.separator : ios.card,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                })}
              >
                <Text style={{ fontSize: 13, color: ios.text, fontWeight: '400' }}>{t(key)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Input bar — DeepSeek-inspired: integrated pill container with the
          send button anchored at the right. Larger touch target, gentler
          border. Empty state shows a muted send glyph (transparent + dim);
          filled state flips to filled tint + contrast foreground. */}
      <View
        style={{
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: 28,
          backgroundColor: ios.bg,
          borderTopWidth: messages.length === 0 && !sendMutation.isPending ? 0 : 0.5,
          borderTopColor: ios.separator,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: ios.card,
            borderWidth: 0.5,
            borderColor: input.trim() ? ios.text : ios.separator,
            borderRadius: 24,
            paddingLeft: 18,
            paddingRight: 6,
            paddingVertical: 6,
            gap: 6,
          }}
        >
          <TextInput
            style={{
              flex: 1,
              minHeight: 36,
              maxHeight: 140,
              paddingTop: 8,
              paddingBottom: 8,
              fontSize: 15,
              lineHeight: 21,
              color: ios.text,
              textAlignVertical: 'center',
            }}
            placeholder={t('chat_placeholder')}
            placeholderTextColor={ios.secondary}
            value={input}
            onChangeText={setInput}
            multiline
            returnKeyType='default'
            blurOnSubmit={false}
          />
          <Pressable
            onPress={() => handleSend()}
            disabled={!input.trim() || sendMutation.isPending}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: input.trim() && !sendMutation.isPending ? ios.tint : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
              alignSelf: 'flex-end',
            })}
          >
            <Send
              size={18}
              strokeWidth={2}
            />
          </Pressable>
        </View>
      </View>

      {/* Modals */}
      <GuardBlockModal visible={!!guard} guardKey={guard?.guardKey} onDismiss={dismissGuard} />
    </KeyboardAvoidingView>
  )
}
