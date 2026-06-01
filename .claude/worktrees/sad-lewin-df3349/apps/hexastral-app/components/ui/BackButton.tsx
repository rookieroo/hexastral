/**
 * BackButton — reusable back navigation button.
 *
 * Renders an ArrowLeft icon and calls router.back() on press.
 * Defaults to colors.text from the current theme.
 * Uses the same padding/hitSlop as the established pattern across all screens.
 */

import { useRouter } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import type { ViewStyle } from 'react-native'
import { Pressable } from 'react-native'
import { useTheme } from '@/lib/theme'

interface BackButtonProps {
  /** Override icon color. Defaults to colors.text from useTheme(). */
  color?: string
  style?: ViewStyle
  /** When set, used instead of `router.back()` (e.g. tab-to-tab return). */
  onPress?: () => void
}

export function BackButton({ color, style, onPress }: BackButtonProps) {
  const { colors } = useTheme()
  const router = useRouter()

  return (
    <Pressable
      onPress={() => (onPress ? onPress() : router.back())}
      style={[{ paddingHorizontal: 20, paddingVertical: 12 }, style]}
      hitSlop={12}
    >
      <ArrowLeft size={22} color={color ?? colors.text} strokeWidth={1} />
    </Pressable>
  )
}
