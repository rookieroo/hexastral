/**
 * BirthTimeStep — step 2: 12-cell 十二时辰 grid.
 *
 * Thin layout shell around the existing `ShichenPicker` primitive. Adds
 * the step chrome (progress / title / subtitle), the Skip ("I don't know")
 * affordance, and the Next CTA.
 */

import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../theme'
import { type ShichenIndex, ShichenPicker } from '../ShichenPicker'
import { BirthProgressIndicator } from './BirthProgressIndicator'
import type { BirthStepProps } from './types'

export function BirthTimeStep({
  value,
  onChange,
  onNext,
  accent,
  copy,
  step,
  totalSteps,
  requireTime,
}: BirthStepProps) {
  const { colors, spacing } = useTheme()
  const initial = value.timeIndex ?? null
  const [picked, setPicked] = useState<ShichenIndex | null>(initial)

  const handleNext = () => {
    if (picked === null) return
    Haptics.selectionAsync()
    onChange({ timeIndex: picked })
    onNext()
  }

  // Skip is only available when the host hasn't marked time as required.
  // For apps that read the hour pillar (kindred / yuan / numerology / cycle),
  // a null timeIndex breaks the chart; they pass `requireTime` to lock this.
  const handleSkip = requireTime
    ? null
    : () => {
        Haptics.selectionAsync()
        onChange({ timeIndex: null })
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
          <Text style={[styles.title, { color: colors.text }]}>{copy.timeTitle}</Text>
          {copy.timeSubtitle ? (
            <Text style={[styles.subtitle, { color: colors.secondary }]}>{copy.timeSubtitle}</Text>
          ) : null}
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <ShichenPicker
            value={picked}
            onChange={setPicked}
            onSelect={() => Haptics.selectionAsync()}
            accentColor={accent}
          />
        </View>

        <View style={{ flex: 1, minHeight: spacing.lg }} />

        <View
          style={[
            styles.footer,
            // Without a skip affordance the CTA aligns right (no left sibling
            // to balance against), which matches every other required step.
            { marginTop: spacing.xl, justifyContent: handleSkip ? 'space-between' : 'flex-end' },
          ]}
        >
          {handleSkip ? (
            <Pressable onPress={handleSkip} hitSlop={12}>
              <Text style={[styles.skip, { color: colors.secondary }]}>{copy.timeSkipLabel}</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={handleNext}
            hitSlop={12}
            disabled={picked === null}
            style={{ opacity: picked === null ? 0.3 : 1 }}
          >
            <Text style={[styles.cta, { color: accent }]}>{copy.next}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skip: {
    fontSize: 13,
    fontWeight: '300',
    textDecorationLine: 'underline',
  },
  cta: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
})
