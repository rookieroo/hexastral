/**
 * MoonLoader — Yuun's brand loading spinner: the shared Skia moon-phase loader
 * with a 月白 lit face (苍墨 terminator). One motion language across the suite.
 *
 * Light mode uses SKIN_INK_LIGHT so the disc stays moon-white on cream paper;
 * dark mode uses SKIN_INK. Pass `fullScreen` to centre a single moon on the
 * theme ground (home initial load).
 */
import { useTheme } from '@zhop/core-ui'
import { AutoMoonPhaseLoader } from '@zhop/core-ui/motion'
import { SKIN_INK, SKIN_INK_LIGHT } from '@zhop/hexastral-tokens/moon'
import { View } from 'react-native'

export function MoonLoader({
  size = 56,
  fullScreen = false,
}: {
  size?: number
  fullScreen?: boolean
}) {
  const { colors, mode } = useTheme()
  const skin = mode === 'dark' ? SKIN_INK : SKIN_INK_LIGHT
  if (fullScreen) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bg,
        }}
      >
        <AutoMoonPhaseLoader size={72} skin={skin} />
      </View>
    )
  }
  return <AutoMoonPhaseLoader size={size} skin={skin} />
}
