/**
 * Notifications Settings Screen (settings stack) — shared implementation with /notifications
 */

import { useQueryClient } from '@tanstack/react-query'
import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NotificationPreferencesScrollBody } from '@/components/settings/NotificationPreferencesSection'
import { BackButton } from '@/components/ui/BackButton'
import { useAuth } from '@/lib/auth'
import { useNotifPrefsScreen } from '@/lib/hooks/useNotifPrefsScreen'
import { useI18n } from '@/lib/i18n'
import { useIosPalette } from '@/lib/theme'

export default function NotificationsScreen() {
  const { t } = useI18n()
  const ios = useIosPalette()
  const { userId } = useAuth()
  const queryClient = useQueryClient()
  const { prefs, handlers } = useNotifPrefsScreen(userId)

  useFocusEffect(
    useCallback(() => {
      if (userId) void queryClient.invalidateQueries({ queryKey: ['user', userId] })
    }, [userId, queryClient])
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }}>
      <BackButton />
      <NotificationPreferencesScrollBody prefs={prefs} handlers={handlers} ios={ios} t={t} />
    </SafeAreaView>
  )
}
