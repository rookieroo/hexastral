/**
 * Polaroid chrome from home-ui-mock.html — 6/6/16 padding.
 * Apply `polaroidLift` on an unrotated ancestor so iOS keeps the drop shadow.
 */

import { useTheme } from '@zhop/core-ui'
import type { ReactNode } from 'react'
import type { ViewStyle } from 'react-native'
import { Pressable, View } from 'react-native'

export function polaroidLift(isDark: boolean): ViewStyle {
  return {
    boxShadow: isDark ? '0px 8px 22px rgba(0, 0, 0, 0.45)' : '0px 8px 22px rgba(28, 27, 25, 0.14)',
    elevation: 8,
  }
}

export function PolaroidChrome({
  children,
  active = false,
  interactive = true,
  accessibilityLabel,
  onPress,
}: {
  children: ReactNode
  active?: boolean
  /** Home empty CTA wraps the stack — inner pressables would double-fire. */
  interactive?: boolean
  accessibilityLabel?: string
  onPress?: () => void
}) {
  const { colors } = useTheme()
  const frame: ViewStyle = {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: active ? 1.5 : 1,
    borderColor: colors.text,
    paddingTop: 6,
    paddingHorizontal: 6,
    paddingBottom: 16,
  }
  const well = <View style={{ flex: 1, overflow: 'hidden' }}>{children}</View>
  if (!interactive) {
    return <View style={frame}>{well}</View>
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel}
      style={frame}
    >
      {well}
    </Pressable>
  )
}
