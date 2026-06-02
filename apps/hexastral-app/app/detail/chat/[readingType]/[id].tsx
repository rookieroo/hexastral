/**
 * AI 大师对话屏幕
 * Route: /detail/chat/[readingType]/[id]
 *
 * Thin wrapper over `<ReadingChatScreen>` (core-ui) — provides hexastral's
 * API adapter (HMAC-signed `/api/chat`), branded header, paywall hook, and
 * i18n strings. Layout / message list / billing UX lives in core-ui so every
 * other reading-producing satellite can drop the same shell.
 */

import {
  type ReadingChatHistory,
  ReadingChatScreen,
  type ReadingChatSendResult,
  type ReadingChatStrings,
  useTheme,
} from '@zhop/core-ui'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo } from 'react'
import { Text, View } from 'react-native'
import { BRAND_PHASE, HexastralPlanetLogo } from '@/components/branding/HexastralPlanetLogo'
import { GuardBlockModal } from '@/components/modal/GuardBlockModal'
import { BackButton } from '@/components/ui/BackButton'
import { getIsPro, useAuth } from '@/lib/auth'
import { config } from '@/lib/config'
import { signRequest } from '@/lib/hmac'
import { useI18n } from '@/lib/i18n'
import { useIosPalette } from '@/lib/theme'
import { usePaywall } from '@/lib/ux/useQuota'

async function fetchChatHistory(
  userId: string,
  readingType: string,
  readingId: string
): Promise<ReadingChatHistory> {
  const path = `/api/chat/${readingType}/${readingId}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${userId}`,
  }
  const sig = await signRequest({ body: '', userId, method: 'GET', path })
  if (sig) Object.assign(headers, sig)

  const res = await fetch(`${config.apiUrl}${path}`, { headers })
  if (!res.ok) throw new Error(`Chat history fetch failed: ${res.status}`)
  return (await res.json()) as ReadingChatHistory
}

async function sendChatMessage(
  userId: string,
  readingType: string,
  readingId: string,
  message: string,
  requestId: string
): Promise<ReadingChatSendResult> {
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
  return (await res.json()) as ReadingChatSendResult
}

export default function ChatScreen() {
  const { readingType, id } = useLocalSearchParams<{ readingType: string; id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const { t } = useI18n()
  const { colors } = useTheme()
  const ios = useIosPalette()

  const { guard, dismissGuard, handleApiError, showPaywallModal } = usePaywall()

  const userId = user?.id ?? null
  const isPro = getIsPro(user)

  // Guest users cannot access chat — redirect back.
  // Non-Pro users: chat is a Pro-only feature — surface paywall and bail.
  useEffect(() => {
    if (user?.id.startsWith('guest_')) {
      router.back()
      return
    }
    if (user && !isPro) {
      showPaywallModal()
      router.back()
    }
  }, [user, isPro, router, showPaywallModal])

  const copy = useMemo<ReadingChatStrings>(
    () => ({
      title: t('chat_title'),
      emptyHint: t('chat_empty_hint'),
      placeholder: t('chat_placeholder'),
      loading: t('chat_loading'),
      errorGeneric: t('chat_error'),
      proUnlimited: t('chat_pro_unlimited'),
      buyCredits: t('buy_credits'),
      freeRemaining: t('chat_free_remaining'),
      poolRemaining: t('chat_pool_remaining'),
      suggestions: [
        t('chat_prompt_career'),
        t('chat_prompt_love'),
        t('chat_prompt_money'),
        t('chat_prompt_recent'),
      ],
    }),
    [t]
  )

  if (!userId || !readingType || !id) {
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
          {copy.title}
        </Text>
      </View>
    </View>
  )

  return (
    <>
      <ReadingChatScreen
        readingType={readingType}
        readingId={id}
        fetchHistory={() => fetchChatHistory(userId, readingType, id)}
        sendMessage={(msg, requestId) =>
          sendChatMessage(userId, readingType, id, msg, requestId)
        }
        onPaywallRequest={showPaywallModal}
        onError={(err) => handleApiError(err)}
        copy={copy}
        header={header}
      />
      <GuardBlockModal visible={!!guard} guardKey={guard?.guardKey} onDismiss={dismissGuard} />
    </>
  )
}
