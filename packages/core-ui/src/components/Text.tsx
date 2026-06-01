/**
 * Text — typographic primitive bound to the TYPOGRAPHY scale.
 *
 * Replaces all inline `fontSize: NN` usage. Apps must use one of the named
 * variants; arbitrary sizes are deliberately not supported in V1 to enforce
 * the type ramp.
 */

import type { ReactNode } from 'react'
import { Text as RNText, type StyleProp, type TextStyle } from 'react-native'
import { useTheme } from '../theme'

export type TextVariant = 'titleLg' | 'title' | 'titleSm' | 'body' | 'bodySm' | 'label' | 'caption'

export type TextTone = 'default' | 'secondary' | 'accent' | 'dim' | 'warning' | 'success' | 'danger'

export interface TextProps {
  variant?: TextVariant
  tone?: TextTone
  children: ReactNode
  style?: StyleProp<TextStyle>
  numberOfLines?: number
  selectable?: boolean
  italic?: boolean
}

export function Text({
  variant = 'body',
  tone = 'default',
  children,
  style,
  numberOfLines,
  selectable,
  italic = false,
}: TextProps) {
  const { typography, colors } = useTheme()

  const color =
    tone === 'default'
      ? colors.text
      : tone === 'secondary'
        ? colors.secondary
        : tone === 'accent'
          ? colors.accent
          : tone === 'dim'
            ? colors.dim
            : tone === 'warning'
              ? colors.warning
              : tone === 'success'
                ? colors.success
                : colors.danger

  return (
    <RNText
      style={[typography[variant], { color }, italic && { fontStyle: 'italic' }, style]}
      numberOfLines={numberOfLines}
      selectable={selectable}
    >
      {children}
    </RNText>
  )
}
