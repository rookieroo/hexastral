/**
 * SignatureBar — the user's localized identity badge.
 *
 * Consumes the pure output of `signature()` from `@zhop/astro-i18n` and renders:
 *   - CJK locales (compact)  → single row with " · " separators
 *   - Latin / Thai (stacked) → primary on row 1 (uppercased, calligraphy-display
 *                              weight), secondary + tertiary on row 2 (smaller, dim)
 *
 * Defensive fitting:
 *   - `numberOfLines={2}` cap
 *   - `adjustsFontSizeToFit` for the primary line
 *   - If layout overflow is detected (`onTextLayout` reports >2 lines), the
 *     tertiary token is dropped on a re-render
 */

import { type SignatureInput, signature } from '@zhop/astro-i18n'
import { useMemo, useState } from 'react'
import { Text, View, type ViewStyle } from 'react-native'
import { SPACING, TYPOGRAPHY, useIosPalette } from '@/lib/theme'

interface SignatureBarProps {
  input: SignatureInput
  /** Override the container style (e.g. paddingHorizontal). */
  style?: ViewStyle
}

export function SignatureBar({ input, style }: SignatureBarProps) {
  const ios = useIosPalette()
  const [dropTertiary, setDropTertiary] = useState(false)

  const { tokens, display, primary } = useMemo(() => signature(input), [input])

  const visibleTokens = dropTertiary ? tokens.slice(0, 2) : tokens

  if (display === 'compact') {
    return (
      <View style={[{ paddingVertical: SPACING.xs }, style]}>
        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          onTextLayout={(e) => {
            if (e.nativeEvent.lines.length > 2 && !dropTertiary) setDropTertiary(true)
          }}
          style={{
            ...TYPOGRAPHY.titleSm,
            color: ios.text,
            letterSpacing: 1.2,
          }}
        >
          {visibleTokens.join('  ·  ')}
        </Text>
      </View>
    )
  }

  // stacked
  const [head, ...rest] = visibleTokens
  return (
    <View style={[{ paddingVertical: SPACING.xs, gap: 2 }, style]}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={{
          ...TYPOGRAPHY.titleSm,
          color: ios.text,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        {head}
      </Text>
      {rest.length > 0 ? (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          onTextLayout={(e) => {
            if (e.nativeEvent.lines.length > 1 && !dropTertiary) setDropTertiary(true)
          }}
          style={{
            ...TYPOGRAPHY.bodySm,
            color: ios.secondary,
            letterSpacing: 0.5,
          }}
        >
          {rest.join(' · ')}
        </Text>
      ) : null}
    </View>
  )
}

// Re-export the input type so call sites don't need a separate import.
export type { SignatureInput }
