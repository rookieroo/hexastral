import { getTokens } from '@zhop/hexastral-tokens/palette'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View, useColorScheme } from 'react-native'

export interface SatelliteResultCardProps {
  title: string
  body: string
  footer?: ReactNode
}

export function SatelliteResultCard(props: SatelliteResultCardProps) {
  const colors = getTokens(useColorScheme() === 'dark')
  return (
    <View style={[styles.card, { borderColor: colors.separator, backgroundColor: colors.card }]}>
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
