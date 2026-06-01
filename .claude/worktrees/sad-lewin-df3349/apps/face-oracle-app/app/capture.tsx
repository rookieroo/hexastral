import { darkTokens } from '@zhop/hexastral-tokens/palette'
import {
  PalmfaceCaptureScreen,
  PalmfaceScenarioProvider,
  palmfaceCaptureStringsForLocale,
} from '@zhop/scenario-palmface'
import { SatelliteLoadingOverlay } from '@zhop/satellite-ui'
import { Stack } from 'expo-router'
import { View } from 'react-native'

import { runFacePreview } from '@/lib/api'
import { useSatelliteI18n } from '@/lib/i18n'

export default function CaptureStubScreen() {
  const { locale } = useSatelliteI18n()
  const strings = palmfaceCaptureStringsForLocale(locale)

  const palette = {
    background: darkTokens.bg,
    text: darkTokens.text,
    textSecondary: darkTokens.secondary,
    border: darkTokens.separator,
    accent: darkTokens.accent,
    card: darkTokens.card,
  }

  return (
    <View style={{ flex: 1, backgroundColor: darkTokens.bg }}>
      <Stack.Screen options={{ title: strings.title }} />
      <PalmfaceScenarioProvider
        api={{
          runPreview: async ({ imageUri, locale: loc, mode }) => {
            const res = await runFacePreview(imageUri, loc)
            if (res.mode === 'refused') {
              throw new Error(res.reason)
            }
            return {
              readingId: res.readingId,
              output: res.output as Record<string, unknown>,
            }
          },
        }}
      >
        <PalmfaceCaptureScreen
          strings={strings}
          palette={palette}
          locale={locale}
          mode='face'
          loadingOverlay={<SatelliteLoadingOverlay label={strings.statusWorking} />}
        />
      </PalmfaceScenarioProvider>
    </View>
  )
}
