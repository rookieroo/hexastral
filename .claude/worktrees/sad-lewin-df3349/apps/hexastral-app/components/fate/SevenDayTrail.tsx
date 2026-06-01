/**
 * SevenDayTrail — 7 dots colored by each day's signal energy wuxing.
 * Tap a dot to navigate to that day's signal in the chat / detail view.
 *
 * Free users see only 7 dots; Pro can see longer history but UI here is fixed
 * to 7 (longer history surfaces in a dedicated screen).
 */

import { Pressable, Text, View } from 'react-native'
import type { SignalHistory } from '@/lib/hooks/useSignalHistoryQuery'
import { useI18n } from '@/lib/i18n'
import { useTheme, wuxingColors } from '@/lib/theme'

interface Props {
  history: SignalHistory | null | undefined
  isLoading: boolean
  onDayPress?: (signalId: string) => void
}

export function SevenDayTrail({ history, isLoading, onDayPress }: Props) {
  const { t } = useI18n()
  const { colors } = useTheme()

  // Always render 7 slots so the layout is stable while loading / partial.
  const items = history?.items ?? []
  const padded = Array.from({ length: 7 }, (_, i) => items[i] ?? null)

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 16,
        backgroundColor: colors.card,
        borderRadius: 0,
        borderWidth: 0.5,
        borderColor: colors.border,
        paddingHorizontal: 20,
        paddingVertical: 16,
      }}
    >
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 11,
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        {t('seven_day_trail_label')}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {padded.map((item, i) => {
          const wuxing = item?.content?.energy?.wuxing
          const accent = wuxing ? wuxingColors[wuxing].accent : colors.border
          const date = item?.date ?? ''
          const day = date ? date.slice(8, 10) : '·'
          return (
            <Pressable
              key={`${date}-${i}`}
              disabled={!item || !onDayPress}
              onPress={() => item && onDayPress?.(item.signalId)}
              style={{ alignItems: 'center', flex: 1, opacity: isLoading && !item ? 0.3 : 1 }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: accent,
                  opacity: item ? 1 : 0.3,
                }}
              />
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 10,
                  marginTop: 6,
                  letterSpacing: 0.3,
                }}
              >
                {day}
              </Text>
            </Pressable>
          )
        })}
      </View>
      {!isLoading && items.length === 0 ? (
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 11,
            fontWeight: '300',
            textAlign: 'center',
            marginTop: 12,
            lineHeight: 16,
          }}
        >
          {t('seven_day_trail_empty')}
        </Text>
      ) : null}
    </View>
  )
}
