import { useTheme } from '@zhop/core-ui'
import {
  getPortfolioUserId,
  invalidatePortfolioSession,
  repairPortfolioCredentialMismatch,
} from '@zhop/satellite-runtime'
import { SatelliteAppleAuth, SatelliteGoogleAuth } from '@zhop/satellite-ui'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Linking, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { listConnections } from '@/lib/api'
import {
  lantaiPrivacyUrl,
  lantaiTermsUrl,
  PORTFOLIO_STORAGE_PREFIX,
  PORTFOLIO_TARGET_APP,
} from '@/lib/growth-config'
import { useSatelliteI18n } from '@/lib/i18n'

const GOOGLE_IOS =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ??
  '443209724807-74241r1rvca3nb4io9o6184ddrkhtf7m.apps.googleusercontent.com'
const GOOGLE_WEB = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? ''

export default function LantaiMeScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { t, locale } = useSatelliteI18n()
  const [signedIn, setSignedIn] = useState(false)
  const [notionConnected, setNotionConnected] = useState(false)

  const refresh = useCallback(() => {
    void (async () => {
      await repairPortfolioCredentialMismatch()
      const id = await getPortfolioUserId()
      setSignedIn(Boolean(id))
      if (!id) {
        setNotionConnected(false)
        return
      }
      const connections = await listConnections()
      setNotionConnected(connections.length > 0)
    })()
  }, [])

  useFocusEffect(
    useCallback(() => {
      refresh()
    }, [refresh])
  )

  const row = (label: string, value: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      style={{
        borderWidth: 0.5,
        borderRadius: 0,
        borderColor: colors.separator,
        backgroundColor: colors.card,
        padding: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.md,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 16 }}>{label}</Text>
      <Text style={{ color: colors.secondary, fontSize: 15 }}>{value}</Text>
    </Pressable>
  )

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingBottom: insets.bottom + spacing.xl,
        gap: spacing.md,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: '600' }}>{t('tabMe')}</Text>

      {!signedIn ? (
        <View style={{ gap: spacing.sm }}>
          <SatelliteAppleAuth
            storagePrefix={PORTFOLIO_STORAGE_PREFIX}
            targetApp={PORTFOLIO_TARGET_APP}
            onAuthed={() => refresh()}
          />
          <SatelliteGoogleAuth
            storagePrefix={PORTFOLIO_STORAGE_PREFIX}
            targetApp={PORTFOLIO_TARGET_APP}
            iosClientId={GOOGLE_IOS}
            webClientId={GOOGLE_WEB || undefined}
            onAuthed={() => refresh()}
          />
        </View>
      ) : (
        <Pressable
          onPress={() => {
            void invalidatePortfolioSession().then(() => refresh())
          }}
        >
          <Text style={{ color: colors.secondary, fontSize: 15 }}>{t('meSignOut')}</Text>
        </Pressable>
      )}

      {row(t('meNotion'), notionConnected ? t('meConnected') : t('meDisconnected'), () => {
        router.push('/connect')
      })}
      {row(t('mePrivacy'), '', () => {
        void Linking.openURL(lantaiPrivacyUrl(locale))
      })}
      {row(t('meTerms'), '', () => {
        void Linking.openURL(lantaiTermsUrl(locale))
      })}
    </ScrollView>
  )
}
