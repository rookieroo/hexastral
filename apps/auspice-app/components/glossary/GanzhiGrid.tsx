/**
 * 干支 60-甲子 grid — Glossary chunk 2 (ADR-0020).
 *
 * Three stacked reference sections:
 *   1. 10 天干 strip — each cell tinted with the stem's 五行 color, plus the
 *      stem's 阴阳 polarity dot and Mandarin pinyin underneath.
 *   2. 12 地支 strip — each cell shows 地支 + 五行 + 生肖 (localized) +
 *      pinyin. Two rows of 6 on a phone.
 *   3. 60-甲子 paired grid — 10 columns × 6 rows; current year's 干支 sits
 *      in a softly-tinted background; tap any cell to load that combo into
 *      the detail card below (year of nearest occurrence + element + animal).
 *
 * The 10×6 layout is the canonical scholarly arrangement: COLUMN = stem
 * family, ROW = a 10-step segment of the cycle. Reading row-by-row from
 * top-left walks the 60-year sequence in order; reading column-by-column
 * shows the same stem cycling through six branches.
 *
 * Reuses the shared 五行 palette (ELEMENT_COLORS) from the 时辰 wheel so the
 * visual language of the glossary stays consistent across surfaces.
 */

import { useTheme } from '@zhop/core-ui'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { localizePolarity, localizeWuxing } from '@/lib/culture'
import {
  type JiaziCombo,
  jiaziIndexForYear,
  nearestYearForCombo,
  SIXTY_JIAZI,
  TEN_STEMS,
  TWELVE_BRANCHES,
} from '@/lib/ganzhi-content'
import { useStrings } from '@/lib/i18n-context'
import { ELEMENT_COLORS } from '@/lib/shichen-content'

export function GanzhiGrid() {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()

  const nowYear = new Date().getFullYear()
  const currentIndex = jiaziIndexForYear(nowYear)
  const [selectedIndex, setSelectedIndex] = useState(currentIndex)
  const selected = SIXTY_JIAZI[selectedIndex] ?? SIXTY_JIAZI[0]!
  const selectedYear = nearestYearForCombo(selected.index, nowYear)
  const selectedStemColor = ELEMENT_COLORS[selected.stem.element]
  const selectedBranchColor = ELEMENT_COLORS[selected.branch.element]

  return (
    <View style={{ gap: spacing.xl }}>
      {/* 10 天干 strip */}
      <Section title={t.ganzhiStemsTitle} colors={colors}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {TEN_STEMS.map((stem) => {
            const stemColor = ELEMENT_COLORS[stem.element]
            return (
              <View
                key={stem.char}
                style={{
                  flex: 1,
                  aspectRatio: 0.82,
                  borderRadius: 8,
                  borderWidth: 0.5,
                  borderColor: colors.separator,
                  backgroundColor: colors.card,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: stemColor, fontSize: 18, fontWeight: '500' }}>
                  {stem.char}
                </Text>
                {/* numberOfLines=1 + adjustsFontSizeToFit guards against the
                    EN-locale `Wood·Yang` / `Earth·Yang` wrapping in the narrow
                    cell — RN auto-shrinks down to the minimum scale instead
                    of breaking onto a second line that overflows the box. */}
                <Text
                  style={{ color: colors.dim, fontSize: 8, letterSpacing: 0.5 }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {localizeWuxing(stem.element, locale)}·{localizePolarity(stem.polarity, locale)}
                </Text>
              </View>
            )
          })}
        </View>
      </Section>

      {/* 12 地支 strip — 2 rows × 6 cols */}
      <Section title={t.ganzhiBranchesTitle} colors={colors}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {TWELVE_BRANCHES.map((branch) => {
            const branchColor = ELEMENT_COLORS[branch.element]
            return (
              <View key={branch.char} style={{ width: '16.66%', padding: 2 }}>
                <View
                  style={{
                    aspectRatio: 0.78,
                    borderRadius: 8,
                    borderWidth: 0.5,
                    borderColor: colors.separator,
                    backgroundColor: colors.card,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ color: branchColor, fontSize: 18, fontWeight: '500' }}>
                    {branch.char}
                  </Text>
                  <Text
                    style={{ color: colors.secondary, fontSize: 10 }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {branch.animal[locale]}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>
      </Section>

      {/* 60-甲子 grid — 10 cols × 6 rows */}
      <Section title={t.ganzhiSixtyTitle} colors={colors}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {SIXTY_JIAZI.map((combo) => {
            const isSelected = combo.index === selectedIndex
            const isCurrent = combo.index === currentIndex
            const stemColor = ELEMENT_COLORS[combo.stem.element]
            return (
              <Pressable
                key={combo.index}
                onPress={() => setSelectedIndex(combo.index)}
                accessibilityRole='button'
                accessibilityLabel={combo.label}
                accessibilityState={{ selected: isSelected }}
                style={{ width: '10%', padding: 1 }}
              >
                <View
                  style={{
                    aspectRatio: 1.05,
                    borderRadius: 6,
                    borderWidth: isSelected ? 1.5 : 0.5,
                    borderColor: isSelected ? colors.accent : colors.separator,
                    backgroundColor: isCurrent ? colors.accentGhost : colors.card,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: isSelected ? colors.accent : stemColor,
                      fontSize: 11,
                      fontWeight: isCurrent || isSelected ? '600' : '400',
                    }}
                  >
                    {combo.label}
                  </Text>
                </View>
              </Pressable>
            )
          })}
        </View>
      </Section>

      {/* Detail card */}
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
            alignItems: 'baseline',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: '500' }}>
            <Text style={{ color: selectedStemColor }}>{selected.stem.char}</Text>
            <Text style={{ color: selectedBranchColor }}>{selected.branch.char}</Text>
          </Text>
          <Text style={{ color: colors.dim, fontSize: 12, letterSpacing: 1 }}>
            {t.ganzhiComboIndex.replace('{index}', String(selected.index + 1))}
          </Text>
        </View>
        <DetailRow
          label={selected.stem.char}
          value={`${localizeWuxing(selected.stem.element, locale)} · ${localizePolarity(selected.stem.polarity, locale)} · ${selected.stem.pinyin}`}
          colors={colors}
          accent={selectedStemColor}
        />
        <DetailRow
          label={selected.branch.char}
          value={`${localizeWuxing(selected.branch.element, locale)} · ${selected.branch.animal[locale]} · ${selected.branch.pinyin}`}
          colors={colors}
          accent={selectedBranchColor}
        />
        <DetailRow
          label={t.ganzhiYearLabel}
          value={String(selectedYear)}
          colors={colors}
          accent={colors.accent}
        />
      </View>
    </View>
  )
}

function Section({
  title,
  colors,
  children,
}: {
  title: string
  colors: { secondary: string }
  children: React.ReactNode
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3 }}>{title}</Text>
      {children}
    </View>
  )
}

function DetailRow({
  label,
  value,
  colors,
  accent,
}: {
  label: string
  value: string
  colors: { dim: string }
  accent: string
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12 }}>
      <Text style={{ color: accent, fontSize: 16, fontWeight: '500', minWidth: 28 }}>{label}</Text>
      <Text style={{ color: colors.dim, fontSize: 13, flex: 1 }}>{value}</Text>
    </View>
  )
}

export type _GanzhiGridPropsExample = Pick<JiaziCombo, 'index'>
