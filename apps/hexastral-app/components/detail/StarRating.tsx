/**
 * StarRating — shared 5-star rating widget for detail pages.
 *
 * Shows an optional label above the star row. The accent color
 * is passed by the caller so each page can use its theme color
 * (accent color from theme for all pages).
 */

import { Star } from 'lucide-react-native'
import { Pressable, Text, useColorScheme, View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { theme } from '@/lib/theme'
import { hapticSelection } from '@/lib/ux/haptics'

interface StarRatingProps {
  rating: number | null
  onRate: (value: number) => void
  /** Accent color for filled stars. Defaults to colors.accent */
  accentColor?: string
  /** When false, hides the label above the stars. Defaults to true */
  showLabel?: boolean
}

export function StarRating({ rating, onRate, accentColor, showLabel = true }: StarRatingProps) {
  const colorScheme = useColorScheme()
  const colors = colorScheme === 'dark' ? theme.dark : theme.light
  const { t } = useI18n()
  const starColor = accentColor ?? colors.accent

  function handlePress(value: number) {
    hapticSelection()
    onRate(value)
  }

  return (
    <View style={{ gap: 12 }}>
      {showLabel && (
        <Text
          style={{
            fontSize: 10,
            fontWeight: '300',
            color: colors.textSecondary,
            letterSpacing: 3,
            textTransform: 'uppercase',
          }}
        >
          {t('detail_rate')}
        </Text>
      )}
      <View style={{ flexDirection: 'row', gap: 14 }}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable key={value} onPress={() => handlePress(value)} style={{ padding: 4 }}>
            <Star
              size={26}
              color={starColor}
              fill={rating !== null && value <= rating ? starColor : 'transparent'}
              strokeWidth={1}
            />
          </Pressable>
        ))}
      </View>
    </View>
  )
}
