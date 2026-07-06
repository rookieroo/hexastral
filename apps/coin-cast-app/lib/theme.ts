/**
 * Coin Cast theme — Phase F back-compat shim.
 *
 * The local `useAppTheme()` now consumes `useTheme()` from `@zhop/core-ui`
 * (brand="coincast" — zinc + ink wash per ADR-0004 §1). Existing call
 * sites continue receiving `{ isDark, colors: ModeTokens }` so the migration
 * is non-breaking. New code should import directly from `@zhop/core-ui`.
 */

import { useTheme } from '@zhop/core-ui'
import type { ModeTokens } from '@zhop/hexastral-tokens/palette'

/**
 * @deprecated New code should call `useTheme()` from `@zhop/core-ui` directly.
 *             This shim preserves the legacy `{ isDark, colors }` shape.
 */
export function useAppTheme(): { isDark: boolean; colors: ModeTokens } {
  const theme = useTheme()
  // theme.colors is a superset of ModeTokens — the extra fields (accentBright,
  // accentGhost, warning, success, danger) are additive and don't break the
  // structural type compatibility.
  return { isDark: theme.isDark, colors: theme.colors as ModeTokens }
}
