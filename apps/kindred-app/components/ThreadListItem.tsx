/**
 * ThreadListItem — one thread on the home's night-sky list.
 *
 * Each relationship reads as a STAR: a glowing element-coloured node (the OTHER
 * person's 五行, the same hue as their star in the SkyHero above — list and sky never
 * disagree), a serif name, a mono small-caps meta line (relationship · time), and a
 * right-slot essence (相生/比和/相克 via the shared EssenceTag, so the chip and the
 * report's ink stay in sync). Pending shows an unlit hollow star + a quiet status; a
 * stale report carries an INLINE "earlier birth · recompute" (no boxed badge). Tap →
 * the report; left-swipe → 解缘.
 *
 * The stars stand on their own as a quiet list — the earlier cinnabar 红线 that strung
 * them down the node column was dropped (2026-06) as too busy.
 */

import { kindredDark, kindredSpacing } from '@zhop/hexastral-tokens/kindred'
import { type BondData, type BondStatus, kindredFonts } from '@zhop/scenario-kindred'
import { Clock, Unlink } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable'
import { EssenceTag } from '@/components/EssenceTag'
import { resolveBondDisplayName } from '@/lib/bondName'
import { bondQuality } from '@/lib/bondQuality'
import { type Locale, relativeSentLabel, relativeTimeLabel, t } from '@/lib/i18n'

/** The counterpart's 意象 colour = their SkyHero star hue (same halo colours), so the
 *  bead reads as "their star, here in the list". Unknown → cool silver. */
const STAR_HUE: Record<string, string> = {
  木: '#86b66f',
  火: '#d2745a',
  土: '#c4a067',
  金: '#cfc8b0',
  水: '#6f9cc8',
}
const STAR_HUE_FALLBACK = '#bcccea'

/** Localized accessibility label for the status (carried by the row, not an icon). */
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
  const el = bond.counterpartElement ?? undefined
  const lit = isActive && !!(el && STAR_HUE[el])
  const hue = (el && STAR_HUE[el]) || STAR_HUE_FALLBACK

  // Pending → when the invite went out; completed → when the report was generated.
  const timeLabel = isPending
    ? relativeSentLabel(locale, bond.createdAt)
    : isActive && bond.generatedAt
      ? relativeTimeLabel(locale, bond.generatedAt)
      : ''
  const meta = [relTag, timeLabel].filter(Boolean).join(' · ')

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
          // Opaque ground so the swipe actions stay hidden until swiped.
          backgroundColor: kindredDark.bg,
        }}
      >
        {/* Their star — in their 五行 hue (lit) or an unlit ring (pending / no reading
            yet), centred in the row's 30px node column. */}
        <ThreadStar hue={hue} lit={lit} />

        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
          <Text
            style={{
              fontFamily: kindredFonts.serif,
              fontSize: 21,
              lineHeight: 27,
              color: isActive ? kindredDark.text : kindredDark.textSecondary,
            }}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {/* One quiet line: who they are to you · when — mono small-caps, the
              editorial counter to the serif name. */}
          {meta ? (
            <Text
              style={{
                fontFamily: kindredFonts.mono,
                fontSize: 11,
                letterSpacing: 1.1,
                textTransform: 'uppercase',
                color: kindredDark.textMuted,
              }}
              numberOfLines={1}
            >
              {meta}
            </Text>
          ) : null}
          {/* Stale basis — INLINE now (was a bordered badge): a quiet sentence, then
              the Pro recompute link. The report stays as-is; this just flags the basis. */}
          {bond.basedOnStaleBirth ? (
            <View style={{ marginTop: 3, gap: 4, alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 11, lineHeight: 15, color: kindredDark.textMuted }}>
                {t(locale, 'bond.staleBirth')}
              </Text>
              {onRecompute ? (
                <Pressable onPress={onRecompute} hitSlop={6} accessibilityRole='button'>
                  <Text
                    style={{
                      fontFamily: kindredFonts.mono,
                      fontSize: 11,
                      letterSpacing: 0.6,
                      color: kindredDark.accent,
                    }}
                  >
                    {t(locale, 'bond.recompute')} →
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Right slot: a completed bond shows its 合盘综合评价 essence (相生/比和/相克)
            via the shared EssenceTag — the same 意象 the report + InkCenterpiece use; a
            pending invite shows a quiet clock + status; declined/expired show nothing. */}
        {isActive ? (
          <EssenceTag aElement={bond.aElement} bElement={bond.bElement} locale={locale} compact />
        ) : isPending ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Clock color={kindredDark.textMuted} size={14} strokeWidth={1.7} />
            <Text
              style={{
                fontFamily: kindredFonts.mono,
                fontSize: 11,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: kindredDark.textMuted,
              }}
            >
              {t(locale, 'bond.statusPending')}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </ReanimatedSwipeable>
  )
}

/** A star node: a glowing element star (lit) or an unlit ring (pending / no reading).
 *  A 30px disc on the screen ground holds it centred in the row's node column; the
 *  glow is a cheap 3-layer stack (no Skia surface per row). */
function ThreadStar({ hue, lit }: { hue: string; lit: boolean }) {
  return (
    <View
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: kindredDark.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {lit ? (
        <>
          <View
            style={{
              position: 'absolute',
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: hue,
              opacity: 0.12,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: 15,
              height: 15,
              borderRadius: 8,
              backgroundColor: hue,
              opacity: 0.22,
            }}
          />
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: hue,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 3,
                height: 3,
                borderRadius: 1.5,
                backgroundColor: kindredDark.accent,
              }}
            />
          </View>
        </>
      ) : (
        <View
          style={{
            width: 9,
            height: 9,
            borderRadius: 5,
            borderWidth: 1,
            borderColor: kindredDark.textMuted,
            opacity: 0.7,
          }}
        />
      )}
    </View>
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
