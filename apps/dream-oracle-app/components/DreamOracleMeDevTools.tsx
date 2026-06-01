import AsyncStorage from '@react-native-async-storage/async-storage'
import { getTokens } from '@zhop/hexastral-tokens/palette'
import { getPortfolioUserId, resolvePortfolioApiUrl } from '@zhop/satellite-runtime'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { Alert, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native'

import { useSatelliteI18n } from '@/lib/i18n'

const ONBOARDING_KEY = 'dream_oracle_onboarded'

/** Shown from Me tab in dev builds only (`__DEV__`). */
export function DreamOracleMeDevTools() {
  const router = useRouter()
  const isDark = useColorScheme() === 'dark'
  const colors = getTokens(isDark)
  const { t } = useSatelliteI18n()

  if (!__DEV__) return null

  const resetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem(ONBOARDING_KEY)
      Alert.alert(t('devtoolsReplayOnboarding'), undefined, [
        { text: t('devtoolsOk'), onPress: () => router.replace('/') },
      ])
    } catch (err) {
      console.warn('[dream-oracle-dev] reset onboarding failed', err)
    }
  }

  const showUser = async () => {
    const id = await getPortfolioUserId()
    Alert.alert(t('devtoolsShowUser'), id ?? '—', [{ text: t('devtoolsOk') }])
  }

  const showEnv = () => {
    const lines = [
      `app: ${String(Constants.expoConfig?.name ?? Constants.appOwnership)}`,
      `execution: ${String(Constants.executionEnvironment)}`,
      `api: ${resolvePortfolioApiUrl()}`,
    ].join('\n')
    Alert.alert(t('devtoolsShowEnv'), lines, [{ text: t('devtoolsOk') }])
  }

  return (
    <View style={[styles.box, { borderColor: colors.separator, backgroundColor: colors.card }]}>
      <Text style={[styles.kicker, { color: colors.secondary }]}>{t('devtoolsTitle')}</Text>
      <Pressable
        style={[styles.row, { borderColor: colors.separator }]}
        onPress={() => void resetOnboarding()}
        accessibilityRole='button'
      >
        <Text style={[styles.rowText, { color: colors.text }]}>
          {t('devtoolsReplayOnboarding')}
        </Text>
      </Pressable>
      <Pressable
        style={[styles.row, { borderColor: colors.separator }]}
        onPress={() => void showUser()}
        accessibilityRole='button'
      >
        <Text style={[styles.rowText, { color: colors.text }]}>{t('devtoolsShowUser')}</Text>
      </Pressable>
      <Pressable
        style={[styles.row, { borderColor: colors.separator }]}
        onPress={showEnv}
        accessibilityRole='button'
      >
        <Text style={[styles.rowText, { color: colors.text }]}>{t('devtoolsShowEnv')}</Text>
      </Pressable>
      <Pressable
        style={[styles.row, { borderColor: colors.separator }]}
        onPress={() => router.push('/paywall')}
        accessibilityRole='button'
      >
        <Text style={[styles.rowText, { color: colors.text }]}>{t('devtoolsOpenPaywall')}</Text>
      </Pressable>
      <Pressable
        style={[styles.row, { borderColor: colors.separator }]}
        onPress={() => router.push('/dream')}
        accessibilityRole='button'
      >
        <Text style={[styles.rowText, { color: colors.text }]}>{t('devtoolsOpenDream')}</Text>
      </Pressable>
      <Pressable
        style={[styles.row, { borderColor: colors.separator }]}
        onPress={() => router.push('/history')}
        accessibilityRole='button'
      >
        <Text style={[styles.rowText, { color: colors.text }]}>{t('devtoolsOpenHistory')}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 0.5,
    padding: 12,
    gap: 8,
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  row: {
    borderWidth: 0.5,
    borderRadius: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  rowText: { fontSize: 13, fontWeight: '500' },
})
