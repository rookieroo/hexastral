import { getTokens } from '@zhop/hexastral-tokens/palette'
import { SatelliteLoadingOverlay } from '@zhop/satellite-ui'
import {
  DreamDescribeScreen,
  DreamScenarioProvider,
  dreamDescribeStringsForLocale,
} from '@zhop/scenario-dream'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { DreamPresetSteps } from '@/components/DreamPresetSteps'
import { runDreamPreviewForScenario } from '@/lib/api'
import { createDreamPortfolioOnPreviewError } from '@/lib/dream-portfolio-on-preview-error'
import { useSatelliteI18n } from '@/lib/i18n'

export default function DreamStubScreen() {
  const isDark = useColorScheme() === 'dark'
  const colors = getTokens(isDark)
  const { locale, t } = useSatelliteI18n()
  const router = useRouter()
  const scenarioLocale = locale === 'zh-Hant' ? 'zh-Hant' : locale
  const strings = useMemo(
    () => ({
      ...dreamDescribeStringsForLocale(scenarioLocale),
      errorGeneric: t('dreamPreviewError'),
    }),
    [scenarioLocale, t]
  )
  const onPreviewError = useMemo(
    () => createDreamPortfolioOnPreviewError(router, { t, locale }),
    [router, t, locale]
  )

  const palette = {
    background: colors.bg,
    text: colors.text,
    textSecondary: colors.secondary,
    border: colors.separator,
    accent: colors.accent,
    card: colors.card,
    ctaOnAccent: colors.tintFg,
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <DreamScenarioProvider
        api={{
          runPreview: (dreamText, loc) => runDreamPreviewForScenario(dreamText, loc),
        }}
        locale={scenarioLocale}
      >
        <DreamDescribeScreen
          strings={strings}
          palette={palette}
          submitVariant='primary'
          loadingOverlay={<SatelliteLoadingOverlay label={strings.loading} />}
          onPreviewError={onPreviewError}
          aboveInputSlot={({ appendToDream }) => (
            <DreamPresetSteps
              locale={locale}
              hintL1={t('presetHintL1')}
              hintL2={t('presetHintL2')}
              hintL3={t('presetHintL3')}
              onAppend={appendToDream}
            />
          )}
        />
      </DreamScenarioProvider>
    </SafeAreaView>
  )
}
