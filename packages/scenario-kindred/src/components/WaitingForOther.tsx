/**
 * WaitingForOther — A user's screen after sending an invitation, before B accepts.
 *
 * Shown when:
 *   - A sent a channel-agnostic invite link and the invitation is `pending`
 *   - User opens the app and there's at least one pending invitation
 *
 * Two states:
 *   `pending`  : "still waiting" — who was invited + when, resend (re-share) CTA
 *   `accepted` : "ta joined!" with a celebratory subtle animation, "see report" CTA
 *
 * Channel-neutral by design (ADR-0021 §3, user-sends-only): the invite goes out
 * through the system share sheet, so there is no email / phone on file to show —
 * the middle shows who A invited and how long ago. Fully copy-driven: the host
 * app passes localized `copy` + a preformatted `sentAtLabel`, so nothing here is
 * hardcoded to one language.
 *
 * The transition from pending → accepted is handled by the parent (via polling or
 * push notification refetch); this component is purely presentational.
 */

import {
  kindredLight,
  kindredPresets,
  kindredSpacing,
  kindredType,
} from '@zhop/hexastral-tokens/kindred'
import { useEffect } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { KindredSeal } from './KindredSeal'

export interface WaitingForOtherProps {
  state: 'pending' | 'accepted'
  /** Who A invited — a name, or the relationship label for channel-less invites. */
  otherName?: string
  /** Preformatted, localized "Sent · N ago" label (the host app owns formatting). */
  sentAtLabel?: string
  onResend: () => void
  onCancel: () => void
  onViewReport: () => void
  copy?: Partial<typeof DEFAULT_COPY>
}

const DEFAULT_COPY = {
  pendingTitle: '邀请已发出',
  pendingSubtitle: '等 ta 接力',
  pendingHint: 'ta 填一份生辰，我们就会合上你们的星盘',
  resend: '重发邀请',
  cancel: '取消邀请',
  acceptedTitle: '你们的Kindred已系',
  acceptedSubtitle: '报告已生成',
  viewReport: '阅读你们的故事  →',
} as const

export function WaitingForOther({
  state,
  otherName,
  sentAtLabel,
  onResend,
  onCancel,
  onViewReport,
  copy,
}: WaitingForOtherProps) {
  const merged = { ...DEFAULT_COPY, ...(copy ?? {}) }

  // Pending state: subtle pulse on a "tether" between the seal and the invitee.
  const tetherOpacity = useSharedValue(0.4)

  useEffect(() => {
    if (state === 'pending') {
      tetherOpacity.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.4, { duration: 1500, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    }
  }, [state])

  const tetherStyle = useAnimatedStyle(() => ({ opacity: tetherOpacity.value }))

  return (
    <View style={{ flex: 1, backgroundColor: kindredLight.bg }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: kindredSpacing.screenH,
          paddingVertical: kindredSpacing.screenV,
          justifyContent: 'space-between',
        }}
      >
        {/* Top: seal + status */}
        <View
          style={{ alignItems: 'center', gap: kindredSpacing.xl, marginTop: kindredSpacing.xxl }}
        >
          <KindredSeal mode={state === 'pending' ? 'breathing' : 'stamp'} size={96} />

          <View style={{ alignItems: 'center', gap: kindredSpacing.sm }}>
            <Text style={[kindredType.title, { color: kindredLight.text, textAlign: 'center' }]}>
              {state === 'pending' ? merged.pendingTitle : merged.acceptedTitle}
            </Text>
            <Text
              style={[kindredType.body, { color: kindredLight.textSecondary, textAlign: 'center' }]}
            >
              {state === 'pending'
                ? merged.pendingSubtitle
                : `${otherName ?? ''} · ${merged.acceptedSubtitle}`}
            </Text>
          </View>
        </View>

        {/* Middle: tether + who was invited / when (channel-neutral — no contact info) */}
        {state === 'pending' && (
          <View style={{ alignItems: 'center', gap: kindredSpacing.lg }}>
            <Animated.View
              style={[
                {
                  width: 1,
                  height: 60,
                  backgroundColor: kindredLight.accent,
                  opacity: 0.6,
                },
                tetherStyle,
              ]}
            />
            {otherName || sentAtLabel ? (
              <View
                style={{
                  paddingHorizontal: kindredSpacing.lg,
                  paddingVertical: kindredSpacing.md,
                  borderWidth: 0.5,
                  borderColor: kindredLight.border,
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {otherName ? (
                  <Text style={[kindredType.heading, { color: kindredLight.text }]}>
                    {otherName}
                  </Text>
                ) : null}
                {sentAtLabel ? (
                  <Text style={[kindredType.caption, { color: kindredLight.textMuted }]}>
                    {sentAtLabel}
                  </Text>
                ) : null}
              </View>
            ) : null}
            <Text
              style={[
                kindredType.body,
                {
                  color: kindredLight.textSecondary,
                  textAlign: 'center',
                  paddingHorizontal: kindredSpacing.lg,
                },
              ]}
            >
              {merged.pendingHint}
            </Text>
          </View>
        )}

        {/* Bottom: actions */}
        <View style={{ alignItems: 'center', gap: kindredSpacing.md }}>
          {state === 'pending' ? (
            <>
              <Pressable onPress={onResend} hitSlop={12}>
                <Text style={kindredPresets.ctaText}>{merged.resend}</Text>
              </Pressable>
              <Pressable onPress={onCancel} hitSlop={12}>
                <Text style={[kindredType.caption, { color: kindredLight.textMuted }]}>
                  {merged.cancel}
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable onPress={onViewReport} hitSlop={12}>
              <Text style={kindredPresets.ctaText}>{merged.viewReport}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  )
}
