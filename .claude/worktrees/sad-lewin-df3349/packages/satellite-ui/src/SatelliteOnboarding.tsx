import AsyncStorage from '@react-native-async-storage/async-storage'
import { getTokens } from '@zhop/hexastral-tokens/palette'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native'
import type { SatelliteBirthInputValue } from './SatelliteBirthInput'
import { SatelliteAppleAuth } from './SatelliteAppleAuth'
import { SatelliteBirthInput } from './SatelliteBirthInput'

const DEFAULT_KEY = 'satellite_onboarded'
const inMemoryOnboardingStore = new Map<string, string>()

export interface SatelliteOnboardingProps {
  appTitle: string
  appSubtitle: string
  storagePrefix: string
  targetApp: string
  onboardingKey?: string
  requireBirthInput?: boolean
  showAuthStep?: boolean
  /** Optional UI strings (e.g. i18n). */
  copy?: {
    kicker?: string
    getStarted?: string
    continue?: string
    back?: string
  }
  onBirthSubmit?: (birth: SatelliteBirthInputValue) => Promise<void> | void
  onDone?: (birth: SatelliteBirthInputValue | null) => Promise<void> | void
}

type Step = 'hero' | 'birth' | 'auth'

export async function hasCompletedSatelliteOnboarding(onboardingKey = DEFAULT_KEY): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(onboardingKey)
    return value === 'true'
  } catch (err) {
    console.warn('[satellite-ui] AsyncStorage unavailable, fallback to memory store', err)
    return inMemoryOnboardingStore.get(onboardingKey) === 'true'
  }
}

export async function markSatelliteOnboardingDone(onboardingKey = DEFAULT_KEY): Promise<void> {
  try {
    await AsyncStorage.setItem(onboardingKey, 'true')
  } catch (err) {
    console.warn('[satellite-ui] AsyncStorage unavailable, writing onboarding flag in memory', err)
    inMemoryOnboardingStore.set(onboardingKey, 'true')
  }
}

export function SatelliteOnboarding(props: SatelliteOnboardingProps) {
  const router = useRouter()
  const isDark = useColorScheme() === 'dark'
  const colors = getTokens(isDark)
  const [step, setStep] = useState<Step>('hero')
  const [birth, setBirth] = useState<SatelliteBirthInputValue>({
    solarDate: '',
    timeIndex: 0,
  })
  const flow = useMemo<Step[]>(() => {
    const includeAuth = props.showAuthStep ?? true
    if (props.requireBirthInput) return includeAuth ? ['hero', 'birth', 'auth'] : ['hero', 'birth']
    return includeAuth ? ['hero', 'auth'] : ['hero']
  }, [props.requireBirthInput, props.showAuthStep])

  const next = async () => {
    const idx = flow.indexOf(step)
    const atEnd = idx >= flow.length - 1
    if (step === 'birth' && props.requireBirthInput) {
      await props.onBirthSubmit?.(birth)
    }
    if (!atEnd) {
      setStep(flow[idx + 1]!)
      return
    }
    await props.onDone?.(props.requireBirthInput ? birth : null)
    await markSatelliteOnboardingDone(props.onboardingKey ?? DEFAULT_KEY)
    router.replace('/(tabs)')
  }

  const back = () => {
    const idx = flow.indexOf(step)
    if (idx <= 0) return
    setStep(flow[idx - 1]!)
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.kicker, { color: colors.secondary }]}>{props.copy?.kicker ?? 'HEXASTRAL SATELLITE'}</Text>
      <Text style={[styles.title, { color: colors.text }]}>{props.appTitle}</Text>
      <Text style={[styles.subtitle, { color: colors.secondary }]}>{props.appSubtitle}</Text>

      {step === 'birth' ? (
        <SatelliteBirthInput value={birth} onChange={setBirth} showCity={props.requireBirthInput} />
      ) : null}

      {step === 'auth' ? (
        <>
          <SatelliteAppleAuth
            storagePrefix={props.storagePrefix}
            targetApp={props.targetApp}
            onAuthed={() => {
              void next()
            }}
          />
          <Pressable style={[styles.cta, { borderColor: colors.separator, backgroundColor: colors.card }]} onPress={() => void next()}>
            <Text style={[styles.ctaText, { color: colors.text }]}>{props.copy?.continue ?? 'Continue'}</Text>
          </Pressable>
          <Pressable onPress={back}>
            <Text style={[styles.backText, { color: colors.secondary }]}>{props.copy?.back ?? 'Back'}</Text>
          </Pressable>
        </>
      ) : (
        <Pressable style={[styles.cta, { borderColor: colors.separator, backgroundColor: colors.card }]} onPress={() => void next()}>
          <Text style={[styles.ctaText, { color: colors.text }]}>{props.copy?.getStarted ?? 'Get Started'}</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 3.5,
    fontWeight: '500',
  },
  title: {
    fontSize: 30,
    letterSpacing: 2,
    fontWeight: '300',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: 8,
  },
  cta: {
    borderWidth: 0.5,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  ctaText: {
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  backText: {
    fontSize: 13,
    marginTop: 8,
  },
})
