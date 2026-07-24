/**
 * Home — latest Reading graphic hero (Yuel model: no tabs).
 *
 * Brand mark top-left, fingerprint → Settings; latest site’s report digest
 * (same FengDigestCard as report page 0); FAB to add a site; left-swipe opens
 * Settings. Full site list lives under Settings → History.
 */

import { useHaptic } from '@zhop/core-ui'
import { type FengSite, useFengSite, useFengSiteList } from '@zhop/scenario-feng'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Compass, FingerprintPattern } from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FengHomeReadingHero } from '@/components/FengHomeReadingHero'
import { FengHomeSplash } from '@/components/FengHomeSplash'
import { FengMark } from '@/components/FengMark'
import { resolveLocale, useStrings } from '@/lib/i18n'
import { FENG_PALETTE, spacing } from '@/lib/theme'

function pickLatestSite(sites: FengSite[]): FengSite | null {
  if (sites.length === 0) return null
  return sites.reduce((best, s) => (s.updatedAt > best.updatedAt ? s : best))
}

export default function HomeScreen() {
  const router = useRouter()
  const { fromIntro } = useLocalSearchParams<{ fromIntro?: string }>()
  const t = useStrings(resolveLocale())
  const haptic = useHaptic()
  const insets = useSafeAreaInsets()
  const { sites, isLoading, refetch } = useFengSiteList()
  const [splashDone, setSplashDone] = useState(fromIntro !== '1')

  const latestSite = useMemo(() => pickLatestSite(sites), [sites])
  const { site, latestReport, isLoading: detailLoading, refetch: refetchDetail } = useFengSite(
    latestSite?.id
  )

  const openSettings = useCallback(() => {
    void haptic('light')
    router.push('/(tabs)/profile')
  }, [router, haptic])

  const addSite = useCallback(() => {
    void haptic('medium')
    router.push('/(new-site)/address')
  }, [router, haptic])

  const openLatest = useCallback(() => {
    const id = site?.id ?? latestSite?.id
    if (!id) return
    void haptic('light')
    router.push({ pathname: '/(report)/[siteId]', params: { siteId: id } })
  }, [router, haptic, site?.id, latestSite?.id])

  const onRefresh = useCallback(async () => {
    await refetch()
    await refetchDetail()
  }, [refetch, refetchDetail])

  const swipeToSettings = Gesture.Pan()
    .activeOffsetX([-18, 18])
    .failOffsetY([-16, 16])
    .onEnd((e) => {
      if (e.translationX < -55 || e.velocityX < -650) runOnJS(openSettings)()
    })

  const displayName = site?.name ?? latestSite?.name ?? ''
  const confidence = latestReport?.dataQuality.flyingStarsConfidence

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
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            paddingBottom: insets.bottom + 96,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isLoading || detailLoading}
              onRefresh={() => {
                void onRefresh()
              }}
              tintColor={FENG_PALETTE.copperGold}
            />
          }
        >
          {!latestSite && !isLoading ? (
            <View
              style={{
                flex: 1,
                minHeight: 280,
                justifyContent: 'center',
                alignItems: 'center',
                gap: spacing.sm,
              }}
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
          ) : latestSite ? (
            <FengHomeReadingHero
              siteName={displayName}
              address={site?.formattedAddress ?? latestSite?.formattedAddress}
              compute={latestReport?.compute}
              confidence={confidence}
              t={t}
              loading={detailLoading}
              onPress={openLatest}
            />
          ) : null}
        </ScrollView>
      </GestureDetector>

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
