/**
 * ThreadListItem — one thread row on the home's night-sky list.
 *
 * Minimal by design (2026-06 "不要过度设计"): the OTHER person's 五行 意象图 leads
 * (their element imagery = their star in your orbit), then their name + a quiet
 * relationship line. STATUS is carried by the ROW BACKGROUND, not an icon — a
 * pending invite sits on a lifted surface (awaiting), a completed thread recedes
 * onto the base ground (a "done" check icon read as odd). No essence chip, no
 * coloured status text, no bullet. Tap → the thread's report; left-swipe reveals
 * 解缘 (release the bond).
 */

import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import type { BondData, BondStatus } from '@zhop/scenario-kindred'
import { Unlink } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable'
import { ElementGlyph } from '@/components/home/ElementGlyph'
import { resolveBondDisplayName } from '@/lib/bondName'
import { bondQuality } from '@/lib/bondQuality'
import { type Locale, relativeSentLabel, relativeTimeLabel, t } from '@/lib/i18n'

/** The counterpart's 意象图 colour = their SkyHero star hue (same halo colours), so
 *  the glyph reads as "their star, here in the list". Unknown → cool silver. */
const STAR_HUE: Record<string, string> = {
  木: '#86b66f',
  火: '#d2745a',
  土: '#c4a067',
  金: '#cfc8b0',
  水: '#6f9cc8',
}
const STAR_HUE_FALLBACK = '#bcccea'

/** Localized accessibility label for the status (carried by the row bg, not an icon). */
function statusA11y(status: BondStatus, locale: Locale): string {
  switch (status) {
    case 'active':
      return t(locale, 'bond.statusActive')
    case 'pending_invite':
      return t(locale, 'bond.statusPending')
    case 'declined':
      return t(locale, 'bond.statusDeclined')
    case 'expired':
      return t(locale, 'bond.statusExpired')
    default:
      return ''
  }
}

export interface ThreadListItemProps {
  bond: BondData
  locale: Locale
  /** Receives the tap's page coords so the report blooms from the tapped row. */
  onPress: (origin?: { x: number; y: number }) => void
  onDelete: () => void
  /** When the report is based on an earlier birth, offer a Pro recompute. Only
   *  wired (and only shown) for stale bonds. */
  onRecompute?: () => void
}

export function ThreadListItem({
  bond,
  locale,
  onPress,
  onDelete,
  onRecompute,
}: ThreadListItemProps) {
  // Specific name as title; fall back to the relationship (and strip the legacy
  // literal "Unknown"). See lib/bondName.ts.
  const { displayName, relTag } = resolveBondDisplayName(bond)
  const isActive = bond.status === 'active'
  const isPending = bond.status === 'pending_invite'
  // Pending → when the invite went out; completed → when the report was generated.
  const timeLabel = isPending
    ? relativeSentLabel(locale, bond.createdAt)
    : isActive && bond.generatedAt
      ? relativeTimeLabel(locale, bond.generatedAt)
      : ''
  const el = bond.counterpartElement ?? undefined
  const hue = (el && STAR_HUE[el]) || STAR_HUE_FALLBACK
  // Status by background: a pending invite is lifted (awaiting their reply), every
  // other state recedes onto the base ground. Both opaque so the swipe stays hidden.
  const rowBg = isPending ? kindredDark.cardElevated : kindredDark.bg

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={(_progress, _translation, methods) => (
        <View style={{ flexDirection: 'row' }}>
          <SwipeAction
            icon={<Unlink color={kindredDark.textOnDark} size={18} strokeWidth={1.7} />}
            label={t(locale, 'bondList.delete')}
            // 解缘 isn't always a loss. Only a 相生 bond (a real loss to cut) gets the
            // cinnabar weight; everything else reveals a calm neutral — releasing a
            // 相克 knot isn't an alarm. (Copy carries the stance; see lib/bondQuality.)
            bg={bondQuality(bond) === 'good' ? kindredDark.seal : '#3A3531'}
            onPress={() => {
              methods.close()
              onDelete()
            }}
          />
        </View>
      )}
    >
      <Pressable
        onPress={(e) => onPress({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}
        accessibilityRole='button'
        accessibilityLabel={`${displayName} · ${statusA11y(bond.status, locale)}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: kindredSpacing.md,
          paddingHorizontal: kindredSpacing.screenH,
          paddingVertical: kindredSpacing.lg,
          // Status by background (opaque so the swipe actions stay hidden until swiped).
          backgroundColor: rowBg,
        }}
      >
        {/* The other person's 五行 意象图 — their star, here in the list. A faint ring
            stands in for an unlit star while they haven't filled their birth in. */}
        <View style={{ width: 26, alignItems: 'center', justifyContent: 'center' }}>
          {el && STAR_HUE[el] ? (
            <View style={{ opacity: isActive ? 1 : 0.5 }}>
              <ElementGlyph element={el} color={hue} size={30} />
            </View>
          ) : (
            <View
              style={{
                width: 9,
                height: 9,
                borderRadius: 5,
                borderWidth: 1,
                borderColor: kindredDark.textMuted,
                opacity: 0.6,
              }}
            />
          )}
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[kindredType.heading, { color: kindredDark.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          {/* One quiet line: who they are to you · when. Pending shows the invite-sent
              time; a completed thread shows when its report was generated. */}
          {relTag || timeLabel ? (
            <Text
              style={[kindredType.caption, { color: kindredDark.textSecondary }]}
              numberOfLines={1}
            >
              {relTag ?? ''}
              {relTag && timeLabel ? ' · ' : ''}
              {timeLabel}
            </Text>
          ) : null}
          {/* This report predates a later birth-info edit — it stays as-is, but the
              basis is flagged (and, for Pro, a recompute-with-new-birth CTA). */}
          {bond.basedOnStaleBirth ? (
            <View style={{ marginTop: 2, gap: 4, alignItems: 'flex-start' }}>
              <View
                style={{
                  borderWidth: 0.5,
                  borderColor: kindredDark.border,
                  borderRadius: 4,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                }}
              >
                <Text style={[kindredType.caption, { color: kindredDark.textMuted, fontSize: 11 }]}>
                  {t(locale, 'bond.staleBirth')}
                </Text>
              </View>
              {onRecompute ? (
                <Pressable onPress={onRecompute} hitSlop={6} accessibilityRole='button'>
                  <Text style={[kindredType.caption, { color: kindredDark.accent, fontSize: 11 }]}>
                    {t(locale, 'bond.recompute')} →
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </Pressable>
    </ReanimatedSwipeable>
  )
}

/** One swipe-reveal action — icon over a short label on a solid block. */
function SwipeAction({
  icon,
  label,
  bg,
  fg,
  onPress,
}: {
  icon: ReactNode
  label: string
  bg: string
  /** Label colour — defaults to ivory; pass the dark ground for light-on-gold. */
  fg?: string
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={label}
      style={{
        width: 80,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
      }}
    >
      {icon}
      <Text
        style={{ color: fg ?? kindredDark.textOnDark, fontSize: 11, fontWeight: '600' }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  )
}
