/**
 * Button — primary tap target. Press-scale via Reanimated worklet; optional
 * haptic feedback; variants honor the per-app brand accent from <CoreUIProvider>.
 */

import type { ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import Animated from 'react-native-reanimated'
import { useHaptic } from '../hooks/useHaptic'
import { usePressScale } from '../motion/usePressScale'
import { useTheme } from '../theme'
import { Text } from './Text'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  fullWidth?: boolean
  haptic?: boolean
  style?: StyleProp<ViewStyle>
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading,
  leadingIcon,
  trailingIcon,
  fullWidth,
  haptic = true,
  disabled,
  onPress,
  style,
  ...rest
}: ButtonProps) {
  const { colors, spacing, radius } = useTheme()
  const { animatedStyle, onPressIn, onPressOut } = usePressScale()
  const triggerHaptic = useHaptic()

  const heightForSize = size === 'sm' ? 36 : size === 'lg' ? 54 : 44
  const horizontalPad = size === 'sm' ? spacing.md : size === 'lg' ? spacing.xl : spacing.lg

  // Resolve background + foreground per variant.
  const bg =
    variant === 'primary'
      ? colors.accent
      : variant === 'destructive'
        ? colors.danger
        : 'transparent'

  const fg =
    variant === 'primary' || variant === 'destructive'
      ? colors.bg
      : variant === 'secondary' || variant === 'ghost'
        ? colors.accent
        : colors.text

  const borderColor =
    variant === 'secondary' ? colors.accent : variant === 'ghost' ? 'transparent' : 'transparent'

  const isDisabled = disabled || loading

  const handlePress = (e: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
    if (haptic) void triggerHaptic(variant === 'destructive' ? 'warning' : 'medium')
    onPress?.(e)
  }

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={isDisabled}
      accessibilityRole='button'
      style={fullWidth ? { width: '100%' } : undefined}
      {...rest}
    >
      <Animated.View
        style={[
          {
            height: heightForSize,
            paddingHorizontal: horizontalPad,
            backgroundColor: bg,
            borderRadius: radius.none, // Ink Brutalism — square edges
            borderWidth: variant === 'secondary' ? 0.5 : 0,
            borderColor,
            opacity: isDisabled ? 0.4 : 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
          },
          animatedStyle,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={fg} size='small' />
        ) : (
          <>
            {leadingIcon}
            <Text
              variant={size === 'sm' ? 'bodySm' : 'body'}
              style={{ color: fg, fontWeight: '600' }}
            >
              {children}
            </Text>
            {trailingIcon}
          </>
        )}
      </Animated.View>
    </Pressable>
  )
}
