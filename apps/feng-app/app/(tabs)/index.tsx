/**
 * Home — the Fēng night surface (Yuel model: no tabs).
 *
 * Brand mark (風) top-left, fingerprint menu top-right (→ Settings); the user's
 * sites as ink cards on the 墨青 ground; a persistent 铜金 FAB to add a site; a left-swipe
 * (blank space) opens Settings — mirroring kindred's home gesture. Tapping a
 * site opens its report. Empty state surfaces a first-site invite.
 */

import { useHaptic } from '@zhop/core-ui'
import { type FengSite, useFengSiteList } from '@zhop/scenario-feng'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Compass, FingerprintPattern } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FengHomeSplash } from '@/components/FengHomeSplash'
import { FengMark } from '@/components/FengMark'
import { resolveLocale, useStrings } from '@/lib/i18n'
import { FENG_PALETTE, spacing } from '@/lib/theme'

export default function HomeScreen() {
  const router = useRouter()
  const { fromIntro } = useLocalSearchParams<{ fromIntro?: string }>()
  const t = useStrings(resolveLocale())
  const haptic = useHaptic()
  const insets = useSafeAreaInsets()
  const { sites, isLoading, refetch } = useFengSiteList()
  const [splashDone, setSplashDone] = useState(fromIntro !== '1')

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
    <View style={{ flex: 1, backgroundColor: FENG_PALETTE.night }}>
      <StatusBar style='light' />
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
        <FengMark size={44} />
        <Pressable
          onPress={openSettings}
          accessibilityRole='button'
          accessibilityLabel={t.tab_profile}
          hitSlop={12}
        >
          <FingerprintPattern color={FENG_PALETTE.copperGold} size={24} />
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
                backgroundColor: FENG_PALETTE.nightRaised,
                borderWidth: 1,
                borderColor: FENG_PALETTE.hairline,
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

      {/* Icon-only 勘察 FAB — add a site. Circular, filled accent, 罗盘 icon. */}
      <Pressable
        onPress={addSite}
        accessibilityRole='button'
        accessibilityLabel={t.empty_cta}
        style={({ pressed }) => ({
          position: 'absolute',
          bottom: insets.bottom + spacing.lg,
          alignSelf: 'center',
          width: 60,
          height: 60,
          borderRadius: 30,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: FENG_PALETTE.copperGold,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.14)',
          transform: [{ scale: pressed ? 0.94 : 1 }],
          shadowColor: '#000',
          shadowOpacity: 0.45,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 10,
        })}
      >
        <Compass color={FENG_PALETTE.night} size={26} strokeWidth={2} />
      </Pressable>

      {!splashDone ? <FengHomeSplash onDone={() => setSplashDone(true)} /> : null}
    </View>
  )
}
