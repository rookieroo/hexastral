/**
 * EmptyState — replaces the bare "no data" Views found across apps.
 *
 * Apps pass:
 *   - `illustration` — an SVG (brand-specific glyph like Kindred / 風 / etc.)
 *   - `title` — short headline
 *   - `subtitle` — one-line explanation
 *   - optional CTA via `actionLabel` + `onAction`
 *
 * Replaces:
 *   - apps/hexastral-app/components/ui/EmptyState.tsx (icon-only version)
 *   - feng-app's plain "Report pending" text
 *   - yuan-app's "Bond not found" plain text
 */

import type { ReactNode } from 'react'
import { type StyleProp, View, type ViewStyle } from 'react-native'
import { useTheme } from '../theme'
import { Button } from './Button'
import { Text } from './Text'

export interface EmptyStateProps {
  illustration?: ReactNode
  title: string
  subtitle?: string
  /** Built-in Button action. Use this for default brand styling. */
  actionLabel?: string
  onAction?: () => void
  /**
   * Custom action slot — fully replaces the built-in Button rendering when
   * provided. Use this for brand-specific CTAs (e.g. Kindred's gold-underline
   * text link via kindredPresets.ctaText) that should not be a boxed button.
   */
  customAction?: ReactNode
  style?: StyleProp<ViewStyle>
}

export function EmptyState({
  illustration,
  title,
  subtitle,
  actionLabel,
  onAction,
  customAction,
  style,
}: EmptyStateProps) {
  const { spacing } = useTheme()

  return (
    <View
      style={[
        {
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing['2xl'],
          gap: spacing.lg,
        },
        style,
      ]}
    >
      {illustration ? <View style={{ marginBottom: spacing.sm }}>{illustration}</View> : null}
      <Text variant='title' style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant='body' tone='secondary' style={{ textAlign: 'center' }}>
          {subtitle}
        </Text>
      ) : null}
      {customAction ? (
        <View style={{ marginTop: spacing.sm }}>{customAction}</View>
      ) : actionLabel && onAction ? (
        <View style={{ marginTop: spacing.sm }}>
          <Button variant='primary' onPress={onAction}>
            {actionLabel}
          </Button>
        </View>
      ) : null}
    </View>
  )
}
