/**
 * SatelliteQuestionTypePicker — collects the user's intent before a reading,
 * driving server-side `suggestedFlagship` and downstream funnel CTA copy.
 *
 * Render before the satellite's "Generate" button; pass the chosen value into
 * `runPreview / runLinked / runAuto` as `questionType`.
 */

import { useTheme } from '@zhop/core-ui'
import type { ModeTokens } from '@zhop/hexastral-tokens/palette'
import type { QuestionType } from '@zhop/portfolio-client'
import type { ReactElement } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

export interface SatelliteQuestionTypePickerLabels {
  prompt: string
  relationship: string
  home_office: string
  career_wealth: string
  self_daily: string
  skip?: string
}

export interface SatelliteQuestionTypePickerProps {
  value: QuestionType | null
  onChange: (next: QuestionType | null) => void
  labels: SatelliteQuestionTypePickerLabels
  /** When true, render a single line of chips instead of stacked rows. */
  compact?: boolean
  /** Override which intents are offered (default: all four). */
  options?: readonly QuestionType[]
}

const DEFAULT_OPTIONS: readonly QuestionType[] = [
  'relationship',
  'home_office',
  'career_wealth',
  'self_daily',
] as const

export function SatelliteQuestionTypePicker(props: SatelliteQuestionTypePickerProps): ReactElement {
  const { value, onChange, labels, compact = false, options = DEFAULT_OPTIONS } = props
  // Consume the brand theme set by the host's `<CoreUIProvider>` so hosts
  // that force dark (fate-app) stay dark even when system is light.
  const colors = useTheme().colors as ModeTokens

  return (
    <View style={styles.root}>
      <Text style={[styles.prompt, { color: colors.secondary }]}>{labels.prompt}</Text>
      <View style={compact ? styles.row : styles.column}>
        {options.map((opt) => {
          const selected = value === opt
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(selected ? null : opt)}
              style={[
                compact ? styles.chip : styles.option,
                {
                  borderColor: selected ? colors.text : colors.separator,
                  backgroundColor: selected ? colors.text : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  compact ? styles.chipText : styles.optionText,
                  { color: selected ? colors.bg : colors.text },
                ]}
              >
                {labels[opt]}
              </Text>
            </Pressable>
          )
        })}
      </View>
      {labels.skip ? (
        <Pressable onPress={() => onChange(null)} hitSlop={8}>
          <Text style={[styles.skip, { color: colors.secondary }]}>{labels.skip}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    gap: 10,
  },
  prompt: {
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  column: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  option: {
    borderWidth: 0.5,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  optionText: {
    fontSize: 14,
    lineHeight: 18,
  },
  chip: {
    borderWidth: 0.5,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chipText: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  skip: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    alignSelf: 'center',
    marginTop: 4,
  },
})
