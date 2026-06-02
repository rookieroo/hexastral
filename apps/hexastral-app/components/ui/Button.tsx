/**
 * Local Button — Pressable-based, useIosPalette-aware.
 *
 * Variants: default (solid tint bg) | outline (accent border) | ghost (transparent, secondary text)
 * Sizes:    lg (h-52, text-15) | default (h-44, text-14) | sm (h-36, text-13)
 */

import type { ReactNode } from 'react'
import type { PressableProps, TextStyle, ViewStyle } from 'react-native'
import { ActivityIndicator, Pressable, Text } from 'react-native'
import { useIosPalette } from '@/lib/theme'

type Variant = 'default' | 'outline' | 'ghost'
type Size = 'lg' | 'default' | 'sm'

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: ReactNode
  variant?: Variant
  size?: Size
  loading?: boolean
  uppercase?: boolean
  style?: ViewStyle
}

export function Button({
  children,
  variant = 'default',
  size = 'default',
  loading = false,
  uppercase = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const ios = useIosPalette()
  const isDisabled = disabled || loading

  // Disabled: use a distinct muted-fill recipe so the CTA reads as inactive
  // without going translucent. The previous global `opacity: 0.4` rendered
  // the dark-on-light tint button nearly invisible (foreground text faded
  // into the bg). Now we hold full alpha and swap colors instead.
  const bgColor: string =
    variant === 'default'
      ? isDisabled
        ? ios.separator
        : ios.tint
      : variant === 'outline'
        ? 'transparent'
        : 'transparent'
  const fgColor: string =
    variant === 'default'
      ? isDisabled
        ? ios.dim
        : ios.tintFg
      : variant === 'outline'
        ? isDisabled
          ? ios.dim
          : ios.accent
        : isDisabled
          ? ios.dim
          : ios.secondary

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: bgColor,
    paddingHorizontal: size === 'sm' ? 12 : size === 'lg' ? 24 : 16,
    height: size === 'lg' ? 52 : size === 'sm' ? 36 : 44,
    ...(variant === 'outline'
      ? { borderWidth: 0.5, borderColor: isDisabled ? ios.separator : ios.accent }
      : {}),
  }

  const textStyle: TextStyle = {
    fontSize: size === 'lg' ? 15 : size === 'sm' ? 13 : 14,
    fontWeight: size === 'lg' ? '500' : '400',
    letterSpacing: 0.2,
    textAlign: 'center',
    textTransform: uppercase ? 'uppercase' : 'none',
    color: fgColor,
  }

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        containerStyle,
        pressed && !isDisabled ? { opacity: 0.75 } : null,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size='small' color={fgColor} />
      ) : (
        <Text style={textStyle}>{children}</Text>
      )}
    </Pressable>
  )
}
