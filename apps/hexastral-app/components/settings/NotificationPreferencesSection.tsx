import { ScrollView, Text, View } from 'react-native'
import { ToggleRow } from '@/components/ui/ToggleRow'
import { NOTIF_ROW_KEYS } from '@/lib/hooks/useNotifPrefsScreen'
import type { NotifPrefs } from '@/lib/hooks/useUpdatePreferences'
import type { TranslationKeys } from '@/lib/i18n'
import type { IosPalette } from '@/lib/theme'

interface NotificationPreferencesSectionProps {
  prefs: NotifPrefs
  handlers: Record<keyof NotifPrefs, (v: boolean) => void>
  ios: IosPalette
  t: (key: TranslationKeys, params?: Record<string, string | number>) => string
  /** When false, only the card (no outer ScrollView padding for section title). */
  includeSectionChrome?: boolean
}

export function NotificationPreferencesSection({
  prefs,
  handlers,
  ios,
  t,
  includeSectionChrome = true,
}: NotificationPreferencesSectionProps) {
  const chrome = includeSectionChrome ? (
    <>
      <Text style={sectionLabel(ios)}>{t('settings_notifications')}</Text>
      <Text style={hint(ios)}>{t('notif_hint')}</Text>
    </>
  ) : null

  return (
    <>
      {chrome}
      <View style={card(ios)}>
        {NOTIF_ROW_KEYS.map(({ key, labelKey, descKey }, i) => (
          <View key={key} style={rowItem(ios, i === NOTIF_ROW_KEYS.length - 1)}>
            <ToggleRow
              variant='compact'
              label={t(labelKey as never)}
              description={t(descKey as never)}
              value={prefs[key]}
              onValueChange={handlers[key]}
            />
          </View>
        ))}
      </View>
    </>
  )
}

/** Full screen body: section chrome + card inside a ScrollView. */
export function NotificationPreferencesScrollBody(
  props: NotificationPreferencesSectionProps & { scrollBottomPadding?: number }
) {
  const { scrollBottomPadding = 40, ...rest } = props
  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
      showsVerticalScrollIndicator={false}
      canCancelContentTouches={false}
    >
      <NotificationPreferencesSection {...rest} />
    </ScrollView>
  )
}

const sectionLabel = (ios: IosPalette) =>
  ({
    fontSize: 12,
    fontWeight: '500',
    color: ios.sectionLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  }) as const

const hint = (ios: IosPalette) =>
  ({
    fontSize: 13,
    fontWeight: '300',
    color: ios.secondary,
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 16,
  }) as const

const card = (ios: IosPalette) =>
  ({
    alignSelf: 'stretch',
    backgroundColor: ios.card,
    marginHorizontal: 16,
    borderRadius: 0,
    overflow: 'hidden',
  }) as const

const rowItem = (ios: IosPalette, last: boolean) =>
  ({
    borderBottomWidth: last ? 0 : 0.5,
    borderBottomColor: ios.separator,
    paddingVertical: 14,
    paddingHorizontal: 16,
  }) as const
