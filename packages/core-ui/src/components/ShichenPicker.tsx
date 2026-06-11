/**
 * ShichenPicker — 12-cell 十二时辰 grid for birth-time entry.
 *
 * Y4 extract from apps/hexastral-app/app/(birth)/birth-time.tsx so yuan-app /
 * feng-app / satellites can share the same UX (and the same 0-11 index
 * encoding hexastral-api's `birthTimeIndex` expects).
 *
 * Encoding: 0 = 子 (23:00–01:00), 1 = 丑, …, 11 = 亥. `null` means "unknown"
 * (the caller decides whether/how to expose a skip affordance — this
 * component just renders the grid). Callers MUST persist this 0-11 index
 * verbatim; do not convert via wall-clock hour rounding.
 *
 * Presentational: caller owns layout, headings, and skip CTA. The component
 * is the grid + glyph labels only.
 */

import { Pressable, type StyleProp, Text, View, type ViewStyle } from 'react-native'
import { useTheme } from '../theme'
import { shichenDisplay, shichenRange } from './shichen-i18n'

export type ShichenIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11

interface Shichen {
  readonly index: ShichenIndex
  readonly branch: string
  /** Local-clock range hint shown under the glyph. */
  readonly range: string
}

const SHICHEN: ReadonlyArray<Shichen> = [
  { index: 0, branch: '子', range: '23:00 – 01:00' },
  { index: 1, branch: '丑', range: '01:00 – 03:00' },
  { index: 2, branch: '寅', range: '03:00 – 05:00' },
  { index: 3, branch: '卯', range: '05:00 – 07:00' },
  { index: 4, branch: '辰', range: '07:00 – 09:00' },
  { index: 5, branch: '巳', range: '09:00 – 11:00' },
  { index: 6, branch: '午', range: '11:00 – 13:00' },
  { index: 7, branch: '未', range: '13:00 – 15:00' },
  { index: 8, branch: '申', range: '15:00 – 17:00' },
  { index: 9, branch: '酉', range: '17:00 – 19:00' },
  { index: 10, branch: '戌', range: '19:00 – 21:00' },
  { index: 11, branch: '亥', range: '21:00 – 23:00' },
]

export interface ShichenPickerProps {
  /** Current selection (0-11) or null for unset. */
  value: ShichenIndex | null
  /** Fires when the user taps a cell. */
  onChange: (index: ShichenIndex) => void
  /**
   * Optional haptic callback fired on selection. Caller can wire
   * `Haptics.selectionAsync` from `expo-haptics`; component does not import
   * expo to keep it install-time-light.
   */
  onSelect?: () => void
  /** Forwarded onto the outer grid container. */
  style?: StyleProp<ViewStyle>
  /**
   * Override the accent color used for the selected cell background + label.
   * Defaults to the active theme's brand accent so the selected chip carries
   * the satellite's identity (Auspice terracotta, Kindred gold, etc.) rather
   * than a brand-neutral near-black.
   */
  accentColor?: string
  /**
   * BCP-47 locale. Latin scripts (e.g. 'en') lead each cell with the zodiac
   * ANIMAL + clock range instead of the opaque 「子」branch glyph; CJK / unset
   * keeps the glyph. See shichen-i18n.
   */
  locale?: string
}

export function ShichenPicker({
  value,
  onChange,
  onSelect,
  style,
  accentColor,
  locale,
}: ShichenPickerProps) {
  const { colors } = useTheme()
  const activeBg = accentColor ?? colors.accent
  const activeFg = colors.bg
  const inactiveBorder = colors.separator
  const inactiveLabel = colors.text
  const inactiveRange = colors.secondary

  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, style]}>
      {SHICHEN.map((s) => {
        const active = value === s.index
        const disp = shichenDisplay(s.index, s.branch, locale)
        // CJK leads with the 「子」glyph (big); Latin leads with the zodiac animal
        // (readable). The clock range is localised (24h for CJK, AM/PM for Latin);
        // the grid stays clean (the branch seal lives in the field summary).
        const lead = disp.cjk ? s.branch : disp.animal
        const sub = shichenRange(s.range, locale)
        return (
          <Pressable
            key={s.index}
            onPress={() => {
              onSelect?.()
              onChange(s.index)
            }}
            style={{
              width: '30%',
              paddingVertical: 14,
              alignItems: 'center',
              borderWidth: 0.5,
              borderColor: active ? activeBg : inactiveBorder,
              backgroundColor: active ? activeBg : 'transparent',
            }}
            accessibilityRole='button'
            accessibilityState={{ selected: active }}
            accessibilityLabel={
              disp.cjk
                ? `${s.branch} ${s.range}`
                : `${disp.animal}, ${shichenRange(s.range, locale)}`
            }
          >
            <Text
              style={{
                color: active ? activeFg : inactiveLabel,
                fontSize: disp.cjk ? 22 : 16,
                fontWeight: '500',
              }}
            >
              {lead}
            </Text>
            <Text
              style={{
                color: active ? activeFg : inactiveRange,
                fontSize: disp.cjk ? 10 : 11,
                fontWeight: '300',
                marginTop: 2,
              }}
            >
              {sub}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
