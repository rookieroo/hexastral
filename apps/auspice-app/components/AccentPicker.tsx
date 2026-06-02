/**
 * AccentPicker — 4-variant brand-color switcher for cycle. Default 朱泥
 * (terra) per ADR-0010 §6; the alt variants (苍墨/靛青/赭金) are
 * 黄历-coherent inks for users who find the red overwhelming.
 *
 * Each tile is a filled swatch (the variant's `accent` hex) with the
 * localized name underneath. Selected tile gets an outline ring in the
 * variant's own accent so the picker reads even on dark mode.
 */

import { useTheme } from '@zhop/core-ui'
import { auspiceAccentVariants } from '@zhop/hexastral-tokens/satellites'
import { Pressable, Text, View } from 'react-native'
import { ACCENT_VARIANT_LABELS, type AuspiceAccentVariant, useAccentVariant } from '@/lib/accent'
import { useStrings } from '@/lib/i18n-context'

const ORDER: readonly AuspiceAccentVariant[] = ['terra', 'ink', 'azurite', 'gold']

export function AccentPicker() {
  const { colors, spacing } = useTheme()
  const { locale } = useStrings()
  const { variant, setVariant } = useAccentVariant()
  const labels = ACCENT_VARIANT_LABELS[locale]

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {ORDER.map((v) => {
        const sel = v === variant
        const swatch = auspiceAccentVariants[v].accent
        return (
          <Pressable
            key={v}
            onPress={() => setVariant(v)}
            accessibilityRole='button'
            accessibilityState={{ selected: sel }}
            accessibilityLabel={labels[v].name}
            style={{
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: spacing.sm,
              paddingTop: spacing.sm,
              paddingBottom: spacing.sm,
              borderRadius: 14,
              borderWidth: sel ? 1 : 0.5,
              borderColor: sel ? swatch : colors.separator,
              backgroundColor: sel ? `${swatch}14` : 'transparent',
              minWidth: 76,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: swatch,
                borderWidth: sel ? 2 : 0,
                borderColor: colors.bg,
              }}
            />
            <Text
              style={{
                color: sel ? swatch : colors.text,
                fontSize: 12,
                fontWeight: sel ? '600' : '500',
              }}
            >
              {labels[v].name}
            </Text>
            <Text style={{ color: colors.dim, fontSize: 10 }}>{labels[v].hint}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}
