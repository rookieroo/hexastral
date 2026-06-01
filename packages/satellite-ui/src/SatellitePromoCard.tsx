import { getTokens } from '@zhop/hexastral-tokens/palette'
import * as Linking from 'expo-linking'
import type { ReactElement } from 'react'
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native'

export interface SatellitePromoCardProps {
  title?: string
  body?: string
  ctaLabel?: string
  appStoreUrl: string
}

export function SatellitePromoCard(props: SatellitePromoCardProps): ReactElement {
  const colors = getTokens(useColorScheme() === 'dark')
  const title = props.title ?? 'HEXASTRAL'
  const body = props.body ?? 'Unlock your complete fate chart in the flagship app.'
  const ctaLabel = props.ctaLabel ?? 'Open HexAstral'

  return (
    <View style={[styles.card, { borderColor: colors.separator, backgroundColor: colors.card }]}>
      <Text style={[styles.kicker, { color: colors.secondary }]}>MAIN APP</Text>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.secondary }]}>{body}</Text>
      <Pressable
        style={[styles.cta, { borderColor: colors.separator }]}
        onPress={() => void Linking.openURL(props.appStoreUrl)}
      >
        <Text style={[styles.ctaText, { color: colors.text }]}>{ctaLabel}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 0.5,
    borderRadius: 0,
    padding: 14,
    gap: 8,
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
  },
  cta: {
    marginTop: 4,
    borderWidth: 0.5,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
})
