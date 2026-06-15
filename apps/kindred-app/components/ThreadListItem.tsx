/**
 * ThreadListItem — one thread row on the home's night-sky list.
 *
 * Each row carries a small gold star at the left, echoing the SkyHero above (a
 * thread IS a star in your orbit). Tap → the thread's report. Left-swipe reveals
 * 解缘 (release the bond — gentler than "delete", matching the 缘 brand; the
 * destructive confirm still spells out that it's irreversible). (Timeline +
 * What-if — the subscription living layer — moved OFF the
 * swipe to a prominent floating entry IN the report, 2026-06: "核心功能左滑出现
 * 有点浪费" — see components/reading/LivingLayerFab.)
 */

import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import type { BondData, BondStatus } from '@zhop/scenario-kindred'
import { ChevronRight, Unlink } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable'
import { EssenceTag } from '@/components/EssenceTag'
import { hasValidElements } from '@/components/ink/InkCenterpiece'
import { resolveBondDisplayName } from '@/lib/bondName'
import { type Locale, relativeSentLabel, t } from '@/lib/i18n'

/** Per-status label + tint for the row's "info filled?" line. */
function statusMeta(status: BondStatus, locale: Locale): { label: string; color: string } {
  switch (status) {
    case 'active':
      return { label: t(locale, 'bond.statusActive'), color: kindredDark.seal }
    case 'pending_invite':
      return { label: t(locale, 'bond.statusPending'), color: kindredDark.textSecondary }
    case 'declined':
      return { label: t(locale, 'bond.statusDeclined'), color: kindredDark.textMuted }
    case 'expired':
      return { label: t(locale, 'bond.statusExpired'), color: kindredDark.textMuted }
    default:
      return { label: '', color: kindredDark.textMuted }
  }
}

export interface ThreadListItemProps {
  bond: BondData
  locale: Locale
  /** Receives the tap's page coords so the report blooms from the tapped row. */
  onPress: (origin?: { x: number; y: number }) => void
  onDelete: () => void
}

export function ThreadListItem({ bond, locale, onPress, onDelete }: ThreadListItemProps) {
  const status = statusMeta(bond.status, locale)
  // Specific name as title; fall back to the relationship (and strip the legacy
  // literal "Unknown"). See lib/bondName.ts.
  const { displayName, relTag } = resolveBondDisplayName(bond)
  const isActive = bond.status === 'active'

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
            bg={kindredDark.seal}
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
        {/* A small gold star — this thread, a body in your orbit (echoes SkyHero). */}
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: kindredDark.accent,
            opacity: isActive ? 0.9 : 0.4,
          }}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[kindredType.heading, { color: kindredDark.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text
            style={[kindredType.caption, { color: kindredDark.textSecondary }]}
            numberOfLines={1}
          >
            {relTag ? `${relTag} · ` : ''}
            {relativeSentLabel(locale, bond.createdAt)}
          </Text>
          {status.label ? (
            <Text style={[kindredType.caption, { color: status.color }]}>{status.label}</Text>
          ) : null}
          {/* This report predates a later birth-info edit — it stays as-is, but the
              basis is flagged so the older 生辰 it used is clear. */}
          {bond.basedOnStaleBirth ? (
            <View
              style={{
                alignSelf: 'flex-start',
                marginTop: 2,
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
          ) : null}
        </View>
        {hasValidElements(bond.aElement ?? undefined, bond.bElement ?? undefined) ? (
          <EssenceTag aElement={bond.aElement} bElement={bond.bElement} locale={locale} />
        ) : (
          <ChevronRight color={kindredDark.textMuted} size={20} strokeWidth={1.2} />
        )}
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
