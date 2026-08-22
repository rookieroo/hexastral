/**
 * Polaroid plate — die-cut paper, photo well. Filled and empty share this chrome.
 */

import { useTheme } from '@zhop/core-ui'
import type { ReactNode } from 'react'
import type { ViewStyle } from 'react-native'
import { Pressable, View } from 'react-native'
import type { SharedValue } from 'react-native-reanimated'

import { PolaroidInkFrame } from '@/components/PolaroidInkFrame'

export function polaroidLift(isDark: boolean, layer = 0): ViewStyle {
  const y = 5 + layer * 2
  const blur = 14 + layer * 4
  const a = isDark ? 0.5 : 0.09 + layer * 0.012
  return {
    boxShadow: isDark
      ? `0px ${y}px ${blur}px rgba(0, 0, 0, ${a})`
      : `0px ${y}px ${blur}px rgba(28, 27, 25, ${a})`,
    elevation: 4 + layer,
  }
}

export function PolaroidChrome({
  children,
  active = false,
  interactive = true,
  accessibilityLabel,
  onPress,
  onPressIn,
  onPressOut,
  inkDrawn,
}: {
  children: ReactNode
  active?: boolean
  interactive?: boolean
  accessibilityLabel?: string
  onPress?: () => void
  onPressIn?: () => void
  onPressOut?: () => void
  inkDrawn?: SharedValue<number>
}) {
  const { colors, isDark } = useTheme()
  const wellFill = isDark ? 'rgba(216, 212, 203, 0.16)' : 'rgba(44, 42, 39, 0.07)'
  const plate = isDark ? (colors.cardElevated ?? colors.card) : (colors.card ?? colors.bg)
  const frame: ViewStyle = {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: plate,
    paddingTop: 7,
    paddingHorizontal: 7,
    paddingBottom: 18,
  }
  const inner = (
    <View
      style={{
        flex: 1,
        overflow: 'hidden',
        backgroundColor: wellFill,
      }}
    >
      {children}
      {inkDrawn ? <PolaroidInkFrame active={active} drawn={inkDrawn} /> : null}
    </View>
  )
  if (!interactive) {
    return <View style={frame}>{inner}</View>
  }
  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel}
      style={frame}
    >
      {inner}
    </Pressable>
  )
}
