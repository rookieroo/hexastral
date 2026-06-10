/**
 * ThreadListItem — one lean thread row on the home's 宣纸 list.
 *
 * Tap → the thread's report. Left-swipe reveals the per-bond entries (2026-06:
 * "timeline & make-if 以合盘为单位 … 列表 item 左滑给入口"): for an active bond,
 * [Timeline · Make-if · Delete]; otherwise just Delete. Timeline + make-if are
 * the subscription living layer, scoped to THIS bond.
 */

import { kindredPaper, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import type { BondData, BondStatus } from '@zhop/scenario-kindred'
import { ChevronRight, GitCommitVertical, Trash2, Wand2 } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable'
import { EssenceTag } from '@/components/EssenceTag'
import { hasValidElements } from '@/components/ink/InkCenterpiece'
import { resolveBondDisplayName } from '@/lib/bondName'
import { type Locale, relativeSentLabel, t } from '@/lib/i18n'

/** Per-status label + paper-ink tint for the row's "info filled?" line. */
function statusMeta(status: BondStatus, locale: Locale): { label: string; color: string } {
  switch (status) {
    case 'active':
      return { label: t(locale, 'bond.statusActive'), color: kindredPaper.cinnabar }
    case 'pending_invite':
      return { label: t(locale, 'bond.statusPending'), color: kindredPaper.inkSoft }
    case 'declined':
      return { label: t(locale, 'bond.statusDeclined'), color: kindredPaper.muted }
    case 'expired':
      return { label: t(locale, 'bond.statusExpired'), color: kindredPaper.muted }
    default:
      return { label: '', color: kindredPaper.muted }
  }
}

export interface ThreadListItemProps {
  bond: BondData
  locale: Locale
  onPress: () => void
  onDelete: () => void
  /** Per-bond living-layer entries (active bonds only). */
  onTimeline: () => void
  onMakeif: () => void
}

export function ThreadListItem({
  bond,
  locale,
  onPress,
  onDelete,
  onTimeline,
  onMakeif,
}: ThreadListItemProps) {
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
          {isActive ? (
            <>
              <SwipeAction
                icon={
                  <GitCommitVertical color={kindredPaper.ctaText} size={18} strokeWidth={1.7} />
                }
                label={t(locale, 'timeline.title')}
                bg={kindredPaper.ink}
                onPress={() => {
                  methods.close()
                  onTimeline()
                }}
              />
              <SwipeAction
                icon={<Wand2 color={kindredPaper.ctaText} size={18} strokeWidth={1.7} />}
                label={t(locale, 'makeif.cta')}
                bg={kindredPaper.bronze}
                onPress={() => {
                  methods.close()
                  onMakeif()
                }}
              />
            </>
          ) : null}
          <SwipeAction
            icon={<Trash2 color={kindredPaper.ctaText} size={18} strokeWidth={1.7} />}
            label={t(locale, 'bondList.delete')}
            bg={kindredPaper.cinnabar}
            onPress={() => {
              methods.close()
              onDelete()
            }}
          />
        </View>
      )}
    >
      <Pressable
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: kindredSpacing.md,
          paddingHorizontal: kindredSpacing.screenH,
          paddingVertical: kindredSpacing.lg,
          // Opaque paper so the swipe actions stay hidden until swiped.
          backgroundColor: kindredPaper.bg,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[kindredType.heading, { color: kindredPaper.ink }]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[kindredType.caption, { color: kindredPaper.inkSoft }]} numberOfLines={1}>
            {relTag ? `${relTag} · ` : ''}
            {relativeSentLabel(locale, bond.createdAt)}
          </Text>
          {status.label ? (
            <Text style={[kindredType.caption, { color: status.color }]}>{status.label}</Text>
          ) : null}
        </View>
        {hasValidElements(bond.aElement ?? undefined, bond.bElement ?? undefined) ? (
          <EssenceTag aElement={bond.aElement} bElement={bond.bElement} locale={locale} onPaper />
        ) : (
          <ChevronRight color={kindredPaper.muted} size={20} strokeWidth={1.2} />
        )}
      </Pressable>
    </ReanimatedSwipeable>
  )
}

/** One swipe-reveal action — icon over a short label on a solid ink/bronze/cinnabar block. */
function SwipeAction({
  icon,
  label,
  bg,
  onPress,
}: {
  icon: ReactNode
  label: string
  bg: string
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
        style={{ color: kindredPaper.ctaText, fontSize: 11, fontWeight: '600' }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  )
}
