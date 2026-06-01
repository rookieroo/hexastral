import { handlePortfolioError } from '@zhop/portfolio-client'
import type { Router } from 'expo-router'
import { Alert } from 'react-native'

import { formatBanRemaining } from './format-ban-remaining'

export type DreamPortfolioPreviewI18n = {
  t: (key: string, vars?: Record<string, string | number>) => string
  /** Normalized UI locale tag (e.g. zh-Hant) for ban countdown copy */
  locale: string
}

export function createDreamPortfolioOnPreviewError(
  router: Router,
  i18n: DreamPortfolioPreviewI18n
): (err: unknown) => boolean {
  const { t, locale } = i18n
  return (err: unknown) => {
    let handled = false
    handlePortfolioError(err, {
      onQuotaGuest: () => {
        handled = true
        const msg = t('alertQuotaGuestDailyMsg')
        Alert.alert(t('alertQuotaTitle'), msg, [
          { text: t('alertContinue'), style: 'cancel' },
          { text: t('alertQuotaSignIn'), onPress: () => router.push('/(tabs)/me') },
          { text: t('alertQuotaUpgrade'), onPress: () => router.push('/paywall') },
        ])
      },
      onQuotaLinked: () => {
        handled = true
        Alert.alert(t('alertQuotaTitle'), t('alertQuotaMsg'), [
          { text: t('alertContinue'), style: 'cancel' },
          { text: t('alertQuotaUpgrade'), onPress: () => router.push('/paywall') },
        ])
      },
      onBanned: (bannedUntil) => {
        handled = true
        const when = formatBanRemaining(bannedUntil, locale)
        Alert.alert(t('alertBannedTitle'), t('alertBannedMsg', { time: when }))
      },
      onSessionExpired: () => {
        handled = false
      },
      onGeneric: () => {
        handled = false
      },
    })
    return handled
  }
}
