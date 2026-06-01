/**
 * LoadingSkeleton — animated placeholder block. Shimmers via Reanimated.
 *
 * Compose multiple skeletons to mirror the layout of the content being
 * loaded — title bar, body lines, card grid, etc.
 */

import { type StyleProp, View, type ViewStyle } from 'react-native'
import Animated from 'react-native-reanimated'
import { useShimmer } from '../motion/useShimmer'
import { useTheme } from '../theme'

export interface LoadingSkeletonProps {
  width?: number | `${number}%`
  height?: number
  /** Override skeleton block color. Defaults to the theme separator. */
  color?: string
  style?: StyleProp<ViewStyle>
}

export function LoadingSkeleton({
  width = '100%',
  height = 16,
  color,
  style,
}: LoadingSkeletonProps) {
  const { colors } = useTheme()
  const shimmerStyle = useShimmer()

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: color ?? colors.separator,
        },
        shimmerStyle,
        style,
      ]}
    />
  )
}

/** Convenience: three stacked text lines (title + body + body). */
export function LoadingTextBlock() {
  const { spacing } = useTheme()
  return (
    <View style={{ gap: spacing.sm }}>
      <LoadingSkeleton width='60%' height={20} />
      <LoadingSkeleton width='100%' height={14} />
      <LoadingSkeleton width='85%' height={14} />
    </View>
  )
}
