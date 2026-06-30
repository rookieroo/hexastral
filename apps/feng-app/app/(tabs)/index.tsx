/**
 * Home — the Fēng night surface (Yuel model: no tabs).
 *
 * Brand mark (風) top-left, Settings gear top-right; the user's sites as ink
 * cards on the 墨青 ground; a persistent 朱砂 FAB to add a site; a left-swipe
 * (blank space) opens Settings — mirroring kindred's home gesture. Tapping a
 * site opens its report. Empty state surfaces a first-site invite.
 */

import { useHaptic } from '@zhop/core-ui'
import { type FengSite, useFengSiteList } from '@zhop/scenario-feng'
import { useRouter } from 'expo-router'
import { Plus, Settings } from 'lucide-react-native'
import { useCallback } from 'react'
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { resolveLocale, useStrings } from '@/lib/i18n'
import { FENG_PALETTE, spacing } from '@/lib/theme'

export default function HomeScreen() {
  const router = useRouter()
  const t = useStrings(resolveLocale())
  const haptic = useHaptic()
  const insets = useSafeAreaInsets()
  const { sites, isLoading, refetch } = useFengSiteList()

  const openSettings = useCallback(() => {
    void haptic('light')
    router.push('/(tabs)/profile')
  }, [router, haptic])

  const addSite = useCallback(() => {
    void haptic('medium')
    router.push('/(new-site)/address')
  }, [router, haptic])

  const openSite = useCallback(
    (site: FengSite) => {
      void haptic('light')
      router.push({ pathname: '/(report)/[siteId]', params: { siteId: site.id } })
    },
    [router, haptic]
  )

  // Left-swipe on the list ground → Settings (kindred parity).
  const swipeToSettings = Gesture.Pan()
    .activeOffsetX([-18, 18])
    .failOffsetY([-16, 16])
    .onEnd((e) => {
      if (e.translationX < -55 || e.velocityX < -650) runOnJS(openSettings)()
    })

  return (
    <View style={{ flex: 1, backgroundColor: FENG_PALETTE.inkTeal }}>
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ fontSize: 30, color: FENG_PALETTE.copperGold, fontWeight: '700' }}>風</Text>
        <Pressable
          onPress={openSettings}
          accessibilityRole='button'
          accessibilityLabel={t.tab_profile}
          hitSlop={12}
        >
          <Settings color={FENG_PALETTE.riceMute} size={22} />
        </Pressable>
      </View>

      <GestureDetector gesture={swipeToSettings}>
        <FlatList
          data={sites}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            paddingBottom: insets.bottom + 96,
            gap: spacing.md,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor={FENG_PALETTE.copperGold}
            />
          }
          ListEmptyComponent={
            isLoading ? null : (
              <View
                style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm }}
              >
                <Text style={{ fontSize: 18, fontWeight: '700', color: FENG_PALETTE.rice }}>
                  {t.empty_title}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: FENG_PALETTE.riceMute,
                    textAlign: 'center',
                    paddingHorizontal: spacing.xl,
                    lineHeight: 21,
                  }}
                >
                  {t.empty_subtitle}
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openSite(item)}
              accessibilityRole='button'
              accessibilityLabel={`${item.name}, ${item.formattedAddress}`}
              style={{
                backgroundColor: 'rgba(245,239,227,0.05)',
                borderWidth: 1,
                borderColor: 'rgba(176,141,91,0.18)',
                borderRadius: 14,
                padding: spacing.lg,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '700', color: FENG_PALETTE.rice }}>
                {item.name}
              </Text>
              <Text style={{ fontSize: 13, color: FENG_PALETTE.riceMute, marginTop: 4 }}>
                {item.formattedAddress}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
                <Text style={{ fontSize: 12, color: FENG_PALETTE.copperGold }}>
                  向 {Math.round(item.facingDegTrue)}°
                </Text>
                {item.buildYear ? (
                  <Text style={{ fontSize: 12, color: FENG_PALETTE.riceMute }}>
                    {item.buildYear}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      </GestureDetector>

      {/* 朱砂 FAB — add a site (persistent). */}
      <Pressable
        onPress={addSite}
        accessibilityRole='button'
        accessibilityLabel={t.empty_cta}
        style={{
          position: 'absolute',
          bottom: insets.bottom + spacing.lg,
          alignSelf: 'center',
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderRadius: 999,
          backgroundColor: FENG_PALETTE.cinnabar,
          shadowColor: '#000',
          shadowOpacity: 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
      >
        <Plus color={FENG_PALETTE.rice} size={18} />
        <Text style={{ color: FENG_PALETTE.rice, fontWeight: '700', fontSize: 15 }}>
          {t.empty_cta}
        </Text>
      </Pressable>
    </View>
  )
}
