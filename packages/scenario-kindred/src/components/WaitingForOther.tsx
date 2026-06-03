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
 * through the system share sheet as a web link, so there is no email / phone on
 * file to show — the middle shows who A invited and how long ago. Fully
 * copy-driven: the host app passes localized `copy` + a preformatted
 * `sentAtLabel`, so nothing here is hardcoded to one language.
 *
 * Dark-only (kindredDark): the only consumer is kindred-app, which is dark-only
 * per ADR-0021. The brand mark is a `logo` slot — kindred passes its cinnabar
 * moon (`<KindredMoon/>`) so this screen carries the same logo as the rest of
 * the app instead of a one-off seal.
 *
 * The transition from pending → accepted is handled by the parent (via polling or
 * push notification refetch); this component is purely presentational.
 */

import {
  kindredDark,
  kindredPresets,
  kindredSpacing,
  kindredType,
} from '@zhop/hexastral-tokens/kindred'
import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { KindredSeal } from './KindredSeal'

export interface WaitingForOtherProps {
  state: 'pending' | 'accepted'
  /** Who A invited — a name, or the relationship label for channel-less invites. */
  otherName?: string
  /** Preformatted, localized "Sent · N ago" label (the host app owns formatting). */
  sentAtLabel?: string
  /** Brand mark shown at the top. Kindred passes its cinnabar moon. */
  logo?: ReactNode
  onResend: () => void
  onCancel: () => void
  onViewReport: () => void
  copy?: Partial<typeof DEFAULT_COPY>
}

const DEFAULT_COPY = {
  pendingTitle: '邀请已发出',
  pendingSubtitle: '等 ta 接力',
  pendingHint: 'ta 打开链接填一份生辰，我们就会合上你们的星盘',
  resend: '重发邀请',
  cancel: '取消邀请',
  acceptedTitle: '你们的缘分已系',
  acceptedSubtitle: '报告已生成',
  viewReport: '阅读你们的故事  →',
} as const

export function WaitingForOther({
  state,
  otherName,
  sentAtLabel,
  logo,
  onResend,
  onCancel,
  onViewReport,
  copy,
}: WaitingForOtherProps) {
  const merged = { ...DEFAULT_COPY, ...(copy ?? {}) }

  // 2026-06: trimmed from a 3-zone layout (logo + title-stack + animated
  // tether + bordered partner card + hint + 2 buttons) to a single focal
  // beat: brand mark, one status line that says who+when in plain language,
  // primary action + small cancel link. The tether animation + the hint
  // were redundant — the user already knows what "Invitation sent" means.
  const subtitle =
    state === 'pending'
      ? otherName && sentAtLabel
        ? `${otherName} · ${sentAtLabel}`
        : (otherName ?? sentAtLabel ?? merged.pendingSubtitle)
      : `${otherName ?? ''} · ${merged.acceptedSubtitle}`

  return (
    <View style={{ flex: 1, backgroundColor: kindredDark.bg }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: kindredSpacing.screenH,
          paddingVertical: kindredSpacing.screenV,
          justifyContent: 'space-between',
        }}
      >
        {/* Top: brand mark + one focal status line. */}
        <View
          style={{ alignItems: 'center', gap: kindredSpacing.lg, marginTop: kindredSpacing.xxl }}
        >
          {logo ?? <KindredSeal mode={state === 'pending' ? 'breathing' : 'stamp'} size={96} />}
          <Text
            style={[
              kindredType.title,
              { color: kindredDark.text, textAlign: 'center' },
            ]}
          >
            {state === 'pending' ? merged.pendingTitle : merged.acceptedTitle}
          </Text>
          <Text
            style={[
              kindredType.caption,
              { color: kindredDark.textMuted, textAlign: 'center' },
            ]}
          >
            {subtitle}
          </Text>
        </View>

        {/* Bottom: primary action + small cancel link (only on pending). */}
        <View style={{ alignItems: 'center', gap: kindredSpacing.md }}>
          {state === 'pending' ? (
            <>
              <Pressable onPress={onResend} hitSlop={12}>
                <Text style={kindredPresets.ctaText}>{merged.resend}</Text>
              </Pressable>
              <Pressable onPress={onCancel} hitSlop={12}>
                <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>
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
