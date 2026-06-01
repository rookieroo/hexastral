/**
 * Numerology theme — Phase F back-compat shim.
 *
 * Now consumes `useTheme()` from `@zhop/core-ui` (brand="numerology" — violet
 * + blue per ADR-0004 §1, the Western mystical palette). Existing call sites
 * continue receiving `{ isDark, colors: ModeTokens }`. New code should import
 * directly from `@zhop/core-ui`.
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
