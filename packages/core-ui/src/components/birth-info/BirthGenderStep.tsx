/**
 * BirthGenderStep — step 3: 男 / 女 binary choice.
 *
 * Tap-to-advance (hexastral pattern) — no separate Next CTA. Cannot be
 * skipped: 八字 derivation needs gender.
 */

import * as Haptics from 'expo-haptics'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../theme'
import { BirthProgressIndicator } from './BirthProgressIndicator'
import type { BirthStepProps } from './types'

export function BirthGenderStep({
  value,
  onChange,
  onNext,
  accent,
  copy,
  step,
  totalSteps,
}: BirthStepProps) {
  const { colors, spacing } = useTheme()
  const current = value.gender

  const select = (g: '男' | '女') => {
    Haptics.selectionAsync()
    onChange({ gender: g })
    onNext()
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.xl,
          paddingBottom: spacing.xl,
          flexGrow: 1,
        }}
      >
        <BirthProgressIndicator step={step} total={totalSteps} accentColor={accent} />

        <View style={{ marginTop: spacing['2xl'], gap: spacing.sm }}>
          <Text style={[styles.title, { color: colors.text }]}>{copy.genderTitle}</Text>
          {copy.genderSubtitle ? (
            <Text style={[styles.subtitle, { color: colors.secondary }]}>
              {copy.genderSubtitle}
            </Text>
          ) : null}
        </View>

        <View style={{ flex: 1, minHeight: spacing.xl }} />

        <View style={[styles.row, { marginBottom: spacing['2xl'] }]}>
          <GenderButton
            glyph='男'
            label={copy.genderMale}
            selected={current === '男'}
            accent={accent}
            colors={colors}
            onPress={() => select('男')}
          />
          <GenderButton
            glyph='女'
            label={copy.genderFemale}
            selected={current === '女'}
            accent={accent}
            colors={colors}
            onPress={() => select('女')}
          />
        </View>
      </ScrollView>
    </View>
  )
}

function GenderButton({
  glyph,
  label,
  selected,
  accent,
  colors,
  onPress,
}: {
  glyph: string
  label: string
  selected: boolean
  accent: string
  colors: ReturnType<typeof useTheme>['colors']
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole='button'
      accessibilityState={{ selected }}
      style={[
        styles.btn,
        {
          borderColor: selected ? accent : colors.separator,
          backgroundColor: selected ? `${accent}14` : 'transparent',
        },
      ]}
    >
      <Text style={[styles.glyph, { color: selected ? accent : colors.text }]}>{glyph}</Text>
      <Text style={[styles.label, { color: selected ? accent : colors.secondary }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '500',
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '300',
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  btn: {
    flex: 1,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    gap: 6,
  },
  glyph: {
    fontSize: 32,
    fontWeight: '500',
  },
  label: {
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
})
