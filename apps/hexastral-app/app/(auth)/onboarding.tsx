/**
 * Onboarding — birth data → auth → notifications (6 steps).
 * Step UI lives under @/components/onboarding; this file is orchestration only.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useQueryClient } from '@tanstack/react-query'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Animated, LayoutAnimation, Pressable, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthStep } from '@/components/onboarding/AuthStep'
import { BirthCityStep } from '@/components/onboarding/BirthCityStep'
import { BirthDateStep } from '@/components/onboarding/BirthDateStep'
import { BirthTimeStep } from '@/components/onboarding/BirthTimeStep'
import { C, DARK_STEPS } from '@/components/onboarding/constants'
import { GenderStep } from '@/components/onboarding/GenderStep'
import { NotifyStep } from '@/components/onboarding/NotifyStep'
import { StepProgress } from '@/components/onboarding/OnboardingChrome'
import {
  ONBOARDING_KEY,
  ONBOARDING_STEP_ORDER,
  type OnboardingStep,
} from '@/components/onboarding/types'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { CityOption } from '@/lib/data/worldCities'
import { getBirthInfo, saveBirthInfo } from '@/lib/domain/birthInfo'
import { useI18n } from '@/lib/i18n'
import { storage } from '@/lib/storage'
import { theme, useTheme } from '@/lib/theme'
import { registerPushToken, requestPushPermission } from '@/lib/ux/pushNotifications'

const FATE_GENERATING_KEY = 'fate_generating_at'

export { ONBOARDING_KEY }

export async function hasCompletedOnboarding(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_KEY)
  return value === 'true'
}

export async function markOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
}

export default function OnboardingScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { signInWithApple, signInWithGoogle, signInAsGuest, userId } = useAuth()
  const fadeAnim = useRef(new Animated.Value(1)).current
  const { colors } = useTheme()
  const { locale, t } = useI18n()

  const [step, setStep] = useState<OnboardingStep>('birthdate')
  const [birthDate, setBirthDate] = useState(new Date(1984, 0, 1))
  const [timeIndex, setTimeIndex] = useState<number | null>(null)
  const [gender, setGender] = useState<'男' | '女' | null>(null)
  const [calendarType, setCalendarType] = useState<'solar' | 'lunar'>('solar')
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null)

  const [appleAvailable, setAppleAvailable] = useState(false)
  const [authLoading, setAuthLoading] = useState<'apple' | 'google' | 'guest' | null>(null)

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable)
  }, [])

  const goTo = useCallback((next: OnboardingStep) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setStep(next)
  }, [])

  const advance = useCallback(() => {
    const idx = ONBOARDING_STEP_ORDER.indexOf(step)
    const next = ONBOARDING_STEP_ORDER[idx + 1]
    if (next) goTo(next)
  }, [step, goTo])

  const BACK_ALLOWED = new Set<OnboardingStep>(['birthdate', 'birthtime', 'gender', 'birthcity'])
  const goBack = useCallback(() => {
    const idx = ONBOARDING_STEP_ORDER.indexOf(step)
    const prev = ONBOARDING_STEP_ORDER[idx - 1]
    if (prev) goTo(prev)
  }, [step, goTo])
  const canGoBack = BACK_ALLOWED.has(step)

  const handleAuthEntry = useCallback(async () => {
    const y = birthDate.getFullYear()
    const m = birthDate.getMonth() + 1
    const d = birthDate.getDate()
    await saveBirthInfo({
      solarDate: `${y}-${m}-${d}`,
      birthYear: String(y),
      timeIndex: timeIndex ?? undefined,
      gender: gender ?? '男',
      calendarType,
      birthCity: selectedCity?.name,
      latitude: selectedCity?.lat,
      longitude: selectedCity?.lng,
      timezoneId: selectedCity?.timezone ?? undefined,
    })
    goTo('auth')
  }, [birthDate, timeIndex, gender, calendarType, selectedCity, goTo])

  const fireBackgroundFate = useCallback(
    async (uid: string) => {
      try {
        const info = await getBirthInfo()
        if (!info.solarDate || info.timeIndex == null) return

        try {
          const putResp = await apiClient.api.user[':userId']['birth-info'].$put({
            param: { userId: uid },
            json: {
              birthSolarDate: info.solarDate,
              birthTimeIndex: info.timeIndex,
              birthGender: (info.gender ?? '男') as '男' | '女',
              birthCity: info.birthCity,
              birthLongitude: info.longitude != null ? String(info.longitude) : undefined,
              birthLatitude: info.latitude != null ? String(info.latitude) : undefined,
              birthTimezoneId: info.timezoneId ?? undefined,
              name: info.displayName?.trim() || undefined,
            },
          })
          if (!putResp.ok && __DEV__) {
            console.warn('[Onboarding] birth-info PUT failed', putResp.status, await putResp.text())
          }
        } catch (err) {
          if (__DEV__) console.warn('[Onboarding] birth-info PUT threw', err)
        }

        storage.set(FATE_GENERATING_KEY, String(Date.now()))

        try {
          const resp = await apiClient.api.onboarding.bootstrap.$post({
            json: { explanationMode: 'plain' },
          })
          if (!resp.ok && __DEV__) {
            const body = await resp.text()
            console.warn('[Onboarding] bootstrap failed', resp.status, body)
          }
        } catch (err) {
          if (__DEV__) console.warn('[Onboarding] bootstrap threw (non-fatal):', err)
        }

        qc.invalidateQueries({ queryKey: ['signal'] })
        qc.invalidateQueries({ queryKey: ['user', uid] })
      } catch (err) {
        if (__DEV__) console.warn('[Onboarding] Background fate failed (Fate tab will retry):', err)
      } finally {
        storage.remove(FATE_GENERATING_KEY)
      }
    },
    [locale, qc]
  )

  const handleApple = useCallback(async () => {
    setAuthLoading('apple')
    let success = false
    try {
      success = await signInWithApple()
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to sign in with Apple.'
      Alert.alert(t('sys_error') || 'Error', message)
    } finally {
      setAuthLoading(null)
    }
    if (success) {
      const uid = userId
      if (uid && !uid.startsWith('guest_')) fireBackgroundFate(uid)
      goTo('notify')
    }
  }, [signInWithApple, goTo, t, userId, fireBackgroundFate])

  const handleGoogle = useCallback(async () => {
    setAuthLoading('google')
    let success = false
    try {
      success = await signInWithGoogle()
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to sign in with Google.'
      Alert.alert(t('sys_error') || 'Error', message)
    } finally {
      setAuthLoading(null)
    }
    if (success) {
      const uid = userId
      if (uid && !uid.startsWith('guest_')) fireBackgroundFate(uid)
      goTo('notify')
    }
  }, [signInWithGoogle, goTo, t, userId, fireBackgroundFate])

  const handleGuest = useCallback(async () => {
    setAuthLoading('guest')
    let success = false
    try {
      success = await signInAsGuest()
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to continue as guest.'
      Alert.alert(t('sys_error') || 'Error', message)
    } finally {
      setAuthLoading(null)
    }
    if (success) goTo('notify')
  }, [signInAsGuest, goTo, t])

  const handleNotify = useCallback(async () => {
    const status = await requestPushPermission().catch(() => 'denied' as const)
    if (status === 'granted' && userId) {
      registerPushToken(userId, locale).catch(() => {
        /* non-blocking */
      })
    }
    await markOnboardingComplete()
    router.replace('/(tabs)')
  }, [userId, locale, router])

  const handleFinish = useCallback(async () => {
    await markOnboardingComplete()
    router.replace('/(tabs)')
  }, [router])

  const isDarkBg = DARK_STEPS.has(step)

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDarkBg ? theme.dark.background : colors.background,
      }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', height: 28 }}>
          {canGoBack ? (
            <Pressable
              onPress={goBack}
              hitSlop={10}
              style={{ paddingHorizontal: 16, paddingVertical: 6 }}
            >
              <ChevronLeft
                size={20}
                color={isDarkBg ? C.muted : colors.textSecondary}
                strokeWidth={1.5}
              />
            </Pressable>
          ) : (
            <View style={{ width: 52 }} />
          )}
          <View style={{ flex: 1 }}>
            <StepProgress step={step} dark={isDarkBg} />
          </View>
          <View style={{ width: 52 }} />
        </View>

        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          {step === 'birthdate' && (
            <BirthDateStep
              onNext={advance}
              birthDate={birthDate}
              setBirthDate={setBirthDate}
              showLunar={calendarType === 'lunar'}
              setShowLunar={(v) => setCalendarType(v ? 'lunar' : 'solar')}
            />
          )}
          {step === 'birthtime' && (
            <BirthTimeStep onNext={advance} timeIndex={timeIndex} setTimeIndex={setTimeIndex} />
          )}
          {step === 'gender' && (
            <GenderStep onNext={advance} gender={gender} setGender={setGender} />
          )}
          {step === 'birthcity' && (
            <BirthCityStep
              onNext={handleAuthEntry}
              selectedCity={selectedCity}
              setSelectedCity={setSelectedCity}
            />
          )}
          {step === 'auth' && (
            <AuthStep
              onApple={handleApple}
              onGoogle={handleGoogle}
              onGuest={handleGuest}
              appleAvailable={appleAvailable}
              loadingType={authLoading}
            />
          )}
          {step === 'notify' && (
            <NotifyStep onAllow={handleNotify} onSkip={() => void handleFinish()} />
          )}
        </Animated.View>
      </SafeAreaView>
    </View>
  )
}
