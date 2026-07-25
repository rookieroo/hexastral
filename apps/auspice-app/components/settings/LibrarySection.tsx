/**
 * LibrarySection — explore drill-ins moved from Today home.
 */

import { useTheme } from '@zhop/core-ui'
import { type Href, useRouter } from 'expo-router'
import { View } from 'react-native'
import { useStrings } from '@/lib/i18n-context'
import { SettingsCard, SettingsRow, SettingsSection } from './SettingsSection'

export function LibrarySection() {
  const { t } = useStrings()
  const router = useRouter()
  const { spacing } = useTheme()

  return (
    <SettingsSection title={t.settingsLibrary}>
      <SettingsCard>
        <SettingsRow
          label={t.personal.readingTitle}
          hint={t.personal.readingHint}
          onPress={() => router.push('/reading' as Href)}
          divider
        />
        <SettingsRow
          label={t.libraryTimeline}
          onPress={() => router.push('/timeline' as Href)}
          divider
        />
        <SettingsRow
          label={t.libraryMakeIf}
          onPress={() => router.push('/makeif' as Href)}
          divider
        />
        <SettingsRow label={t.eventSearch} onPress={() => router.push('/event')} divider />
        <SettingsRow
          label={t.people.homeEntry}
          onPress={() => router.push('/people' as Href)}
          divider
        />
        <SettingsRow
          label={t.cultureHub}
          hint={t.cultureHubBlurb}
          onPress={() => router.push('/glossary' as Href)}
        />
      </SettingsCard>
      <View style={{ height: spacing.xs }} />
    </SettingsSection>
  )
}
