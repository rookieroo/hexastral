import {
  PalmfaceCaptureScreen,
  PalmfaceScenarioProvider,
  type PalmfaceScenarioPalette,
} from '@zhop/scenario-palmface'
import { useRouter } from 'expo-router'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { runFacePortfolioPreview } from '@/lib/runFacePortfolioPreview'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

export default function ExplorePalmfaceScreen() {
  const { colors } = useTheme()
  const { t, locale } = useI18n()
  const router = useRouter()

  const palette: PalmfaceScenarioPalette = {
    background: colors.background,
    text: colors.text,
    textSecondary: colors.textSecondary,
    border: colors.border,
    accent: colors.accent,
    card: colors.card,
  }

  const strings = {
    title: t('explore_palmface_title'),
    body: t('explore_palmface_body'),
    openCamera: t('explore_palmface_open_camera'),
    back: t('explore_palmface_back'),
    statusIdle: t('explore_palmface_status_idle'),
    statusDenied: t('explore_palmface_status_denied'),
    statusCancelled: t('explore_palmface_status_cancelled'),
    statusWorking: t('explore_palmface_status_working'),
    errorGeneric: t('explore_palmface_error'),
  }

  const loc = locale === 'zh-Hant' ? 'zh-Hant' : locale

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <PalmfaceScenarioProvider
        api={{
          runPreview: ({ imageUri, locale: l, mode }) =>
            runFacePortfolioPreview({ imageUri, locale: l, mode }),
        }}
      >
        <PalmfaceCaptureScreen
          strings={strings}
          palette={palette}
          locale={loc}
          mode='face'
          loadingOverlay={
            <View style={styles.overlay} pointerEvents='auto'>
              <ActivityIndicator color={colors.textSecondary} />
              <Text style={[styles.overlayText, { color: colors.textSecondary }]}>
                {t('explore_palmface_status_working')}
              </Text>
            </View>
          }
          onSuccess={({ readingId, output }) => {
            router.push({
              pathname: '/palmface-result',
              params: {
                readingId,
                payload: encodeURIComponent(JSON.stringify(output)),
              },
            } as never)
          }}
        />
      </PalmfaceScenarioProvider>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  overlayText: {
    fontSize: 14,
    fontWeight: '500',
  },
})
