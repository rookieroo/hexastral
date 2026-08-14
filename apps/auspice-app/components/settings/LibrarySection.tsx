/**
 * LibrarySection — explore drill-ins moved from Today home.
 */

import { useTheme } from '@zhop/core-ui'
import { type Href, useRouter } from 'expo-router'
import { View } from 'react-native'
import { useStrings } from '@/lib/i18n-context'
import { isIapEnabled } from '@/lib/iap-enabled'
import { SettingsCard, SettingsRow, SettingsSection } from './SettingsSection'

export function LibrarySection() {
  const { t } = useStrings()
  const router = useRouter()
  const { spacing } = useTheme()

  return (
    <SettingsSection title={t.settingsLibrary}>
      <SettingsCard>
        {/*
          你的命书 (personal reading) — TEMPORARILY HIDDEN.
          The full 命书 belongs to Yuel, which is not on the store yet; the in-app
          summary screen (/reading) stays in the bundle for deep-link compatibility
          but its hand-off CTA has nowhere to land. Restore this row when Yuel ships:
          <SettingsRow
            label={t.personal.readingTitle}
            hint={t.personal.readingHint}
            onPress={() => router.push('/reading' as Href)}
            divider
          />
        */}
        <SettingsRow
          label={t.libraryTimeline}
          onPress={() => router.push('/timeline' as Href)}
          divider
        />
        {/* Make-if is Pro-only end to end — hidden until IAP ships so the free
            build has no dead "coming soon" entry (App Review 2.1 completeness). */}
        {isIapEnabled() ? (
          <SettingsRow
            label={t.libraryMakeIf}
            onPress={() => router.push('/makeif' as Href)}
            divider
          />
        ) : null}
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
