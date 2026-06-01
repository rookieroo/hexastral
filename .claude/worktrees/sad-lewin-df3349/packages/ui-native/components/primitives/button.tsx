/**
 * Button — Pressable-based, theme-aware.
 * Variants: default (solid tint bg) | ghost (transparent, secondary text) | outline (bordered)
 * Sizes: lg | default | sm
 *
 * Does NOT use CSS variables — uses inline style driven by useIosPalette hook
 * to avoid NativeWind CSS variable resolution issues on React Native.
 */
import { ActivityIndicator, Pressable, Text } from 'react-native'
import type { PressableProps, ViewStyle, TextStyle } from 'react-native'
import type { ReactNode } from 'react'

type Variant = 'default' | 'ghost' | 'outline'
type Size = 'lg' | 'default' | 'sm'

interface IosPalette {
  tint: string
  tintFg: string
  secondary: string
  separator: string
  card: string
  text: string
}

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: ReactNode
  variant?: Variant
  size?: Size
  loading?: boolean
  uppercase?: boolean
  style?: ViewStyle
  /** Must pass the ios palette from useIosPalette() in the consuming component */
  ios: IosPalette
}

export function Button({
  children,
  variant = 'default',
  size = 'default',
  loading = false,
  uppercase = false,
  disabled,
  style,
  ios,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading

  const bgColor =
    variant === 'default' ? ios.tint : variant === 'outline' ? 'transparent' : 'transparent'
  const fgColor =
    variant === 'default' ? ios.tintFg : variant === 'ghost' ? ios.secondary : ios.text

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: bgColor,
    paddingHorizontal: size === 'sm' ? 12 : size === 'lg' ? 24 : 16,
    height: size === 'lg' ? 52 : size === 'sm' ? 36 : 44,
    borderWidth: variant === 'outline' ? 1 : 0,
    borderColor: variant === 'outline' ? ios.separator : undefined,
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
        { opacity: isDisabled ? 0.5 : pressed ? 0.75 : 1 },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fgColor} />
      ) : (
        <Text style={textStyle}>{children}</Text>
      )}
    </Pressable>
  )
}
