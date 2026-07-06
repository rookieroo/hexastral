import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  type DevEntitlementOverride,
  getDevEntitlementOverride,
  getPortfolioUserId,
  resolvePortfolioApiUrl,
  setDevEntitlementOverride,
} from '@zhop/satellite-runtime'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, DevSettings, Pressable, StyleSheet, Text, View } from 'react-native'

import { COIN_CAST_ONBOARDING_STORAGE_KEY } from '@/lib/coincast-constants'
import { wipeCoinCastRitualPrefsForDev } from '@/lib/coincast-ritual'
import {
  getCoincastDevLocale,
  setCoincastDevLocale,
  type UiLocale,
  useSatelliteI18n,
} from '@/lib/i18n'
import { useAppTheme } from '@/lib/theme'

const DEV_LOCALE_ORDER: (UiLocale | null)[] = [null, 'en', 'zh', 'zh-Hant', 'ja', 'ko']

/** Shown from Me tab in dev builds only (`__DEV__`). */
export function MeDevTools() {
  const { colors } = useAppTheme()
  const { t } = useSatelliteI18n()
  const router = useRouter()
  const [devPro, setDevPro] = useState<DevEntitlementOverride>(getDevEntitlementOverride())
  const [devLocale, setDevLocale] = useState<UiLocale | null>(getCoincastDevLocale())

  if (!__DEV__) return null

  // Cycle Off (real RC) → PRO → FREE so Pro gates can be exercised without a purchase.
  const cycleDevPro = () => {
    const next: DevEntitlementOverride = devPro === null ? 'pro' : devPro === 'pro' ? 'free' : null
    setDevEntitlementOverride(next)
    setDevPro(next)
  }
  const devProLabel = devPro === null ? 'Off · real' : devPro === 'pro' ? 'PRO' : 'FREE'

  const cycleDevLocale = () => {
    const next = DEV_LOCALE_ORDER[(DEV_LOCALE_ORDER.indexOf(devLocale) + 1) % DEV_LOCALE_ORDER.length] ?? null
    setCoincastDevLocale(next)
    setDevLocale(next)
    DevSettings.reload()
  }
  const devLocaleLabel = devLocale ?? 'auto (device)'

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
        style={[styles.rowSplit, { borderColor: colors.separator }]}
        onPress={cycleDevPro}
        accessibilityRole='button'
      >
        <Text style={[styles.rowText, { color: colors.text }]}>Force entitlement</Text>
        <Text style={[styles.rowValue, { color: colors.accent }]}>{devProLabel}</Text>
      </Pressable>
      <Pressable
        style={[styles.rowSplit, { borderColor: colors.separator }]}
        onPress={cycleDevLocale}
        accessibilityRole='button'
      >
        <Text style={[styles.rowText, { color: colors.text }]}>UI locale</Text>
        <Text style={[styles.rowValue, { color: colors.accent }]}>{devLocaleLabel}</Text>
      </Pressable>
      <Pressable
        style={[styles.rowSplit, { borderColor: colors.separator }]}
        onPress={() => DevSettings.reload()}
        accessibilityRole='button'
      >
        <Text style={[styles.rowText, { color: colors.text }]}>Reload app</Text>
        <Text style={[styles.rowValue, { color: colors.accent }]}>↻</Text>
      </Pressable>
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
  rowSplit: {
    borderWidth: 0.5,
    borderRadius: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowText: { fontSize: 13, fontWeight: '500' },
  rowValue: { fontSize: 13, fontWeight: '700' },
})
