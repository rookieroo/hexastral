/**
 * SatelliteResultCard — primary container for a satellite reading's headline +
 * body. Shared infra across all satellites; the brand accent (jade / amber /
 * indigo / violet / copper) is sourced from `<CoreUIProvider brand="...">` so
 * each satellite's result automatically reflects its locked palette
 * (ADR-0004 §1).
 *
 * Visual: a thin accent bar on the left edge + brand-tinted title. Matches the
 * Ink Brutalism aesthetic (square edges, hairline borders).
 */

import { useTheme } from '@zhop/core-ui'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

export interface SatelliteResultCardProps {
  title: string
  body: string
  footer?: ReactNode
}

export function SatelliteResultCard(props: SatelliteResultCardProps) {
  const { colors } = useTheme()
  return (
    <View
      style={[
        styles.card,
        {
          borderColor: colors.separator,
          backgroundColor: colors.card,
          borderLeftColor: colors.accent,
          borderLeftWidth: 2,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>{props.title}</Text>
      <Text style={[styles.body, { color: colors.secondary }]}>{props.body}</Text>
      {props.footer ? <View style={styles.footer}>{props.footer}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderWidth: 0.5,
    borderRadius: 0,
    padding: 14,
    gap: 8,
  },
  title: { fontSize: 16, fontWeight: '600' },
  body: { fontSize: 14, lineHeight: 20 },
  footer: { marginTop: 8 },
})
