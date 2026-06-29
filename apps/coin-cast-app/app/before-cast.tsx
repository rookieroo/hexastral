import { Stack, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { setFirstRitualAcknowledged } from '@/lib/coincast-ritual'
import { useSatelliteI18n } from '@/lib/i18n'
import { SheetHandle } from '@/lib/SheetHandle'
import { useAppTheme } from '@/lib/theme'

const STEP_COUNT = 3

export default function BeforeCastScreen() {
  const router = useRouter()
  const { colors } = useAppTheme()
  const { t } = useSatelliteI18n()
  const [step, setStep] = useState(0)
  const fade = useSharedValue(1)
  const calmPulse = useSharedValue(1)

  useEffect(() => {
    fade.value = 0.72
    fade.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) })
  }, [fade, step])

  useEffect(() => {
    if (step !== 1) {
      calmPulse.value = 1
      return
    }
    calmPulse.value = withRepeat(
      withSequence(
        withTiming(1.45, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    )
  }, [calmPulse, step])

  const cardStyle = useAnimatedStyle(() => ({ opacity: fade.value }))
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: calmPulse.value }] }))

  const acknowledge = async () => {
    await setFirstRitualAcknowledged()
    if (router.canGoBack()) router.back()
    else router.replace('/(tabs)')
  }

  const titles = [t('beforeCastC1Title'), t('beforeCastC2Title'), t('beforeCastC3Title')] as const
  const bodies = [t('beforeCastC1Body'), t('beforeCastC2Body'), t('beforeCastC3Body')] as const

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.bg }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <Stack.Screen options={{ title: t('stackBeforeCast') }} />
      <SheetHandle />
      <View style={styles.body}>
        <Animated.View
          style={[
            styles.card,
            cardStyle,
            { borderColor: colors.separator, backgroundColor: colors.card },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>{titles[step]}</Text>
          <Text style={[styles.cardBody, { color: colors.secondary }]}>{bodies[step]}</Text>
          {step === 1 ? (
            <View style={styles.pulseRow} accessibilityLabel={t('beforeCastC2Title')}>
              <Animated.View
                style={[
                  styles.pulseDot,
                  pulseStyle,
                  { backgroundColor: colors.accent, opacity: 0.85 },
                ]}
              />
            </View>
          ) : null}
        </Animated.View>

        <View style={styles.dots}>
          {Array.from({ length: STEP_COUNT }, (_, i) => i).map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: step === i ? colors.text : `${colors.secondary}44`,
                  borderColor: colors.separator,
                },
              ]}
            />
          ))}
        </View>

        {step < STEP_COUNT - 1 ? (
          <Pressable
            style={[styles.cta, { borderColor: colors.separator, backgroundColor: colors.card }]}
            onPress={() => setStep((s) => Math.min(s + 1, STEP_COUNT - 1))}
            accessibilityRole='button'
          >
            <Text style={[styles.ctaText, { color: colors.text }]}>{t('beforeCastNext')}</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.cta, { borderColor: colors.separator, backgroundColor: colors.card }]}
            onPress={() => void acknowledge()}
            accessibilityRole='button'
          >
            <Text style={[styles.ctaText, { color: colors.text }]}>{t('beforeCastReady')}</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 20, paddingBottom: 20, justifyContent: 'space-between' },
  card: {
    marginTop: 6,
    borderWidth: 0.5,
    borderRadius: 0,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
    flex: 0,
    maxHeight: '72%',
  },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardBody: { fontSize: 13, lineHeight: 20, fontWeight: '400' },
  pulseRow: { alignItems: 'center', paddingVertical: 14 },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: 10 },
  dot: { width: 6, height: 6, borderRadius: 0, borderWidth: 0.5 },
  cta: {
    borderWidth: 0.5,
    borderRadius: 0,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaText: { fontSize: 12, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },
})
