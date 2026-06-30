/**
 * (tabs)/readings — past reports grouped by site (Yuel night surface).
 *
 * Reached from Settings → tools. Re-uses useFengSiteList (which embeds latest
 * report timestamp via the GET /api/feng/sites/:id payload) and renders a flat
 * list sorted by updatedAt. V1.1 will add server-side pagination + chapter
 * previews via a dedicated /api/feng/readings route.
 */

import { useHaptic } from '@zhop/core-ui'
import { useFengSiteList } from '@zhop/scenario-feng'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { FlatList, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { resolveLocale, useStrings } from '@/lib/i18n'
import { FENG_PALETTE, spacing } from '@/lib/theme'

export default function ReadingsTab() {
  const router = useRouter()
  const t = useStrings(resolveLocale())
  const haptic = useHaptic()
  const insets = useSafeAreaInsets()
  const { sites, isLoading } = useFengSiteList()

  return (
    <View style={{ flex: 1, backgroundColor: FENG_PALETTE.night }}>
      <StatusBar style='light' />
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole='button'
          accessibilityLabel={t.nav_back}
          hitSlop={12}
        >
          <Text style={{ color: FENG_PALETTE.copperGold, fontSize: 24 }}>‹</Text>
        </Pressable>
        <Text style={{ color: FENG_PALETTE.rice, fontSize: 18, fontWeight: '700' }}>
          {t.tab_readings}
        </Text>
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
        ListEmptyComponent={
          isLoading ? null : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: FENG_PALETTE.riceMute, fontSize: 14 }}>{t.report_pending}</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const updated = t.readings_updated.replace(
            '{date}',
            new Date(item.updatedAt).toLocaleDateString()
          )
          return (
            <Pressable
              onPress={() => {
                void haptic('light')
                router.push({ pathname: '/(report)/[siteId]', params: { siteId: item.id } })
              }}
              accessibilityRole='button'
              accessibilityLabel={`${item.name}, ${updated}`}
              style={{
                backgroundColor: FENG_PALETTE.nightRaised,
                borderWidth: 1,
                borderColor: FENG_PALETTE.hairline,
                borderRadius: 14,
                padding: spacing.lg,
                gap: 4,
              }}
            >
              <Text style={{ fontWeight: '700', fontSize: 16, color: FENG_PALETTE.rice }}>
                {item.name}
              </Text>
              <Text style={{ color: FENG_PALETTE.riceMute, fontSize: 12 }}>{updated}</Text>
            </Pressable>
          )
        }}
      />
    </View>
  )
}
