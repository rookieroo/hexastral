/**
 * LegalSection — privacy, terms, and in-app disclaimer.
 */

import { useTheme } from '@zhop/core-ui'
import { Linking, Text } from 'react-native'
import { privacyUrl, termsUrl } from '@/lib/config'
import { useStrings } from '@/lib/i18n-context'
import { SettingsCard, SettingsRow, SettingsSection } from './SettingsSection'

export function LegalSection() {
  const { t, locale } = useStrings()
  const { colors, spacing } = useTheme()

  return (
    <SettingsSection title={t.settingsLegal}>
      <SettingsCard>
        <SettingsRow
          label={t.privacy}
          onPress={() => void Linking.openURL(privacyUrl(locale))}
          divider
        />
        <SettingsRow label={t.terms} onPress={() => void Linking.openURL(termsUrl(locale))} />
      </SettingsCard>
      <Text
        style={{
          color: colors.dim,
          fontSize: 11,
          lineHeight: 16,
          marginTop: spacing.sm,
          paddingHorizontal: spacing.xs,
        }}
      >
        {t.legalDisclaimerShort}
      </Text>
    </SettingsSection>
  )
}
