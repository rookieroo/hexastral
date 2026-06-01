import { PalmfaceFeatureList } from '@zhop/scenario-palmface'
import { Stack, useLocalSearchParams } from 'expo-router'
import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

function parsePayload(payload?: string | string[]): Record<string, unknown> {
  if (!payload || Array.isArray(payload)) return {}
  try {
    return JSON.parse(decodeURIComponent(payload)) as Record<string, unknown>
  } catch {
    return {}
  }
}

export default function ExplorePalmfaceResultScreen() {
  const { colors } = useTheme()
  const { t } = useI18n()
  const params = useLocalSearchParams<{ payload?: string }>()
  const output = parsePayload(params.payload)
  const featuresRaw = output.features
  const features =
    typeof featuresRaw === 'object' && featuresRaw !== null && !Array.isArray(featuresRaw)
      ? (featuresRaw as Record<string, string>)
      : {}

  const palette = {
    background: colors.background,
    text: colors.text,
    textSecondary: colors.textSecondary,
    border: colors.border,
    accent: colors.accent,
    card: colors.card,
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: t('explore_palmface_title') }} />
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
          {t('explore_palmface_title')}
        </Text>
        <PalmfaceFeatureList
          features={features}
          strings={{ featuresTitle: t('explore_palmface_features_title') }}
          palette={palette}
        />
      </ScrollView>
    </SafeAreaView>
  )
}
