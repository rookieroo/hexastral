import AsyncStorage from '@react-native-async-storage/async-storage'
import { getPortfolioUserId, resolvePortfolioApiUrl } from '@zhop/satellite-runtime'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'

import { COIN_CAST_ONBOARDING_STORAGE_KEY } from '@/lib/coincast-constants'
import { wipeCoinCastRitualPrefsForDev } from '@/lib/coincast-ritual'
import { useSatelliteI18n } from '@/lib/i18n'
import { useAppTheme } from '@/lib/theme'

/** Shown from Me tab in dev builds only (`__DEV__`). */
export function MeDevTools() {
  const { colors } = useAppTheme()
  const { t } = useSatelliteI18n()
  const router = useRouter()

  if (!__DEV__) return null

  const resetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem(COIN_CAST_ONBOARDING_STORAGE_KEY)
      Alert.alert(t('devtoolsReplayOnboarding'), undefined, [
        { text: t('devtoolsOk'), onPress: () => router.replace('/') },
      ])
    } catch (err) {
      console.warn('[coincast-dev] reset onboarding failed', err)
    }
  }

  const clearRitual = async () => {
    await wipeCoinCastRitualPrefsForDev()
    Alert.alert(t('devtoolsClearRitual'), t('devtoolsDone'), [{ text: t('devtoolsOk') }])
  }

  const showUser = async () => {
    const id = await getPortfolioUserId()
    Alert.alert(t('devtoolsPortfolioUser'), id ?? '—', [{ text: t('devtoolsOk') }])
  }

  const showEnv = () => {
    const lines = [
      `app: ${String(Constants.expoConfig?.name ?? Constants.appOwnership)}`,
      `execution: ${String(Constants.executionEnvironment)}`,
      `api: ${resolvePortfolioApiUrl()}`,
    ].join('\n')
    Alert.alert('Build', lines, [{ text: t('devtoolsOk') }])
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
        onPress={() => void clearRitual()}
        accessibilityRole='button'
      >
        <Text style={[styles.rowText, { color: colors.text }]}>{t('devtoolsClearRitual')}</Text>
      </Pressable>
      <Pressable
        style={[styles.row, { borderColor: colors.separator }]}
        onPress={() => void showUser()}
        accessibilityRole='button'
      >
        <Text style={[styles.rowText, { color: colors.text }]}>{t('devtoolsPortfolioUser')}</Text>
      </Pressable>
      <Pressable
        style={[styles.row, { borderColor: colors.separator }]}
        onPress={showEnv}
        accessibilityRole='button'
      >
        <Text style={[styles.rowText, { color: colors.text }]}>{t('devtoolsShowEnv')}</Text>
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
