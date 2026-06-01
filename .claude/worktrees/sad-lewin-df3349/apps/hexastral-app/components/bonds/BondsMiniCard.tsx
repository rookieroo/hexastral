/**
 * BondsMiniCard — Compact bonds widget for the Fate (home) page
 *
 * Shows the top 1–2 bonds by score with avatars, names, and archetype.
 * Empty state shows a "Connect with someone" CTA.
 * Tapping navigates to the full Bonds tab.
 */

import { useRouter } from 'expo-router'
import { ChevronRight, Heart } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'
import { DefaultAvatar } from '@/components/ui/DefaultAvatar'
import { useAuth } from '@/lib/auth'
import type { BondData } from '@/lib/domain/bonds'
import { useBondsQuery } from '@/lib/hooks/useBondsQuery'
import { useI18n } from '@/lib/i18n'
import { useIosPalette, useTheme } from '@/lib/theme'
import type { ArchetypeCategory } from '@/lib/ui-mapping'
import { archetypeCategoryColor } from '@/lib/ui-mapping'
import { getAvatarIndex } from '@/lib/ux/avatar'

export function BondsMiniCard() {
  const { isDark } = useTheme()
  const ios = useIosPalette()
  const { t } = useI18n()
  const { userId } = useAuth()
  const router = useRouter()
  const { data: bonds = [] } = useBondsQuery(userId)

  const activeBonds = bonds
    .filter((b) => b.status === 'active' && b.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 2)

  return (
    <Pressable
      onPress={() => router.push('/(tabs)/friends')}
      style={({ pressed }) => ({
        borderWidth: 0.5,
        borderColor: ios.separator,
        padding: 16,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: activeBonds.length > 0 ? 12 : 0,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Heart size={12} color={ios.accent} strokeWidth={1.5} />
          <Text
            style={{
              fontSize: 10,
              fontWeight: '500',
              color: ios.secondary,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            {t('tab_friends')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: '300',
              color: ios.dim,
              letterSpacing: 1,
            }}
          >
            {activeBonds.length > 0 ? t('bonds_view_all') : t('bonds_create_cta')}
          </Text>
          <ChevronRight size={12} color={ios.dim} strokeWidth={1.2} />
        </View>
      </View>

      {/* Bond rows or empty state */}
      {activeBonds.length > 0 ? (
        <View style={{ gap: 10 }}>
          {activeBonds.map((bond) => (
            <MiniRow key={bond.id} bond={bond} isDark={isDark} ios={ios} />
          ))}
        </View>
      ) : (
        <Text
          style={{
            fontSize: 12,
            fontWeight: '300',
            color: ios.dim,
            textAlign: 'center',
            paddingVertical: 8,
            letterSpacing: 0.3,
          }}
        >
          {t('bonds_empty_hint')}
        </Text>
      )}
    </Pressable>
  )
}

function MiniRow({
  bond,
  isDark,
  ios,
}: {
  bond: BondData
  isDark: boolean
  ios: ReturnType<typeof useIosPalette>
}) {
  const categoryColor = bond.archetypeCategory
    ? archetypeCategoryColor(bond.archetypeCategory as ArchetypeCategory, isDark)
    : ios.secondary

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <DefaultAvatar
        index={getAvatarIndex(bond.targetUserId ?? bond.id)}
        size={28}
        isDark={isDark}
      />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text
          style={{ fontSize: 13, fontWeight: '400', color: ios.text, letterSpacing: 0.2 }}
          numberOfLines={1}
        >
          {bond.targetName}
        </Text>
        {bond.archetypeTagline ? (
          <Text
            style={{
              fontSize: 10,
              fontWeight: '300',
              color: categoryColor,
              letterSpacing: 0.2,
            }}
            numberOfLines={1}
          >
            {bond.archetypeTagline}
          </Text>
        ) : null}
      </View>
      {bond.score != null ? (
        <Text
          style={{
            fontSize: 16,
            fontWeight: '200',
            color: categoryColor,
            letterSpacing: -0.5,
            marginLeft: 8,
          }}
        >
          {bond.score}
        </Text>
      ) : null}
    </View>
  )
}
