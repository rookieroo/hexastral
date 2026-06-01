/**
 * 十二时辰 wheel — first per-section glossary surface (ADR-0020 chunk 1).
 *
 * 12 地支 cells arranged around a circle (子时 at the 12-o'clock position,
 * clockwise to 亥时). The currently-active 时辰 (computed from wall-clock)
 * is ringed in accent; tapping any cell brings its 子午流注 detail into
 * the center hub + the card below. Tradition uses this 2-hour cadence to
 * align daily activity with the body's meridian schedule — sleep when the
 * liver detoxes, eat breakfast when the stomach opens, nap briefly when
 * the heart fire peaks. Content authored per locale in shichen-content.ts.
 *
 * The center-of-wheel pattern (element ribbon + tap-to-cycle hub) is the
 * reference design subsequent glossary chunks reuse — 60 甲子 paired grid
 * for 干支, 12-palace diagram for 紫微, four-pillar table for 八字.
 */

import { useTheme } from '@zhop/core-ui'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { localizeWuxing } from '@/lib/culture'
import { useStrings } from '@/lib/i18n-context'
import { activeShichenIndex, ELEMENT_COLORS, TWELVE_SHICHEN } from '@/lib/shichen-content'
import { localizeShichen, localizeShichenRange } from '@/lib/shichen-vocab'

const WHEEL_SIZE = 300
const RADIUS = 110
const CELL_SIZE = 52
const CENTER = WHEEL_SIZE / 2
const HUB_DIAMETER = 140

export function ShichenWheel() {
  const { colors, spacing } = useTheme()
  const { locale, t } = useStrings()

  const nowHour = new Date().getHours()
  const activeIndex = activeShichenIndex(nowHour)
  const [selectedIndex, setSelectedIndex] = useState(activeIndex)

  const selected = TWELVE_SHICHEN[selectedIndex] ?? TWELVE_SHICHEN[0]!
  const elementColor = ELEMENT_COLORS[selected.element]

  return (
    <View style={{ gap: spacing.xl }}>
      {/* Wheel — 12 cells in a circle, center hub shows selected detail. */}
      <View
        style={{
          width: WHEEL_SIZE,
          height: WHEEL_SIZE,
          alignSelf: 'center',
          position: 'relative',
        }}
      >
        {TWELVE_SHICHEN.map((entry, i) => {
          // 子时 at top (-π/2), proceeding clockwise.
          const angle = (i / 12) * 2 * Math.PI - Math.PI / 2
          const x = CENTER + RADIUS * Math.cos(angle) - CELL_SIZE / 2
          const y = CENTER + RADIUS * Math.sin(angle) - CELL_SIZE / 2

          const isSelected = i === selectedIndex
          const isActive = i === activeIndex

          const cellBg = isSelected ? ELEMENT_COLORS[entry.element] : colors.card
          const textColor = isSelected ? '#fff' : isActive ? colors.accent : colors.text

          return (
            <Pressable
              key={entry.index}
              onPress={() => setSelectedIndex(i)}
              accessibilityRole='button'
              accessibilityLabel={`${localizeShichen(entry.name, locale)} ${localizeShichenRange(entry.name, entry.range, locale)}`}
              accessibilityState={{ selected: isSelected }}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: CELL_SIZE,
                height: CELL_SIZE,
                borderRadius: CELL_SIZE / 2,
                backgroundColor: cellBg,
                borderWidth: isActive && !isSelected ? 1.5 : 0.5,
                borderColor: isActive ? colors.accent : colors.separator,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: textColor, fontSize: 22, fontWeight: '500' }}>
                {entry.branch}
              </Text>
            </Pressable>
          )
        })}

        {/* Center hub — selected entry summary. */}
        <View
          style={{
            position: 'absolute',
            left: CENTER - HUB_DIAMETER / 2,
            top: CENTER - HUB_DIAMETER / 2,
            width: HUB_DIAMETER,
            height: HUB_DIAMETER,
            borderRadius: HUB_DIAMETER / 2,
            backgroundColor: colors.card,
            borderWidth: 0.5,
            borderColor: colors.separator,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <Text style={{ color: elementColor, fontSize: 36, fontWeight: '300' }}>
            {selected.branch}
          </Text>
          <Text style={{ color: colors.secondary, fontSize: 12, marginTop: 2 }}>
            {localizeShichenRange(selected.name, selected.range, locale)}
          </Text>
          <View
            style={{
              marginTop: 6,
              paddingHorizontal: 10,
              paddingVertical: 2,
              borderRadius: 999,
              borderWidth: 0.5,
              borderColor: elementColor,
            }}
          >
            <Text style={{ color: elementColor, fontSize: 11, letterSpacing: 2 }}>
              {localizeWuxing(selected.element, locale)}
            </Text>
          </View>
        </View>
      </View>

      {/* Detail card — meridian + activity guidance for the selected 时辰. */}
      <View
        style={{
          borderRadius: 16,
          backgroundColor: colors.card,
          borderWidth: 0.5,
          borderColor: colors.separator,
          padding: spacing.lg,
          gap: spacing.sm,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>
            {localizeShichen(selected.name, locale)}
          </Text>
          {selectedIndex === activeIndex ? (
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 999,
                backgroundColor: colors.accent,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 11, letterSpacing: 1, fontWeight: '600' }}>
                {t.shichenWheelActive}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={{ color: colors.secondary, fontSize: 13 }}>
          {t.shichenWheelOrgan} · {selected.organ[locale]}
        </Text>
        <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22 }}>
          {selected.activity[locale]}
        </Text>
      </View>
    </View>
  )
}
