import {
  DreamDescribeScreen,
  DreamScenarioProvider,
  type DreamScenarioPalette,
} from '@zhop/scenario-dream'
import { useRouter } from 'expo-router'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { runDreamPortfolioPreview } from '@/lib/runDreamPortfolioPreview'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

export default function ExploreDreamScreen() {
  const { colors } = useTheme()
  const { t, locale } = useI18n()
  const router = useRouter()

  const palette: DreamScenarioPalette = {
    background: colors.background,
    text: colors.text,
    textSecondary: colors.textSecondary,
    border: colors.border,
    accent: colors.accent,
    card: colors.card,
  }

  const strings = {
    title: t('explore_dream_title'),
    placeholder: t('explore_dream_placeholder'),
    cta: t('explore_dream_cta'),
    back: t('explore_dream_back'),
    minHint: t('explore_dream_min_hint'),
    loading: t('explore_dream_loading'),
    errorGeneric: t('explore_dream_error'),
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <DreamScenarioProvider
        api={{
          runPreview: (dreamText, loc) => runDreamPortfolioPreview(dreamText, loc),
        }}
        locale={locale === 'zh-Hant' ? 'zh-Hant' : locale}
      >
        <DreamDescribeScreen
          strings={strings}
          palette={palette}
          loadingOverlay={
            <View style={styles.overlay} pointerEvents='auto'>
              <ActivityIndicator color={colors.textSecondary} />
              <Text style={[styles.overlayText, { color: colors.textSecondary }]}>
                {t('explore_dream_loading')}
              </Text>
            </View>
          }
          onSuccess={({ readingId, interpretation }) => {
            router.push({
              pathname: '/dream-result',
              params: {
                readingId,
                interpretation: encodeURIComponent(interpretation),
              },
            } as never)
          }}
        />
      </DreamScenarioProvider>
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
