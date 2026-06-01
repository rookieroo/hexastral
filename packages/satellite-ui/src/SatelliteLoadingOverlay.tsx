import { useTheme } from '@zhop/core-ui'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

export interface SatelliteLoadingOverlayProps {
  label?: string
}

export function SatelliteLoadingOverlay(props: SatelliteLoadingOverlayProps) {
  const { colors } = useTheme()

  return (
    <View style={[styles.overlay, { backgroundColor: colors.scrimHeavy }]}>
      <ActivityIndicator color={colors.accent} />
      <Text style={[styles.label, { color: colors.secondary }]}>
        {props.label ?? 'Loading reading...'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: { fontSize: 14 },
})
