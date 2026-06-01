/**
 * Fate History → single Daily Signal archive (not Your book / report).
 */

import { router, Stack, useLocalSearchParams } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { HistoricalDailySignalCard } from '@/components/fate/HistoricalDailySignalCard'
import { useAuth } from '@/lib/auth'
import { formatDate } from '@/lib/format'
import { useSignalItemQuery } from '@/lib/hooks/useSignalItemQuery'
import { useReportManifestQuery } from '@/lib/hooks/useReportManifestQuery'
import { useUserQuery } from '@/lib/hooks/useUserQuery'
import { historyHref } from '@/lib/historyPrefs'
import { useI18n } from '@/lib/i18n'
import { useIosPalette } from '@/lib/theme'

export default function FateSignalDetailScreen() {
  const { signalId } = useLocalSearchParams<{ signalId: string }>()
  const ios = useIosPalette()
  const { t, locale } = useI18n()
  const { userId } = useAuth()
  const { data: user } = useUserQuery(userId)
  const effectiveUserId = user?.id ?? userId

  const { data: manifest } = useReportManifestQuery(effectiveUserId)
  const isPro = manifest?.isPro ?? false

  const { data: signal, isLoading, error } = useSignalItemQuery(effectiveUserId, signalId)

  const dateLabel =
    signal?.date != null ? formatDate(`${signal.date}T12:00:00.000Z`, locale) : ''

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: ios.separator,
        }}
      >
        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back()
            else router.replace(historyHref('daily') as never)
          }}
          hitSlop={12}
          style={{ paddingRight: 12 }}
        >
          <ArrowLeft size={22} color={ios.text} strokeWidth={1.5} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: ios.text }}>
          {t('history_daily_signal_title')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps='handled'>
        {isLoading ? (
          <View style={{ paddingTop: 48, alignItems: 'center' }}>
            <ActivityIndicator color={ios.text} />
            <Text style={{ marginTop: 12, fontSize: 13, color: ios.secondary }}>
              {t('signal_loading')}
            </Text>
          </View>
        ) : error || !signal ? (
          <View style={{ paddingHorizontal: 24, paddingTop: 48 }}>
            <Text style={{ fontSize: 14, color: ios.secondary, textAlign: 'center' }}>
              {t('signal_error')}
            </Text>
          </View>
        ) : (
          <HistoricalDailySignalCard signal={signal} isPro={isPro} dateLabel={dateLabel} />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
