/**
 * ThreadListItem — one lean, swipe-to-delete thread row.
 *
 * Shared by the home (the primary thread list lives there now, 2026-06: "Threads
 * 列表直接放首页") and the secondary Threads screen, so they never diverge. Shows
 * name · relationship · when-started + a status line, with the pair's 生克 essence
 * (or a chevron) on the right. Tap → the thread's report; swipe left → Delete.
 */

import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import type { BondData, BondStatus } from '@zhop/scenario-kindred'
import { ChevronRight } from 'lucide-react-native'
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
      return { label: t(locale, 'bond.statusActive'), color: kindredDark.accent }
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

export function ThreadListItem({
  bond,
  locale,
  onPress,
  onDelete,
}: {
  bond: BondData
  locale: Locale
  onPress: () => void
  onDelete: () => void
}) {
  const status = statusMeta(bond.status, locale)
  // Specific name as title; fall back to the relationship (and strip the legacy
  // literal "Unknown"). See lib/bondName.ts.
  const { displayName, relTag } = resolveBondDisplayName(bond)

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={(_progress, _translation, methods) => (
        <Pressable
          onPress={() => {
            methods.close()
            onDelete()
          }}
          accessibilityRole='button'
          accessibilityLabel={t(locale, 'bondList.delete')}
          style={{
            width: 92,
            backgroundColor: kindredDark.seal,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: kindredDark.text, fontSize: 15, fontWeight: '600' }}>
            {t(locale, 'bondList.delete')}
          </Text>
        </Pressable>
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
          // Opaque so the red Delete action stays hidden until swiped.
          backgroundColor: kindredDark.bg,
        }}
      >
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
