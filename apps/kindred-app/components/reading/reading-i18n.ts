/**
 * Personal-reading i18n — re-exported from the shared @zhop/scenario-yuan package
 * (Phase 0d of the Yuel/Yuun split). The package hook takes the locale explicitly
 * (so it never reaches into a specific app's resolver); this thin shim wraps it to
 * auto-resolve Yuel's device locale, keeping every `./reading-i18n` consumer (and
 * its `useReadingI18n()` call) untouched.
 */
import { useReadingI18n as useReadingI18nBase } from '@zhop/scenario-yuan/components'
import { resolveLocale } from '@/lib/i18n'

export {
  dayMasterLabel,
  elementLabel,
  fiveElementsClassLabel,
  gejuLabel,
  genderLabel,
  type Locale,
  palaceLabel,
  type ReadingStringKey,
  readingTranslations,
  shichenLabel,
  starArchetypeLabel,
  strengthLabel,
  tr,
  usesStarArchetype,
} from '@zhop/scenario-yuan/components'

/** Auto-resolves Yuel's device locale; the shared hook takes it explicitly. */
export function useReadingI18n() {
  return useReadingI18nBase(resolveLocale())
}
