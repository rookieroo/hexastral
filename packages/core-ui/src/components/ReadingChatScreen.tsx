/**
 * ReadingChatScreen — shared AI follow-up chat shell (Phase J · J.1.5).
 *
 * Lifted from `apps/hexastral-app/app/detail/chat/[readingType]/[id].tsx` so
 * every reading-producing satellite can drop the same conversation surface
 * over its own backend endpoint without re-implementing message list /
 * keyboard avoidance / billing UX.
 *
 * Assistant turns: body → AI disclaimer → action bar (copy / like / dislike /
 * optional share). Long-press no longer opens report — dislike sheet does.
 */

import * as Haptics from 'expo-haptics'
import { Check, Copy, Send, Share2, SquarePen, ThumbsDown, ThumbsUp } from 'lucide-react-native'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
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

export type ReadingChatBillingMode = 'free' | 'subscription' | 'pool' | 'chat_credits'

export type ChatMessageFeedback = 'up' | 'down' | null

export interface ReadingChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  /** Persisted thumbs on assistant turns; null/undefined = none. */
  feedback?: ChatMessageFeedback
}

export interface ReadingChatHistory {
  conversationId: string | null
  messages: ReadingChatMessage[]
}

export interface ReadingChatSendResult {
  conversationId: string
  reply: string
  /** Server id for the persisted assistant row — required for D1 feedback. */
  assistantMessageId?: string
  isPro: boolean
  billingMode: ReadingChatBillingMode
  freeMessagesRemaining: number | null
}

export interface ReadingChatStrings {
  title: string
  emptyHint: string
  placeholder: string
  loading: string
  errorGeneric: string
  proUnlimited: string
  buyCredits: string
  freeRemaining: string
  poolRemaining: string
  suggestions?: ReadonlyArray<string>
  newConversation?: string
  report?: string
  reportConfirmTitle?: string
  reportConfirmBody?: string
  reportDone?: string
  /** Under each assistant bubble (DeepSeek-style). */
  aiDisclaimer?: string
  copyAction?: string
  copied?: string
  like?: string
  dislike?: string
  share?: string
  dislikeNotAccurate?: string
  dislikeReport?: string
  shareSelectHint?: string
  generateShareImage?: string
  cancel?: string
}

export interface ReadingChatScreenProps {
  readingType: string
  readingId: string
  fetchHistory: () => Promise<ReadingChatHistory>
  sendMessage: (message: string, requestId: string) => Promise<ReadingChatSendResult>
  onPaywallRequest: () => void
  onError?: (err: unknown) => boolean
  copy: ReadingChatStrings
  header?: ReactNode
  disableBillingUI?: boolean
  newRequestId?: () => string
  initialDraft?: string
  onNewConversation?: () => Promise<void> | void
  /** App Store 1.2 — opened from dislike sheet, not long-press. */
  onReportMessage?: (messageId: string) => Promise<void> | void
  /** Persist thumbs; `null` clears. Optimistic UI already applied. */
  onRateMessage?: (
    messageId: string,
    feedback: 'up' | 'down' | null
  ) => Promise<void> | void
  /**
   * When set, Share appears and selection mode can hand off messages for a
   * preview-first share card (host owns capture speed gate).
   */
  onShareMessages?: (messages: ReadingChatMessage[]) => void
  /** Default true when onShareMessages is set. */
  enableShare?: boolean
  /** Optional host clipboard (preferred). Falls back to expo-clipboard if present. */
  onCopyMessage?: (content: string) => void | Promise<void>
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

type ClipboardModule = { setStringAsync: (text: string) => Promise<void> }
let clipboardMod: ClipboardModule | null | undefined
function getClipboard(): ClipboardModule | null {
  if (clipboardMod !== undefined) return clipboardMod
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    clipboardMod = require('expo-clipboard') as ClipboardModule
    return clipboardMod
  } catch {
    clipboardMod = null
    return null
  }
}

async function copyToClipboard(
  text: string,
  onCopyMessage?: (content: string) => void | Promise<void>
): Promise<boolean> {
  try {
    if (onCopyMessage) {
      await onCopyMessage(text)
      return true
    }
    const clip = getClipboard()
    if (clip) {
      await clip.setStringAsync(text)
      return true
    }
  } catch {
    return false
  }
  return false
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
    onReportMessage,
    onRateMessage,
    onShareMessages,
    enableShare: enableShareProp,
    onCopyMessage,
  } = props

  const enableShare = enableShareProp ?? Boolean(onShareMessages)
  const showActions = Boolean(onReportMessage || onRateMessage || enableShare)

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
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

  const flatListRef = useRef<FlatList>(null)

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

  const patchFeedback = useCallback((messageId: string, feedback: ChatMessageFeedback) => {
    setHistory((prev) => ({
      ...prev,
      messages: prev.messages.map((m) => (m.id === messageId ? { ...m, feedback } : m)),
    }))
  }, [])

  const handleReport = useCallback(
    (messageId: string) => {
      if (!onReportMessage) return
      Alert.alert(
        copy.reportConfirmTitle ?? 'Report message',
        copy.reportConfirmBody ?? 'Report this response as objectionable?',
        [
          {
            text: copy.report ?? 'Report',
            style: 'destructive',
            onPress: () => {
              Promise.resolve(onReportMessage(messageId))
                .then(() => {
                  if (copy.reportDone) Alert.alert(copy.reportDone)
                })
                .catch(() => {})
            },
          },
          { text: copy.cancel ?? 'Cancel', style: 'cancel' },
        ]
      )
    },
    [copy, onReportMessage]
  )

  const handleDislike = useCallback(
    (messageId: string, current: ChatMessageFeedback | undefined) => {
      const next: ChatMessageFeedback = current === 'down' ? null : 'down'
      patchFeedback(messageId, next)
      void Promise.resolve(onRateMessage?.(messageId, next)).catch(() => {
        patchFeedback(messageId, current ?? null)
      })
      if (next === 'down' && onReportMessage) {
        Alert.alert(copy.dislike ?? 'Not helpful', undefined, [
          {
            text: copy.dislikeNotAccurate ?? 'Not accurate',
            style: 'default',
          },
          {
            text: copy.dislikeReport ?? copy.report ?? 'Report',
            style: 'destructive',
            onPress: () => handleReport(messageId),
          },
          { text: copy.cancel ?? 'Cancel', style: 'cancel' },
        ])
      }
    },
    [copy, handleReport, onRateMessage, onReportMessage, patchFeedback]
  )

  const handleLike = useCallback(
    (messageId: string, current: ChatMessageFeedback | undefined) => {
      const next: ChatMessageFeedback = current === 'up' ? null : 'up'
      patchFeedback(messageId, next)
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
      void Promise.resolve(onRateMessage?.(messageId, next)).catch(() => {
        patchFeedback(messageId, current ?? null)
      })
    },
    [onRateMessage, patchFeedback]
  )

  const handleCopy = useCallback(
    async (messageId: string, content: string) => {
      const ok = await copyToClipboard(content, onCopyMessage)
      if (!ok) {
        Alert.alert(copy.errorGeneric)
        return
      }
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
      setCopiedId(messageId)
      setTimeout(() => setCopiedId((id) => (id === messageId ? null : id)), 1500)
    },
    [copy.errorGeneric, onCopyMessage]
  )

  const enterShareSelect = useCallback(
    (seedId: string) => {
      if (!enableShare || !onShareMessages) return
      setSelecting(true)
      setSelectedIds(new Set([seedId]))
    },
    [enableShare, onShareMessages]
  )

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const confirmShare = useCallback(() => {
    if (!onShareMessages) return
    const ordered = messages.filter((m) => selectedIds.has(m.id))
    if (ordered.length === 0) return
    setSelecting(false)
    setSelectedIds(new Set())
    onShareMessages(ordered)
  }, [messages, onShareMessages, selectedIds])

  const handleSend = async (textOverride?: string) => {
    const trimmed = (textOverride ?? input).trim()
    if (!trimmed || isSending || selecting) return

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
      const assistantId = result.assistantMessageId ?? newRequestId()
      setHistory((prev) => ({
        ...prev,
        conversationId: result.conversationId,
        messages: [
          ...prev.messages,
          {
            id: assistantId,
            role: 'assistant',
            content: result.reply,
            createdAt: new Date().toISOString(),
            feedback: null,
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
      setSelecting(false)
      setSelectedIds(new Set())
    } catch {
      Alert.alert(copy.errorGeneric)
    } finally {
      setIsResetting(false)
    }
  }

  const showOverflowWarning = !disableBillingUI && billingMode === 'chat_credits'
  const showNewConversation = !!onNewConversation && messages.length > 0 && !selecting
  const showCounter =
    !disableBillingUI &&
    (billingMode === 'free' || billingMode === 'pool') &&
    freeRemaining !== null &&
    freeRemaining > 0

  const suggestions = copy.suggestions ?? []
  const showSuggestions =
    !disableBillingUI && messages.length === 0 && !isSending && suggestions.length > 0 && !selecting

  const iconMuted = colors.secondary
  const iconActive = colors.accent

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {header ?? null}

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

      {selecting ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={{ fontSize: 13, color: colors.secondary }}>
            {copy.shareSelectHint ?? 'Select messages to include'}
          </Text>
        </View>
      ) : null}

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
            paddingBottom: selecting ? 88 : 16,
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
            const selected = selectedIds.has(item.id)
            return (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  marginBottom: 12,
                  gap: 8,
                  alignItems: 'flex-start',
                }}
              >
                {selecting ? (
                  <Pressable
                    onPress={() => toggleSelect(item.id)}
                    accessibilityRole='checkbox'
                    accessibilityState={{ checked: selected }}
                    style={{
                      width: 22,
                      height: 22,
                      marginTop: 10,
                      borderWidth: 1,
                      borderColor: selected ? colors.accent : colors.separator,
                      backgroundColor: selected ? colors.accent : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selected ? <Check size={14} color={colors.bg} strokeWidth={2.5} /> : null}
                  </Pressable>
                ) : null}
                <View style={{ maxWidth: selecting ? '72%' : '88%', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                  <View
                    style={{
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

                  {!isUser && !selecting && showActions ? (
                    <View style={{ marginTop: 6, gap: 6, maxWidth: '100%' }}>
                      {copy.aiDisclaimer ? (
                        <Text style={{ fontSize: 11, lineHeight: 15, color: colors.secondary }}>
                          {copy.aiDisclaimer}
                        </Text>
                      ) : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <Pressable
                          onPress={() => void handleCopy(item.id, item.content)}
                          hitSlop={8}
                          accessibilityLabel={copy.copyAction ?? 'Copy'}
                        >
                          {copiedId === item.id ? (
                            <Check size={18} color={iconActive} strokeWidth={1.8} />
                          ) : (
                            <Copy size={18} color={iconMuted} strokeWidth={1.8} />
                          )}
                        </Pressable>
                        {onRateMessage ? (
                          <>
                            <Pressable
                              onPress={() => handleLike(item.id, item.feedback)}
                              hitSlop={8}
                              accessibilityLabel={copy.like ?? 'Like'}
                            >
                              <ThumbsUp
                                size={18}
                                color={item.feedback === 'up' ? iconActive : iconMuted}
                                strokeWidth={1.8}
                                fill={item.feedback === 'up' ? iconActive : 'transparent'}
                              />
                            </Pressable>
                            <Pressable
                              onPress={() => handleDislike(item.id, item.feedback)}
                              hitSlop={8}
                              accessibilityLabel={copy.dislike ?? 'Dislike'}
                            >
                              <ThumbsDown
                                size={18}
                                color={item.feedback === 'down' ? iconActive : iconMuted}
                                strokeWidth={1.8}
                                fill={item.feedback === 'down' ? iconActive : 'transparent'}
                              />
                            </Pressable>
                          </>
                        ) : null}
                        {enableShare && onShareMessages ? (
                          <Pressable
                            onPress={() => enterShareSelect(item.id)}
                            hitSlop={8}
                            accessibilityLabel={copy.share ?? 'Share'}
                          >
                            <Share2 size={18} color={iconMuted} strokeWidth={1.8} />
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>
            )
          }}
        />
      )}

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

      {showCounter && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
          <Text style={{ fontSize: 11, color: colors.secondary }}>
            {format(billingMode === 'free' ? copy.freeRemaining : copy.poolRemaining, {
              remaining: freeRemaining ?? 0,
            })}
          </Text>
        </View>
      )}

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

      {selecting ? (
        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            paddingHorizontal: 12,
            paddingTop: 10,
            paddingBottom: 28,
            borderTopWidth: 0.5,
            borderTopColor: colors.separator,
            backgroundColor: colors.bg,
          }}
        >
          <Pressable
            onPress={() => {
              setSelecting(false)
              setSelectedIds(new Set())
            }}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 14,
              alignItems: 'center',
              borderWidth: 0.5,
              borderColor: colors.separator,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ color: colors.text, fontWeight: '600' }}>{copy.cancel ?? 'Cancel'}</Text>
          </Pressable>
          <Pressable
            onPress={confirmShare}
            disabled={selectedIds.size === 0}
            style={({ pressed }) => ({
              flex: 2,
              paddingVertical: 14,
              alignItems: 'center',
              backgroundColor: selectedIds.size === 0 ? colors.card : colors.accent,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                color: selectedIds.size === 0 ? colors.secondary : colors.bg,
                fontWeight: '700',
              }}
            >
              {copy.generateShareImage ?? 'Generate image'}
            </Text>
          </Pressable>
        </View>
      ) : (
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
      )}
    </KeyboardAvoidingView>
  )
}
