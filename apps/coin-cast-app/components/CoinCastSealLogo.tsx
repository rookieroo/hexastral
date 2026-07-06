import { StyleSheet, View } from 'react-native'

import { useAppTheme } from '@/lib/theme'

/**
 * CoinCast mark — three overlapping 圆形方孔 coins (金钱卦: three coins, one cast),
 * matching the app icon. Two coins behind, one in front; each a filled disc
 * with a square hole punched to the background. Pure-View (no SVG dep).
 */
const COIN = 30
const HOLE = COIN * 0.26
const OVERLAP_X = COIN * 0.58
const DROP_Y = COIN * 0.46

function Coin({
  fill,
  hole,
  rim,
  style,
}: {
  fill: string
  hole: string
  rim: string
  style?: object
}) {
  return (
    <View style={[styles.coin, { backgroundColor: fill, borderColor: rim }, style]}>
      <View style={[styles.hole, { backgroundColor: hole }]} />
    </View>
  )
}

export function CoinCastSealLogo() {
  const { colors } = useAppTheme()
  const back = `${colors.accent}cc`
  const rim = `${colors.bg}55`
  return (
    <View
      style={styles.wrap}
      accessibilityRole='image'
      accessibilityLabel='CoinCast'
      collapsable={false}
    >
      <Coin fill={back} hole={colors.bg} rim={rim} style={{ top: 0, left: 0 }} />
      <Coin fill={back} hole={colors.bg} rim={rim} style={{ top: 0, left: OVERLAP_X }} />
      <Coin
        fill={colors.accent}
        hole={colors.bg}
        rim={rim}
        style={{ top: DROP_Y, left: OVERLAP_X / 2, zIndex: 2 }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    width: COIN + OVERLAP_X,
    height: COIN + DROP_Y,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coin: {
    position: 'absolute',
    width: COIN,
    height: COIN,
    borderRadius: COIN / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hole: {
    width: HOLE,
    height: HOLE,
    borderRadius: 1,
  },
})
