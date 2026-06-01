import { Stack, useLocalSearchParams } from 'expo-router'
import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

export default function ExploreDreamResultScreen() {
  const { colors } = useTheme()
  const { t } = useI18n()
  const params = useLocalSearchParams<{ interpretation?: string }>()
  const raw = params.interpretation
  const interpretation =
    typeof raw === 'string' ? decodeURIComponent(raw) : Array.isArray(raw) ? decodeURIComponent(raw[0] ?? '') : ''

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: t('explore_dream_result_title') }} />
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '500',
            color: colors.accent,
            letterSpacing: 4,
            textTransform: 'uppercase',
          }}
        >
          {t('explore_dream_result_heading')}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: '300', color: colors.text, lineHeight: 24 }}>
          {interpretation || t('explore_dream_result_empty')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
