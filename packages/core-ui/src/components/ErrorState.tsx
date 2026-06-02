/**
 * ErrorState — inline or fullscreen error surface with retry affordance.
 *
 * `variant="inline"` — short banner inside another layout (form error, etc.)
 * `variant="fullscreen"` — replaces the entire surface when load fails
 */

import type { ReactNode } from 'react'
import { type StyleProp, View, type ViewStyle } from 'react-native'
import { useTheme } from '../theme'
import { Button } from './Button'
import { Text } from './Text'

export interface ErrorStateProps {
  variant?: 'inline' | 'fullscreen'
  illustration?: ReactNode
  title: string
  message?: string
  retryLabel?: string
  onRetry?: () => void
  /** Optional secondary action (e.g., "Contact support"). */
  secondaryLabel?: string
  onSecondary?: () => void
  /**
   * Custom action slot — fully replaces the built-in Button(s) when provided.
   * Use for brand-specific CTA patterns (e.g. Kindred's gold-underline text link).
   */
  customAction?: ReactNode
  style?: StyleProp<ViewStyle>
}

export function ErrorState({
  variant = 'fullscreen',
  illustration,
  title,
  message,
  retryLabel,
  onRetry,
  secondaryLabel,
  onSecondary,
  customAction,
  style,
}: ErrorStateProps) {
  const { colors, spacing } = useTheme()

  if (variant === 'inline') {
    return (
      <View
        style={[
          {
            padding: spacing.md,
            borderLeftWidth: 2,
            borderLeftColor: colors.danger,
            backgroundColor: colors.cardElevated,
            gap: 4,
          },
          style,
        ]}
      >
        <Text variant='bodySm' style={{ color: colors.danger, fontWeight: '600' }}>
          {title}
        </Text>
        {message ? (
          <Text variant='bodySm' tone='secondary'>
            {message}
          </Text>
        ) : null}
        {retryLabel && onRetry ? (
          <View style={{ marginTop: spacing.xs }}>
            <Button variant='ghost' size='sm' onPress={onRetry}>
              {retryLabel}
            </Button>
          </View>
        ) : null}
      </View>
    )
  }

  return (
    <View
      style={[
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.xl,
          gap: spacing.lg,
        },
        style,
      ]}
    >
      {illustration ? <View style={{ marginBottom: spacing.sm }}>{illustration}</View> : null}
      <Text variant='title' style={{ textAlign: 'center', color: colors.danger }}>
        {title}
      </Text>
      {message ? (
        <Text variant='body' tone='secondary' style={{ textAlign: 'center' }}>
          {message}
        </Text>
      ) : null}
      {customAction ? (
        <View style={{ marginTop: spacing.sm }}>{customAction}</View>
      ) : (
        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
          {secondaryLabel && onSecondary ? (
            <Button variant='ghost' onPress={onSecondary}>
              {secondaryLabel}
            </Button>
          ) : null}
          {retryLabel && onRetry ? (
            <Button variant='primary' onPress={onRetry}>
              {retryLabel}
            </Button>
          ) : null}
        </View>
      )}
    </View>
  )
}
