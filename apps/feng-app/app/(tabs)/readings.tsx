/**
 * (tabs)/readings — past reports grouped by site.
 *
 * V1 keeps it minimal: re-use useFengSiteList (which embeds latest report
 * timestamp via the GET /api/feng/sites/:id payload) and render a flat list
 * sorted by updatedAt. V1.1 will add server-side pagination + chapter
 * previews via a dedicated /api/feng/readings route.
 *
 * Phase F migration: rows use <Card>; empty state uses <EmptyState>.
 */

import { Card, EmptyState, useTheme } from '@zhop/core-ui'
import { useFengSiteList } from '@zhop/scenario-feng'
import { useRouter } from 'expo-router'
import { FlatList, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { resolveLocale, useStrings } from '@/lib/i18n'

export default function ReadingsTab() {
  const router = useRouter()
  const { colors, spacing } = useTheme()
  const t = useStrings(resolveLocale())
  const insets = useSafeAreaInsets()
  const { sites, isLoading } = useFengSiteList()

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + spacing.xl }}>
      <Text
        style={{
          fontSize: 28,
          fontWeight: '700',
          color: colors.text,
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing.md,
        }}
      >
        {t.tab_readings}
      </Text>
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
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <EmptyState title={t.report_pending} />
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/(report)/[siteId]', params: { siteId: item.id } })
            }
          >
            <Card variant='elevated' padding='lg' style={{ gap: 4 }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: colors.text }}>
                {item.name}
              </Text>
              <Text style={{ color: colors.secondary, fontSize: 12 }}>
                Updated {new Date(item.updatedAt).toLocaleDateString()}
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </View>
  )
}
