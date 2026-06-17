/**
 * InviteAcceptSheet — bottom sheet B sees on first app open after redeeming
 * an invitation via web → DDL → app.
 *
 * Flow:
 *   1. B clicks email link on web, fills birth info on /yuan/invite/[token]
 *   2. Web shows teaser + "Get full report in the app" → App Store
 *   3. App installs → DDL claims the invitation token automatically
 *   4. This sheet appears at app launch: "ta wants to know you better"
 *   5. B taps "open the report" → triggers RevealMoment → bond detail
 *
 * B's birth info is already collected on web; this sheet only confirms the
 * relationship is correctly identified and invites B into the report.
 */

import {
  kindredDark,
  kindredPresets,
  kindredSpacing,
  kindredType,
} from '@zhop/hexastral-tokens/kindred'
import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { RelationshipType } from '../types'
import { KindredSeal } from './KindredSeal'

export interface InviteAcceptSheetProps {
  /** Inviter (A) — display name */
  inviterName: string
  /** Inviter's optional opening note */
  inviterNote?: string
  /** Relationship type A picked when creating the invitation */
  relationshipType: RelationshipType
  /** Tap "open report" — triggers RevealMoment + navigation to bond detail */
  onOpen: () => void
  /** Tap "later" — bond stays accessible from the bonds tab */
  onDismiss: () => void
  /** When true, the "open" CTA is visually disabled */
  openDisabled?: boolean
  /** Fine-print rendered BELOW the open CTA (e.g. an inline privacy-consent line —
   *  tapping "open" IS the affirmative consent, so no separate gating checkbox). */
  consentSlot?: ReactNode
  /** Localized relationship label; falls back to English defaults when omitted */
  relationshipLabel?: string
  copy?: Partial<InviteAcceptCopy>
  /** Logo/hero at the top. Defaults to the cinnabar Kindred seal; the app passes
   *  the phase-moon so the accept sheet matches the rest of the brand. */
  hero?: ReactNode
}

type InviteAcceptCopy = {
  prefix: string
  suffix: string
  relationshipPrefix: string
  open: string
  later: string
}

const DEFAULT_COPY: InviteAcceptCopy = {
  prefix: 'is ',
  suffix: ' inviting you in',
  relationshipPrefix: 'You are ',
  open: 'Open the thread  →',
  later: 'Later',
}

const RELATIONSHIP_LABEL: Record<RelationshipType, string> = {
  romantic: 'Partner',
  family: 'Family',
  parent: 'Parent',
  child: 'Child',
  sibling: 'Sibling',
  friend: 'Friend',
  boss: 'Boss',
  colleague: 'Colleague',
  partner: 'Cofounder',
  other: 'Other',
}

export function InviteAcceptSheet({
  inviterName,
  inviterNote,
  relationshipType,
  onOpen,
  onDismiss,
  openDisabled,
  consentSlot,
  relationshipLabel,
  copy,
  hero,
}: InviteAcceptSheetProps) {
  const merged = { ...DEFAULT_COPY, ...(copy ?? {}) }
  const relationship = relationshipLabel ?? RELATIONSHIP_LABEL[relationshipType]

  return (
    <View
      style={{
        backgroundColor: kindredDark.bg,
        paddingHorizontal: kindredSpacing.screenH,
        paddingTop: kindredSpacing.xl,
        paddingBottom: kindredSpacing.xxl,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        gap: kindredSpacing.xl,
      }}
    >
      {/* Drag handle */}
      <View
        style={{
          alignSelf: 'center',
          width: 36,
          height: 3,
          borderRadius: 2,
          backgroundColor: kindredDark.borderStrong,
          marginBottom: kindredSpacing.md,
        }}
      />

      <View style={{ alignItems: 'center', gap: kindredSpacing.md }}>
        {hero ?? <KindredSeal mode='static' size={72} />}
        <Text style={[kindredType.heading, { color: kindredDark.text, textAlign: 'center' }]}>
          {merged.prefix}
          <Text style={{ color: kindredDark.accent }}>{inviterName}</Text>
          {merged.suffix}
        </Text>
        <Text style={[kindredType.caption, { color: kindredDark.textSecondary }]}>
          {merged.relationshipPrefix}
          {relationship}
        </Text>
      </View>

      {inviterNote && (
        <View
          style={{
            padding: kindredSpacing.lg,
            backgroundColor: kindredDark.card,
            borderLeftWidth: 2,
            borderLeftColor: kindredDark.accent,
          }}
        >
          <Text style={[kindredType.body, { color: kindredDark.text, fontStyle: 'italic' }]}>
            "{inviterNote}"
          </Text>
        </View>
      )}

      <View style={{ alignItems: 'center', gap: kindredSpacing.md }}>
        <Pressable onPress={onOpen} hitSlop={12} disabled={openDisabled}>
          <Text style={[kindredPresets.ctaText, openDisabled && { opacity: 0.35 }]}>
            {merged.open}
          </Text>
        </Pressable>
        {consentSlot}
        <Pressable onPress={onDismiss} hitSlop={12}>
          <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>
            {merged.later}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
