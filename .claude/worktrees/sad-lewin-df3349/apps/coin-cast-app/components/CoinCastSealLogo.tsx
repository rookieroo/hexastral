import { StyleSheet, Text, View } from 'react-native'

import { useAppTheme } from '@/lib/theme'

/** Flat CoinCast mark — round coin with square hole (no decorative Lucide art). */
export function CoinCastSealLogo() {
  const { colors } = useAppTheme()
  return (
    <View
      style={styles.wrap}
      accessibilityRole='image'
      accessibilityLabel='CoinCast'
    >
      <View style={[styles.coinRing, { borderColor: colors.accent }]}>
        <View style={[styles.hole, { backgroundColor: colors.bg }]} />
      </View>
    </View>
  )
}

const RING = 48

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  coinRing: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hole: {
    width: 14,
    height: 14,
    borderRadius: 0,
  },
})
