/**
 * (tabs)/index — Sites home.
 *
 * Lists the current user's Fēng sites. Each card taps into the latest
 * report (if any), or back into the new-site flow if the user has none.
 * Pull-to-refresh re-runs useFengSiteList.
 *
 * Phase F migration: site cards use <Card> with elevation; add-site CTA uses
 * <Button> for press-state + haptic; empty state uses <EmptyState>. The 風
 * brand glyph stays inline (it's identity, not chrome).
 */

import { Button, Card, EmptyState, useHaptic, useTheme } from '@zhop/core-ui'
import { type FengSite, useFengSiteList } from '@zhop/scenario-feng'
import { useRouter } from 'expo-router'
import { Plus } from 'lucide-react-native'
import { useCallback } from 'react'
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { resolveLocale, useStrings } from '@/lib/i18n'

export default function SitesTab() {
  const router = useRouter()
  const { colors, spacing } = useTheme()
  const t = useStrings(resolveLocale())
  const haptic = useHaptic()
  const insets = useSafeAreaInsets()
  const { sites, isLoading, refetch } = useFengSiteList()

  const addSite = useCallback(() => {
    router.push('/(new-site)/address')
  }, [router])

  const openSite = useCallback(
    (site: FengSite) => {
      void haptic('light')
      router.push({ pathname: '/(report)/[siteId]', params: { siteId: site.id } })
    },
    [router, haptic]
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + spacing.md }}>
      <View
        style={{
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ fontSize: 32, color: colors.accent, fontWeight: '700' }}>風</Text>
        <Button
          variant='primary'
          size='sm'
          leadingIcon={<Plus color={colors.bg} size={16} />}
          onPress={addSite}
        >
          {t.empty_cta}
        </Button>
      </View>

      <FlatList
        data={sites}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          gap: spacing.md,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <EmptyState title={t.empty_title} subtitle={t.empty_subtitle} />
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openSite(item)}
            accessibilityRole='button'
            accessibilityLabel={`${item.name}, ${item.formattedAddress}`}
          >
            <Card variant='elevated' padding='lg'>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
                {item.name}
              </Text>
              <Text style={{ fontSize: 13, color: colors.secondary, marginTop: 4 }}>
                {item.formattedAddress}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
                <Text style={{ fontSize: 12, color: colors.accent }}>
                  向 {Math.round(item.facingDegTrue)}°
                </Text>
                {item.buildYear ? (
                  <Text style={{ fontSize: 12, color: colors.secondary }}>{item.buildYear}</Text>
                ) : null}
              </View>
            </Card>
          </Pressable>
        )}
      />
    </View>
  )
}
