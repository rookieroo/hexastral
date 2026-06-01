import { getPortfolioUserId, repairPortfolioCredentialMismatch } from '@zhop/satellite-runtime'
import { SatelliteAppleAuth, SatelliteMePanel } from '@zhop/satellite-ui'
import { Stack, useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Linking, Platform, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { useI18n } from '@/lib/i18n'
import { useAppTheme } from '@/lib/theme'

type MeSession = 'loading' | 'out' | 'in'

export default function NumerologyMeScreen() {
  const router = useRouter()
  const { colors } = useAppTheme()
  const { t } = useI18n()
  const [session, setSession] = useState<MeSession>('loading')

  const refreshSession = useCallback(() => {
    setSession('loading')
    void (async () => {
      try {
        await repairPortfolioCredentialMismatch()
        const id = await getPortfolioUserId()
        setSession(id ? 'in' : 'out')
      } catch (err) {
        console.warn('[numerology-me] refreshSession failed', err)
        setSession('out')
      }
    })()
  }, [])

  useFocusEffect(
    useCallback(() => {
      refreshSession()
    }, [refreshSession])
  )

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <Stack.Screen options={{ title: t('stackMe') }} />
      <SatelliteMePanel
        target={PORTFOLIO_TARGET_APP}
        historyTitle={t('meHistoryTitle')}
        emptyText={t('meEmpty')}
        privacyUrl='https://www.hexastral.com/privacy/numerology'
        appStoreUrl='https://www.hexastral.com'
        signOutVisible={session === 'in'}
        authHeader={
          session === 'loading' ? (
            <View style={styles.authInner}>
              <Text style={[styles.authTitle, { color: colors.text }]}>
                {t('meSignInSectionTitle')}
              </Text>
              <View style={styles.authLoadingRow}>
                <ActivityIndicator color={colors.text} />
                <Text style={[styles.authHint, { color: colors.secondary }]}>
                  {t('meApplePreparing')}
                </Text>
              </View>
            </View>
          ) : session === 'out' ? (
            <View style={styles.authInner}>
              <Text style={[styles.authTitle, { color: colors.text }]}>
                {t('meSignInSectionTitle')}
              </Text>
              <Text style={[styles.authHint, { color: colors.secondary }]}>
                {t('meSignInHint')}
              </Text>
              {Platform.OS === 'ios' ? (
                <SatelliteAppleAuth
                  storagePrefix={PORTFOLIO_STORAGE_PREFIX}
                  targetApp={PORTFOLIO_TARGET_APP}
                  continueLabel={t('meAppleContinue')}
                  loadingLabel={t('meApplePreparing')}
                  unavailableLabel={t('meAppleUnavailable')}
                  onAuthed={() => {
                    refreshSession()
                  }}
                />
              ) : (
                <Text style={[styles.authIos, { color: colors.secondary }]}>
                  {t('meSignInIosOnly')}
                </Text>
              )}
            </View>
          ) : undefined
        }
        labels={{
          viewAllHistory: t('meViewAllHistory'),
          settings: t('meSettings'),
          upgradeToPro: t('meUpgrade'),
          restorePurchases: t('restorePurchases'),
          privacyPolicy: t('mePrivacy'),
          signOut: t('meSignOut'),
        }}
        onOpenSettings={() => router.push('/settings')}
        onSignedOut={() => {
          refreshSession()
        }}
        promo={{
          body: t('mePromoBody'),
          ctaLabel: t('mePromoCta'),
        }}
        onOpenUrl={(url) => void Linking.openURL(url)}
        onViewHistory={() => router.push('/history')}
        onUpgrade={() => router.push('/paywall')}
        onRestore={() => router.push('/paywall')}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  authInner: { gap: 10 },
  authTitle: { fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
  authLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authHint: { fontSize: 14, lineHeight: 20 },
  authIos: { fontSize: 13, lineHeight: 18 },
})
