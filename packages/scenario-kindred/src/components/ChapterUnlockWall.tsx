/**
 * ChapterUnlockWall — the trailing "page" of a gated SynastryReport.
 *
 * Shown after the free chapters when `lockedChapters` is non-empty. It leads
 * with the `ahaHook` (the single most striking, chart-specific assertion about
 * the pair) to create the curiosity gap, previews the locked chapters' golden
 * lines as teasers, and offers the three unlock paths in conversion order:
 *
 *   1. Invite the other person   — free + viral (drives the invite-unlock loop)
 *   2. One-time unlock           — single purchase of this one report
 *   3. Subscribe                 — unlimited, positioned last
 *
 * Presentational only: copy + handlers are injected so the package stays
 * i18n-agnostic (the app owns its locale layer).
 */

import { cinnabar, ink } from '@zhop/hexastral-tokens'
import {
  kindredDark,
  kindredLight,
  kindredSpacing,
  kindredType,
} from '@zhop/hexastral-tokens/kindred'
import { Pressable, ScrollView, Text, View } from 'react-native'
import type { LockedSynastryChapter } from '../types'

/** Surface theme — matches the report it trails (paper share/default · dark in-app). */
export type UnlockWallTheme = 'paper' | 'dark'

function wallPalette(theme: UnlockWallTheme) {
  if (theme === 'dark') {
    return {
      bg: kindredDark.bg,
      text: kindredDark.text,
      textSecondary: kindredDark.textSecondary,
      textMuted: kindredDark.textMuted,
      border: kindredDark.border,
      sealText: kindredDark.seal,
    }
  }
  return {
    bg: kindredLight.bg,
    text: kindredLight.text,
    textSecondary: kindredLight.textSecondary,
    textMuted: kindredLight.textMuted,
    border: kindredLight.border,
    sealText: cinnabar.seal,
  }
}

export interface ChapterUnlockWallLabels {
  /** e.g. "还有 3 章未解锁" — app formats the count in. */
  heading: string
  /** Primary CTA — invite the other person (free). */
  inviteCta: string
  /** One-line nudge under the invite CTA, e.g. "对方加入后即解锁全部". */
  inviteHint?: string
  /** Secondary CTA — one-time unlock; app formats the price in. */
  purchaseCta: string
  /** Tertiary CTA — subscribe. */
  subscribeCta: string
}

export interface ChapterUnlockWallProps {
  /** The aha-hook assertion — the conversion centerpiece. */
  ahaHook?: string
  lockedChapters: LockedSynastryChapter[]
  labels: ChapterUnlockWallLabels
  onInvite: () => void
  onPurchase: () => void
  onSubscribe: () => void
  /** Surface theme — 'paper' (default) or 'dark' (in-app 水墨黑 report). */
  theme?: UnlockWallTheme
}

export function ChapterUnlockWall({
  ahaHook,
  lockedChapters,
  labels,
  onInvite,
  onPurchase,
  onSubscribe,
  theme = 'paper',
}: ChapterUnlockWallProps) {
  const C = wallPalette(theme)
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{
        paddingHorizontal: kindredSpacing.screenH,
        paddingTop: kindredSpacing.xxl,
        paddingBottom: kindredSpacing.xxl,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Aha hook — the curiosity gap. Cinnabar rule above sets it apart. */}
      {ahaHook ? (
        <View style={{ marginBottom: kindredSpacing.xxl }}>
          <View
            style={{
              width: 40,
              height: 2,
              backgroundColor: cinnabar.seal,
              marginBottom: kindredSpacing.lg,
            }}
          />
          <Text style={[kindredType.title, { color: C.text }]}>{ahaHook}</Text>
        </View>
      ) : null}

      <Text
        style={[
          kindredType.caption,
          { color: C.textSecondary, marginBottom: kindredSpacing.lg, letterSpacing: 2 },
        ]}
      >
        {labels.heading}
      </Text>

      {/* Locked chapter teasers — title clear, golden line dimmed behind a lock. */}
      <View style={{ gap: kindredSpacing.md, marginBottom: kindredSpacing.xxl }}>
        {lockedChapters.map((ch, i) => (
          <View
            key={`${ch.kind}-${i}`}
            style={{
              borderWidth: 0.5,
              borderColor: C.border,
              borderRadius: 10,
              paddingVertical: kindredSpacing.md,
              paddingHorizontal: kindredSpacing.lg,
              gap: 4,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 12, color: C.textMuted }}>🔒</Text>
              <Text style={[kindredType.caption, { color: C.text }]}>{ch.title}</Text>
            </View>
            {ch.goldenLine ? (
              <Text
                style={[kindredType.body, { color: C.textMuted, fontStyle: 'italic' }]}
                numberOfLines={2}
              >
                {ch.goldenLine}
              </Text>
            ) : null}
          </View>
        ))}
      </View>

      {/* CTA 1 — invite (primary, free + viral). */}
      <Pressable
        onPress={onInvite}
        accessibilityRole='button'
        style={({ pressed }) => ({
          backgroundColor: cinnabar.seal,
          borderRadius: 10,
          paddingVertical: kindredSpacing.md,
          alignItems: 'center',
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text style={[kindredType.body, { color: ink.gold, fontWeight: '600' }]}>
          {labels.inviteCta}
        </Text>
      </Pressable>
      {labels.inviteHint ? (
        <Text
          style={[
            kindredType.caption,
            {
              color: C.textMuted,
              textAlign: 'center',
              marginTop: kindredSpacing.sm,
            },
          ]}
        >
          {labels.inviteHint}
        </Text>
      ) : null}

      {/* CTA 2 — one-time unlock (secondary outline). */}
      <Pressable
        onPress={onPurchase}
        accessibilityRole='button'
        style={({ pressed }) => ({
          marginTop: kindredSpacing.lg,
          borderWidth: 1,
          borderColor: cinnabar.seal,
          borderRadius: 10,
          paddingVertical: kindredSpacing.md,
          alignItems: 'center',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text style={[kindredType.body, { color: C.sealText, fontWeight: '500' }]}>
          {labels.purchaseCta}
        </Text>
      </Pressable>

      {/* CTA 3 — subscribe (tertiary text link, positioned last). */}
      <Pressable
        onPress={onSubscribe}
        accessibilityRole='button'
        hitSlop={8}
        style={{ marginTop: kindredSpacing.xl, alignSelf: 'center' }}
      >
        <Text
          style={[
            kindredType.caption,
            { color: C.textSecondary, textDecorationLine: 'underline' },
          ]}
        >
          {labels.subscribeCta}
        </Text>
      </Pressable>
    </ScrollView>
  )
}
