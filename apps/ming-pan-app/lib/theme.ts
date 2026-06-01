/**
 * fate-app theme shim — consumes `useTheme()` from `@zhop/core-ui` (brand="hexastral",
 * the 命 ink/charcoal palette inherited from the retired omnibus app per phase-k-plan
 * §0.1.1 / K.1.1). Call sites receive `{ isDark, colors: ModeTokens }`.
 */

import { useTheme } from '@zhop/core-ui'
import type { ModeTokens } from '@zhop/hexastral-tokens/palette'

export function useAppTheme(): { isDark: boolean; colors: ModeTokens } {
  const theme = useTheme()
  return { isDark: theme.isDark, colors: theme.colors as ModeTokens }
}
