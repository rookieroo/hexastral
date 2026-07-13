/**
 * LibrarySection — explore drill-ins moved from Today home.
 */

import { useTheme } from '@zhop/core-ui'
import { type Href, useRouter } from 'expo-router'
import { BookOpen, Cake, CalendarCheck, GitBranch, ScrollText, Sparkles } from 'lucide-react-native'
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
          icon={ScrollText}
          label={t.personal.readingTitle}
          hint={t.personal.readingHint}
          onPress={() => router.push('/reading' as Href)}
          divider
        />
        <SettingsRow
          icon={Sparkles}
          label={t.libraryTimeline}
          onPress={() => router.push('/timeline' as Href)}
          divider
        />
        <SettingsRow
          icon={GitBranch}
          label={t.libraryMakeIf}
          onPress={() => router.push('/makeif' as Href)}
          divider
        />
        <SettingsRow
          icon={CalendarCheck}
          label={t.eventSearch}
          onPress={() => router.push('/event')}
          divider
        />
        <SettingsRow
          icon={Cake}
          label={t.people.homeEntry}
          onPress={() => router.push('/people' as Href)}
          divider
        />
        <SettingsRow
          icon={BookOpen}
          label={t.cultureHub}
          hint={t.cultureHubBlurb}
          onPress={() => router.push('/glossary' as Href)}
        />
      </SettingsCard>
      <View style={{ height: spacing.xs }} />
    </SettingsSection>
  )
}
