/**
 * MoonLoader — Yuun's brand loading spinner: the shared Skia moon-phase loader in
 * the 苍墨 ink skin (the cinnabar twin is Yuel's). One motion language across the
 * suite, locked to the ink brand.
 *
 * Adapts to light/dark: the dark skin's pale lit face blends into the cream 黄历纸,
 * so `SKIN_INK_LIGHT` (a darker face) is used in light mode. Pass `fullScreen` to
 * render a single centred moon on the theme ground — used for the home's initial
 * load so the screen shows ONE moon instead of several inline ones.
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
