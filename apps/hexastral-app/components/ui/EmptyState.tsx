/**
 * EmptyState — centered placeholder for screens with no content.
 *
 * Renders: Lucide icon + title + subtitle + optional CTA button.
 * Follows Ink Brutalism: monochrome icon, Zinc palette, square button.
 */

import type { ReactNode } from 'react'
import { Text, View, type ViewStyle } from 'react-native'
import { SPACING, TYPOGRAPHY, useIosPalette } from '@/lib/theme'
import { Button } from './Button'

interface EmptyStateProps {
  icon: (color: string) => ReactNode
  title: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
  style?: ViewStyle
}

export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  const ios = useIosPalette()

  return (
    <View
      style={[
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: SPACING.xl,
          gap: SPACING.md,
        },
        style,
      ]}
    >
      {icon(ios.dim)}
      <Text
        style={{
          ...TYPOGRAPHY.titleSm,
          color: ios.text,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            ...TYPOGRAPHY.bodySm,
            color: ios.secondary,
            textAlign: 'center',
          }}
        >
          {subtitle}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button onPress={onAction} style={{ marginTop: SPACING.sm }}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  )
}
