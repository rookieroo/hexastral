/**
 * Shared chat-share preview modal — preview-first, then jpg capture.
 * Preview fits the phone width; capture uses a fixed off-screen card for sharpness.
 */

import type { ImageSourcePropType } from 'react-native'
import { useCallback, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'

import { captureAndShareVisibleCard } from './chatShareCapture'
import { ShareableChatCard } from './components/ShareableChatCard'
import type { ReadingChatMessage } from './components/ReadingChatScreen'
import { useTheme } from './theme'

export const CHAT_SHARE_ENABLED = true

/** Logical width for the exported jpg (view-shot target). */
const CAPTURE_WIDTH = 780

type Labels = {
  cancel: string
  generateShareImage: string
  share: string
}

export function useChatSharePreview(opts: {
  brandName: string
  brandUrl: string
  installUrl: string
  logoSource: ImageSourcePropType
  userBubbleColor: string
  locale: string
  caption: (lead: string) => string
  labels: Labels
}) {
  const [shareLines, setShareLines] = useState<ReadingChatMessage[] | null>(null)
  const [sharingOut, setSharingOut] = useState(false)
  const shotRef = useRef<View | null>(null)
  const { colors } = useTheme()
  const { width: winW } = useWindowDimensions()
  const previewWidth = Math.max(280, Math.round(winW - 32))

  const openShare = useCallback((msgs: ReadingChatMessage[]) => {
    setShareLines(msgs)
  }, [])

  const runShare = useCallback(async () => {
    if (!shareLines?.length || sharingOut) return
    setSharingOut(true)
    try {
      const lead =
        shareLines.find((m) => m.role === 'assistant')?.content.slice(0, 48) ?? opts.brandName
      await captureAndShareVisibleCard({
        shotRef,
        caption: opts.caption(lead),
        delayMs: 80,
        dialogTitle: opts.brandName,
      })
    } catch {
      // cancel / capture fail
    } finally {
      setSharingOut(false)
    }
  }, [opts, shareLines, sharingOut])

  const cardLines =
    shareLines?.map((m) => ({ role: m.role, content: m.content })) ?? []

  const modal =
    shareLines == null ? null : (
      <Modal
        visible
        animationType='slide'
        presentationStyle='pageSheet'
        onRequestClose={() => setShareLines(null)}
      >
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 56 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingBottom: 12,
            }}
          >
            <Pressable onPress={() => setShareLines(null)} hitSlop={12}>
              <Text style={{ color: colors.accent, fontSize: 16 }}>{opts.labels.cancel}</Text>
            </Pressable>
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>
              {opts.labels.generateShareImage}
            </Text>
            <View style={{ width: 48 }} />
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 16, alignItems: 'center', paddingBottom: 120 }}
          >
            <ShareableChatCard
              lines={cardLines}
              brandName={opts.brandName}
              brandUrl={opts.brandUrl}
              logoSource={opts.logoSource}
              userBubbleColor={opts.userBubbleColor}
              width={previewWidth}
            />
          </ScrollView>

          {/* Off-screen capture target — full logical width for sharp export */}
          <View
            collapsable={false}
            pointerEvents='none'
            style={{ position: 'absolute', left: -10000, top: 0, opacity: 0 }}
          >
            <ShareableChatCard
              ref={shotRef}
              lines={cardLines}
              brandName={opts.brandName}
              brandUrl={opts.brandUrl}
              logoSource={opts.logoSource}
              userBubbleColor={opts.userBubbleColor}
              width={CAPTURE_WIDTH}
            />
          </View>

          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              paddingHorizontal: 16,
              paddingBottom: 34,
              paddingTop: 12,
              backgroundColor: colors.bg,
              borderTopWidth: 0.5,
              borderTopColor: colors.separator,
            }}
          >
            <Pressable
              onPress={() => void runShare()}
              disabled={sharingOut}
              style={({ pressed }) => ({
                paddingVertical: 14,
                alignItems: 'center',
                backgroundColor: colors.accent,
                opacity: pressed || sharingOut ? 0.7 : 1,
              })}
            >
              {sharingOut ? (
                <ActivityIndicator color={colors.bg} />
              ) : (
                <Text style={{ color: colors.bg, fontWeight: '700' }}>{opts.labels.share}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    )

  return {
    openShare: CHAT_SHARE_ENABLED ? openShare : undefined,
    enableShare: CHAT_SHARE_ENABLED,
    shareModal: modal,
  }
}
