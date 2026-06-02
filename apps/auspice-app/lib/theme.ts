/**
 * Auspice theme — back-compat shim over `@zhop/core-ui` (brand="cycle" — 朱泥 terra
 * per ADR-0010 §6). New code should call `useTheme()` from `@zhop/core-ui` directly;
 * this preserves the `{ isDark, colors: ModeTokens }` shape for legacy call sites.
 */

import { useTheme } from '@zhop/core-ui'
import type { ModeTokens } from '@zhop/hexastral-tokens/palette'

/**
 * @deprecated New code should call `useTheme()` from `@zhop/core-ui` directly.
 */
export function useAppTheme(): { isDark: boolean; colors: ModeTokens } {
  const theme = useTheme()
  return { isDark: theme.isDark, colors: theme.colors as ModeTokens }
}
