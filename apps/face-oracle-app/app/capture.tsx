import { CapturePipeline, captureCopyForLocale, useTheme } from '@zhop/core-ui'
import { SatelliteLoadingOverlay } from '@zhop/satellite-ui'
import { router, Stack } from 'expo-router'
import { View } from 'react-native'

import { runFaceTeaser } from '@/lib/api'
import { useSatelliteI18n } from '@/lib/i18n'

type FacePreviewResult = {
  readingId: string
  output: Record<string, unknown>
  imageUri: string
}

export default function CaptureStubScreen() {
  const { locale } = useSatelliteI18n()
  const { colors } = useTheme()

  // Use the generic CapturePipeline copy (Phase J.1.2) and tweak the framing
  // bullet to call out face-specific composition.
  const defaults = captureCopyForLocale(locale)
  const strings = {
    ...defaults,
    qualityFraming: locale.startsWith('zh')
      ? '居中正对镜头——脸部充满画面'
      : locale.startsWith('ja')
        ? '顔は中央で正面向き、画面いっぱい'
        : 'Face centered and head-on, fills the frame',
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: strings.title }} />
      <CapturePipeline<FacePreviewResult>
        strings={strings}
        onCapture={async (uri) => {
          const res = await runFaceTeaser(uri, locale)
          if (res.mode === 'refused') {
            throw new Error(res.reason)
          }
          return {
            readingId: res.readingId,
            output: res.output as Record<string, unknown>,
            imageUri: uri,
          }
        }}
        onSuccess={({ readingId, output, imageUri }) => {
          router.push({
            pathname: '/result',
            params: {
              readingId,
              payload: encodeURIComponent(JSON.stringify(output)),
              imageUri,
            },
          } as never)
        }}
        loadingOverlay={<SatelliteLoadingOverlay label={strings.statusWorking} />}
      />
    </View>
  )
}
