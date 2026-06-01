import { darkTokens } from '@zhop/hexastral-tokens/palette'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

export interface SatelliteLoadingOverlayProps {
  label?: string
}

export function SatelliteLoadingOverlay(props: SatelliteLoadingOverlayProps) {
  return (
    <View style={styles.overlay}>
      <ActivityIndicator color={darkTokens.accent} />
      <Text style={styles.label}>{props.label ?? 'Loading reading...'}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9,9,11,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: { color: darkTokens.secondary, fontSize: 14 },
})
