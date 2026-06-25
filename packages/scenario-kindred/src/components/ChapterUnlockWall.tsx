/**
 * ChapterUnlockWall — the trailing "page" of a gated SynastryReport.
 *
 * Shown after the free chapters when `lockedChapters` is non-empty. It leads
 * with the `ahaHook` (the single most striking, chart-specific assertion about
 * the pair) to create the curiosity gap, previews the locked chapters' golden
 * lines as teasers, and offers the unlock paths in this order:
 *
 *   1. One-time unlock — single purchase of this one report (PRIMARY)
 *   2. Share with a friend — the optional social path (secondary)
 *
 * The single purchase (IAP) is the primary, always-available unlock so the wall
 * never gates content behind a store action (App Store Review 3.2.2(x)) — the
 * share path is a soft, secondary alternative, never the only way through.
 *
 * A subscription does NOT unlock a 合盘 (Yuel Pro is the 体验层), so the subscribe
 * path is optional — only rendered when both `onSubscribe` + `subscribeCta` are
 * passed. Presentational only: copy + handlers are injected so the package stays
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
import Svg, { Path, Rect } from 'react-native-svg'
import type { LockedSynastryChapter } from '../types'

/** A small padlock, drawn with react-native-svg (the package's icon dep) — a real
 *  vector glyph in place of the 🔒 emoji. */
function LockGlyph({ size = 13, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none'>
      <Rect x={4} y={10.5} width={16} height={10} rx={2.5} stroke={color} strokeWidth={1.8} />
      <Path
        d='M7.5 10.5V7.5a4.5 4.5 0 0 1 9 0v3'
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap='round'
      />
    </Svg>
  )
}

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
  /** Secondary CTA — share with a friend (the soft, optional social path). */
  inviteCta: string
  /** One-line nudge under the share CTA, e.g. "对方加入后这一篇也会为你打开". */
  inviteHint?: string
  /** Primary CTA — one-time unlock; app formats the price in. */
  purchaseCta: string
  /** Tertiary CTA — subscribe (optional; a subscription does NOT unlock a 合盘). */
  subscribeCta?: string
}

export interface ChapterUnlockWallProps {
  /** The aha-hook assertion — the conversion centerpiece. */
  ahaHook?: string
  lockedChapters: LockedSynastryChapter[]
  labels: ChapterUnlockWallLabels
  onInvite: () => void
  onPurchase: () => void
  /** Optional — omit when a subscription doesn't unlock this report. */
  onSubscribe?: () => void
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
              <LockGlyph size={13} color={C.textMuted} />
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

      {/* CTA 1 — one-time unlock (PRIMARY, filled). The IAP path is the headline
          unlock so content is never gated behind a store action (3.2.2(x)). */}
      <Pressable
        onPress={onPurchase}
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
          {labels.purchaseCta}
        </Text>
      </Pressable>

      {/* CTA 2 — share with a friend (secondary outline). A soft, optional social
          alternative — never the only way through the wall. */}
      <Pressable
        onPress={onInvite}
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

      {/* CTA 3 — subscribe (tertiary text link, positioned last). Only when a
          subscription path is wired; a 合盘 unlock is single-purchase only. */}
      {onSubscribe && labels.subscribeCta ? (
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
      ) : null}
    </ScrollView>
  )
}
