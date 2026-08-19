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
  const y = 3 + layer * 2
  const blur = 8 + layer * 3
  const a = isDark ? 0.4 : 0.1 + layer * 0.015
  return {
    boxShadow: `0px ${y}px ${blur}px rgba(28, 27, 25, ${a})`,
    elevation: 3 + layer,
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
  const { colors } = useTheme()
  const wellFill = colors.surfaceTint ?? colors.accentGhost
  const frame: ViewStyle = {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.cardElevated ?? colors.card,
    borderWidth: active ? 1 : 0.5,
    borderColor: active ? colors.accent : colors.secondary,
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 22,
  }
  const inner = (
    <View
      style={{
        flex: 1,
        overflow: 'hidden',
        backgroundColor: wellFill,
        borderWidth: 0.5,
        borderColor: colors.separator,
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
