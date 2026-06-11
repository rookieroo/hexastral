/**
 * ReadingChatScreen — shared AI follow-up chat shell (Phase J · J.1.5).
 *
 * Lifted from `apps/hexastral-app/app/detail/chat/[readingType]/[id].tsx` so
 * every reading-producing satellite (feng, oracle, palmface/faceoracle,
 * numerology/meihua, synastry/yuan) can drop the same conversation surface
 * over its own backend endpoint without re-implementing message list /
 * keyboard avoidance / billing UX.
 *
 * Behavior:
 *   1. On mount, call `fetchHistory()` once to hydrate the message list.
 *   2. User types → optimistic local append → call `sendMessage(text, requestId)`.
 *   3. Show typing indicator while pending; surface error / paywall via callbacks.
 *   4. Suggestions row (caller-provided strings) renders only when empty.
 *
 * Adapter pattern: caller owns API + auth + paywall; component is presentational
 * over the conversation. No expo-router / no HMAC / no React Query dep.
 *
 * Header is fully optional — caller passes `header` (e.g. a back button +
 * brand logo). When omitted, only the message list + input bar render.
 */

import { Send, SquarePen } from 'lucide-react-native'
import { type ReactNode, useEffect, useRef, useState } from 'react'
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
import { useTheme } from '../theme/provider'

// ── Types ──────────────────────────────────────────────────────────────────

// 'subscription' = unlimited within the app (abuse-capped server-side); the metered
// 'pool'/'chat_credits' modes survive only on the legacy omnibus path (ADR-0013 §3).
export type ReadingChatBillingMode = 'free' | 'subscription' | 'pool' | 'chat_credits'

export interface ReadingChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface ReadingChatHistory {
  conversationId: string | null
  messages: ReadingChatMessage[]
}

export interface ReadingChatSendResult {
  conversationId: string
  reply: string
  isPro: boolean
  billingMode: ReadingChatBillingMode
  /** null = unlimited (subscription / legacy pool) — not a per-reading free-taste count. */
  freeMessagesRemaining: number | null
}

/**
 * Localized strings. Placeholders `{remaining}` are replaced verbatim.
 */
export interface ReadingChatStrings {
  /** Header title (defaults if no header provided) */
  title: string
  /** Bubble shown when message list is empty */
  emptyHint: string
  /** Placeholder inside the input field */
  placeholder: string
  /** Streaming indicator text */
  loading: string
  /** Generic send failure (non-paywall) */
  errorGeneric: string
  /** Header subtitle when user is Pro */
  proUnlimited: string
  /** Header subtitle / chip when overflow billing kicks in (chat_credits mode) */
  buyCredits: string
  /** "Free messages left: {remaining}" — must contain `{remaining}` */
  freeRemaining: string
  /** "Pool credits left: {remaining}" — must contain `{remaining}` */
  poolRemaining: string
  /** Optional quick-start prompt strings (already translated) */
  suggestions?: ReadonlyArray<string>
  /** "New conversation" action label (shown only when `onNewConversation` is set). */
  newConversation?: string
}

export interface ReadingChatScreenProps {
  /** Reading discriminator + id; passed straight to your adapters. */
  readingType: string
  readingId: string

  // ── Adapters ─────────────────────────────────────────────────────────────
  /** Load existing conversation. Called once on mount. */
  fetchHistory: () => Promise<ReadingChatHistory>
  /** Send a message and resolve with the AI reply + billing snapshot. */
  sendMessage: (message: string, requestId: string) => Promise<ReadingChatSendResult>

  // ── Behavior ─────────────────────────────────────────────────────────────
  /** Called when sendMessage throws `insufficient_credits` (or equivalent). */
  onPaywallRequest: () => void
  /**
   * Optional: intercept errors before generic Alert. Return `true` to indicate
   * the caller fully handled the error (no further UI from this component).
   */
  onError?: (err: unknown) => boolean

  // ── Identity & surface ───────────────────────────────────────────────────
  copy: ReadingChatStrings
  /** Optional custom header (back button + logo + title). Caller-owned. */
  header?: ReactNode
  /** When true, hide free/pool counters + suggestions (anonymous mode). */
  disableBillingUI?: boolean
  /** Provide a fresh request id per send (defaults to crypto.randomUUID). */
  newRequestId?: () => string
  /**
   * Pre-fill the input on first mount — e.g. a quoted passage the user
   * selected in a reading ("ask about this paragraph"). The user can edit or
   * clear it before sending; it is never auto-sent.
   */
  initialDraft?: string
  /**
   * Optional "new conversation" adapter — clears the server-side thread. When
   * provided, a small reset action renders once the thread has messages; on
   * success the local list is emptied. Omit to keep the single-thread behavior.
   */
  onNewConversation?: () => Promise<void> | void
}

// ── Helpers ────────────────────────────────────────────────────────────────

function defaultRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function format(template: string, replacements: Record<string, string | number>): string {
  return Object.entries(replacements).reduce(
    (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
    template
  )
}

/** Render assistant content with `**bold**` segments inline. */
function renderAssistantContent(content: string): ReactNode {
  return content.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <Text key={i} style={{ fontWeight: '600' }}>
        {part.slice(2, -2)}
      </Text>
    ) : (
      part
    )
  )
}

// ── Component ──────────────────────────────────────────────────────────────

export function ReadingChatScreen(props: ReadingChatScreenProps) {
  const {
    readingType,
    readingId,
    fetchHistory,
    sendMessage,
    onPaywallRequest,
    onError,
    copy,
    header,
    disableBillingUI = false,
    newRequestId = defaultRequestId,
    initialDraft,
    onNewConversation,
  } = props

  const { colors, isDark } = useTheme()
  const [isResetting, setIsResetting] = useState(false)

  const [history, setHistory] = useState<ReadingChatHistory>({
    conversationId: null,
    messages: [],
  })
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [input, setInput] = useState(initialDraft ?? '')
  const [isSending, setIsSending] = useState(false)
  const [billingMode, setBillingMode] = useState<ReadingChatBillingMode | null>(null)
  const [freeRemaining, setFreeRemaining] = useState<number | null>(null)

  const flatListRef = useRef<FlatList>(null)

  // ── Load history once per readingType+id ──────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setIsLoadingHistory(true)
    fetchHistory()
      .then((result) => {
        if (!cancelled) setHistory(result)
      })
      .catch((err) => {
        if (!cancelled && !onError?.(err)) {
          if (__DEV__) console.warn('[ReadingChatScreen] fetchHistory failed', err)
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingHistory(false)
      })
    return () => {
      cancelled = true
    }
  }, [fetchHistory, onError, readingType, readingId])

  const messages = history.messages

  // ── Send handler ──────────────────────────────────────────────────────────
  const handleSend = async (textOverride?: string) => {
    const trimmed = (textOverride ?? input).trim()
    if (!trimmed || isSending) return

    // Optimistic local append
    const optimisticId = newRequestId()
    setHistory((prev) => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          id: optimisticId,
          role: 'user',
          content: trimmed,
          createdAt: new Date().toISOString(),
        },
      ],
    }))
    setInput('')
    setIsSending(true)
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50)

    try {
      const result = await sendMessage(trimmed, newRequestId())
      setBillingMode(result.billingMode)
      setFreeRemaining(result.freeMessagesRemaining)
      setHistory((prev) => ({
        ...prev,
        conversationId: result.conversationId,
        messages: [
          ...prev.messages,
          {
            id: newRequestId(),
            role: 'assistant',
            content: result.reply,
            createdAt: new Date().toISOString(),
          },
        ],
      }))
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    } catch (err) {
      if (onError?.(err)) return
      const message = err instanceof Error ? err.message : ''
      if (
        message === 'insufficient_credits' ||
        message === 'pro_required' ||
        message === 'no_chat_credits'
      ) {
        onPaywallRequest()
      } else {
        Alert.alert(copy.errorGeneric)
      }
    } finally {
      setIsSending(false)
    }
  }

  const handleNewConversation = async () => {
    if (!onNewConversation || isResetting || isSending) return
    setIsResetting(true)
    try {
      await onNewConversation()
      setHistory({ conversationId: null, messages: [] })
      setBillingMode(null)
      setFreeRemaining(null)
      setInput('')
    } catch {
      Alert.alert(copy.errorGeneric)
    } finally {
      setIsResetting(false)
    }
  }

  const showOverflowWarning = !disableBillingUI && billingMode === 'chat_credits'
  const showNewConversation = !!onNewConversation && messages.length > 0
  const showCounter =
    !disableBillingUI &&
    (billingMode === 'free' || billingMode === 'pool') &&
    freeRemaining !== null &&
    freeRemaining > 0

  const suggestions = copy.suggestions ?? []
  const showSuggestions =
    !disableBillingUI && messages.length === 0 && !isSending && suggestions.length > 0

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {header ?? null}

      {/* New conversation — clears the server thread + local list. Right-aligned
          under the header; only shown once a thread exists. */}
      {showNewConversation ? (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12 }}>
          <Pressable
            onPress={() => void handleNewConversation()}
            disabled={isResetting}
            accessibilityRole='button'
            accessibilityLabel={copy.newConversation}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingVertical: 6,
              paddingHorizontal: 8,
              opacity: pressed || isResetting ? 0.5 : 1,
            })}
          >
            <SquarePen size={14} color={colors.secondary} strokeWidth={1.8} />
            {copy.newConversation ? (
              <Text style={{ fontSize: 12, color: colors.secondary }}>{copy.newConversation}</Text>
            ) : null}
          </Pressable>
        </View>
      ) : null}

      {/* Message list */}
      {isLoadingHistory ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.text} />
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
              <Text
                style={{
                  textAlign: 'center',
                  color: colors.text,
                  fontSize: 18,
                  lineHeight: 26,
                  fontWeight: '300',
                  letterSpacing: -0.2,
                }}
              >
                {copy.emptyHint}
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
                    backgroundColor: isUser ? colors.accent : colors.card,
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
                      color: isUser ? colors.bg : colors.text,
                    }}
                  >
                    {isUser ? item.content : renderAssistantContent(item.content)}
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
            backgroundColor: isDark ? '#7C2D1233' : '#FED7AA33',
            borderWidth: 0.5,
            borderColor: isDark ? '#7C2D12' : '#FED7AA',
          }}
        >
          <Text style={{ fontSize: 12, color: isDark ? '#FB923C' : '#C2410C' }}>
            {copy.buyCredits}
          </Text>
        </View>
      )}

      {/* Free / pool remaining counter */}
      {showCounter && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
          <Text style={{ fontSize: 11, color: colors.secondary }}>
            {format(billingMode === 'free' ? copy.freeRemaining : copy.poolRemaining, {
              remaining: freeRemaining ?? 0,
            })}
          </Text>
        </View>
      )}

      {/* Typing indicator */}
      {isSending && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <View
            style={{
              backgroundColor: colors.card,
              borderBottomLeftRadius: 4,
              paddingHorizontal: 14,
              paddingVertical: 10,
              alignSelf: 'flex-start',
            }}
          >
            <Text style={{ fontSize: 13, color: colors.secondary }}>{copy.loading}</Text>
          </View>
        </View>
      )}

      {/* Quick-start suggestions */}
      {showSuggestions && (
        <View style={{ borderTopWidth: 0.5, borderTopColor: colors.separator }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}
            style={{ flexGrow: 0 }}
          >
            {suggestions.map((label, i) => (
              <Pressable
                key={`${i}-${label}`}
                onPress={() => handleSend(label)}
                style={({ pressed }) => ({
                  borderWidth: 0.5,
                  borderColor: colors.separator,
                  backgroundColor: pressed ? colors.separator : colors.card,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                })}
              >
                <Text style={{ fontSize: 13, color: colors.text, fontWeight: '400' }}>{label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input bar */}
      <View
        style={{
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: 28,
          backgroundColor: colors.bg,
          borderTopWidth: showSuggestions ? 0 : 0.5,
          borderTopColor: colors.separator,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.card,
            borderWidth: 0.5,
            borderColor: input.trim() ? colors.text : colors.separator,
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
              color: colors.text,
              textAlignVertical: 'center',
            }}
            placeholder={copy.placeholder}
            placeholderTextColor={colors.secondary}
            value={input}
            onChangeText={setInput}
            multiline
            returnKeyType='default'
            blurOnSubmit={false}
          />
          <Pressable
            onPress={() => handleSend()}
            disabled={!input.trim() || isSending}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: input.trim() && !isSending ? colors.accent : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
              alignSelf: 'flex-end',
            })}
          >
            <Send
              size={18}
              strokeWidth={2}
              color={input.trim() && !isSending ? colors.bg : colors.secondary}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
