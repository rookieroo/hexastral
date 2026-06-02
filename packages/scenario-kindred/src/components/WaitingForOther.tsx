/**
 * WaitingForOther — A user's screen after sending an invitation, before B accepts.
 *
 * Shown when:
 *   - A completed Screen 7a (email invite) and the invitation is `pending`
 *   - User opens the app and there's at least one pending invitation
 *
 * Two states:
 *   `pending`  : "still waiting" with the invited email, send-time, resend CTA
 *   `accepted` : "ta joined!" with celebratory subtle animation, "see report" CTA
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
  /** Email B was invited at (rendered with privacy masking) */
  invitedEmail: string
  /** ISO timestamp of invitation send */
  sentAt: string
  /** Optional B's name once accepted */
  otherName?: string
  onResend: () => void
  onCancel: () => void
  onViewReport: () => void
  /** Soft nudge: add inviter email in Settings (optional, non-blocking) */
  linkEmailHint?: string
  onLinkEmail?: () => void
  copy?: Partial<typeof DEFAULT_COPY>
}

const DEFAULT_COPY = {
  pendingTitle: '邀请已发出',
  pendingSubtitle: '等 ta 接力',
  pendingHint: 'ta 收到邮件后填一份生辰，我们就会合上你们的星盘',
  sentAtPrefix: '已发送 · ',
  resend: '重发邀请',
  cancel: '取消邀请',
  acceptedTitle: '你们的Kindred已系',
  acceptedSubtitle: '报告已生成',
  viewReport: '阅读你们的故事  →',
} as const

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  if (local.length <= 2) return `${local[0]}***@${domain}`
  return `${local.slice(0, 2)}${'•'.repeat(local.length - 2)}@${domain}`
}

function formatRelative(iso: string): string {
  try {
    const ms = Date.now() - Date.parse(iso)
    const minutes = Math.floor(ms / 60_000)
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes} 分钟前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} 小时前`
    const days = Math.floor(hours / 24)
    return `${days} 天前`
  } catch {
    return ''
  }
}

export function WaitingForOther({
  state,
  invitedEmail,
  sentAt,
  otherName,
  onResend,
  onCancel,
  onViewReport,
  linkEmailHint,
  onLinkEmail,
  copy,
}: WaitingForOtherProps) {
  const merged = { ...DEFAULT_COPY, ...(copy ?? {}) }

  // Pending state: subtle pulse on a dotted-line "tether" between seal and email
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

        {/* Middle: invited email + tether */}
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
              <Text style={[kindredType.caption, { color: kindredLight.textMuted }]}>邀请到</Text>
              <Text style={[kindredType.heading, { color: kindredLight.text }]}>
                {maskEmail(invitedEmail)}
              </Text>
              <Text style={[kindredType.caption, { color: kindredLight.textMuted }]}>
                {merged.sentAtPrefix}
                {formatRelative(sentAt)}
              </Text>
            </View>
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
            {linkEmailHint && onLinkEmail ? (
              <Pressable
                onPress={onLinkEmail}
                hitSlop={12}
                style={{ marginTop: kindredSpacing.sm }}
              >
                <Text
                  style={[kindredType.caption, { color: kindredLight.accent, textAlign: 'center' }]}
                >
                  {linkEmailHint}
                </Text>
              </Pressable>
            ) : null}
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
