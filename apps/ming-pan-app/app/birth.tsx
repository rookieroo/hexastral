/**
 * Birth-info capture — serves two flows distinguished by `?mode=`:
 *
 *   • `mode=onboarding` (default) — first launch, no draft. Submit → replace
 *     to (tabs). Hard back is not exposed by the /index gate.
 *   • `mode=edit` — user came from Me. Submit → back. Also CLEARS the reading
 *     mark since editing invalidates any generated batch.
 */

import { BirthInfoForm, type BirthInfoValue, birthInfoCopyForLocale } from '@zhop/core-ui'
import { saveLocalBirthDraft } from '@zhop/satellite-runtime'
import { getLocales } from 'expo-localization'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PORTFOLIO_STORAGE_PREFIX } from '@/lib/growth-config'
import { clearReadingMark } from '@/lib/reading-mark'
import { suppressNextSplash } from '@/lib/splash-control'
import { useAppTheme } from '@/lib/theme'

const NOOP_SEARCH = async () => []

type BirthMode = 'onboarding' | 'edit'

export default function BirthScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ mode?: BirthMode }>()
  const mode: BirthMode = params.mode === 'edit' ? 'edit' : 'onboarding'
  const { colors } = useAppTheme()
  const locale = getLocales()[0]?.languageCode ?? 'en'
  const [value, setValue] = useState<Partial<BirthInfoValue>>({})

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <BirthInfoForm
        value={value}
        // Each step calls onChange with ONLY its own partial (e.g. gender step
        // emits {gender}). Parent must MERGE not replace, otherwise prior
        // fields get wiped and the review screen only remembers the last step.
        onChange={(partial) => setValue((prev) => ({ ...prev, ...partial }))}
        accent={colors.text}
        copy={birthInfoCopyForLocale(locale)}
        searchCity={NOOP_SEARCH}
        locale={locale}
        skipSteps={['place']}
        onSubmit={async (final) => {
          await saveLocalBirthDraft(PORTFOLIO_STORAGE_PREFIX, {
            solarDate: final.solarDate,
            timeIndex: final.timeIndex,
            gender: final.gender,
          })
          if (mode === 'edit') {
            // Edit invalidates the reading; clear the mark so the user can
            // open /reading again and (if free) the lockout resets to allow
            // future edits until they view again.
            await clearReadingMark()
            router.back()
          } else {
            // Onboarding → land directly on home, no intro flourish (that's a
            // cold-launch flourish for returning users only).
            suppressNextSplash()
            router.replace('/(tabs)')
          }
        }}
      />
    </SafeAreaView>
  )
}
