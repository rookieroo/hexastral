/**
 * BirthReviewStep — final review with edit shortcuts.
 *
 * Reads from `value` (read-only — does not call `onChange`). Each row is
 * tappable; tapping calls `onEdit(step)` so the parent re-routes back to
 * that step. Submit calls the parent's submit handler with the validated
 * full `BirthInfoValue`.
 */

import { EARTHLY_BRANCHES } from '@zhop/astro-core'
import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../theme'
import { BirthProgressIndicator } from './BirthProgressIndicator'
import type { BirthInfoStep, BirthInfoValue, BirthStepProps } from './types'

interface Props extends BirthStepProps {
  onEdit: (step: BirthInfoStep) => void
  onSubmit: (final: BirthInfoValue) => Promise<void> | void
  /**
   * Steps that the form was configured to skip — those fields are not
   * required for the form to be considered complete. Most importantly:
   * apps that skip 'place' should not require city/lat/lng/timezone.
   */
  skipSteps?: ReadonlyArray<BirthInfoStep>
}

function isComplete(
  v: Partial<BirthInfoValue>,
  skipSteps?: ReadonlyArray<BirthInfoStep>,
  requireTime?: boolean,
  placeOptional?: boolean
): v is BirthInfoValue {
  const placeSkipped = (skipSteps?.includes('place') ?? false) || (placeOptional ?? false)
  const baseOk =
    typeof v.solarDate === 'string' &&
    v.solarDate.length === 10 &&
    (v.gender === '男' || v.gender === '女')
  if (!baseOk) return false
  // Hour pillar matters for apps that read it; without timeIndex the chart
  // engine has to guess (typically defaults to 子时 / 6), which silently
  // produces a wrong reading. Hosts opt into strict via `requireTime`.
  if (requireTime && typeof v.timeIndex !== 'number') return false
  if (placeSkipped) return true
  return (
    typeof v.city === 'string' &&
    v.city.length > 0 &&
    typeof v.lat === 'number' &&
    typeof v.lng === 'number' &&
    typeof v.timezone === 'string'
  )
}

function formatShichen(idx: number): string {
  const branch = EARTHLY_BRANCHES[idx] ?? '?'
  // 12 standard ranges keyed to the shichen index.
  const ranges = [
    '23:00 – 01:00',
    '01:00 – 03:00',
    '03:00 – 05:00',
    '05:00 – 07:00',
    '07:00 – 09:00',
    '09:00 – 11:00',
    '11:00 – 13:00',
    '13:00 – 15:00',
    '15:00 – 17:00',
    '17:00 – 19:00',
    '19:00 – 21:00',
    '21:00 – 23:00',
  ]
  return `${branch} · ${ranges[idx] ?? ''}`
}

export function BirthReviewStep({
  value,
  accent,
  copy,
  step,
  totalSteps,
  onEdit,
  onSubmit,
  skipSteps,
  requireTime,
  placeOptional,
}: Props) {
  const { colors, spacing } = useTheme()
  const [submitting, setSubmitting] = useState(false)
  const complete = isComplete(value, skipSteps, requireTime, placeOptional)

  const handleSubmit = async () => {
    if (!complete || submitting) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setSubmitting(true)
    try {
      await onSubmit(value)
    } finally {
      setSubmitting(false)
    }
  }

  const lunarLine = value.lunarDate
    ? `${value.lunarDate.yearGanZhi}年 ${value.lunarDate.monthName}${value.lunarDate.dayName}`
    : undefined

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
          <Text style={[styles.title, { color: colors.text }]}>{copy.reviewTitle}</Text>
          {copy.reviewSubtitle ? (
            <Text style={[styles.subtitle, { color: colors.secondary }]}>
              {copy.reviewSubtitle}
            </Text>
          ) : null}
        </View>

        <View
          style={{
            marginTop: spacing.xl,
            backgroundColor: colors.card,
            borderRadius: 12,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
          }}
        >
          <ReviewRow
            label={copy.reviewLabels.solarDate}
            value={value.solarDate ?? '—'}
            editCue={copy.reviewEditCue}
            colors={colors}
            accent={accent}
            onPress={() => onEdit('date')}
          />
          {lunarLine ? (
            <ReviewRow
              label={copy.reviewLabels.lunarDate}
              value={lunarLine}
              editCue={copy.reviewEditCue}
              colors={colors}
              accent={accent}
              onPress={() => onEdit('date')}
            />
          ) : null}
          <ReviewRow
            label={copy.reviewLabels.timeIndex}
            value={
              typeof value.timeIndex === 'number'
                ? formatShichen(value.timeIndex)
                : copy.reviewTimeUnknown
            }
            editCue={copy.reviewEditCue}
            colors={colors}
            accent={accent}
            onPress={() => onEdit('time')}
          />
          <ReviewRow
            label={copy.reviewLabels.gender}
            value={value.gender ?? '—'}
            editCue={copy.reviewEditCue}
            colors={colors}
            accent={accent}
            onPress={() => onEdit('gender')}
          />
          {skipSteps?.includes('place') ? null : (
            <ReviewRow
              label={copy.reviewLabels.city}
              value={value.city ?? '—'}
              sublabel={value.timezone}
              editCue={copy.reviewEditCue}
              colors={colors}
              accent={accent}
              onPress={() => onEdit('place')}
            />
          )}
        </View>

        <View style={{ flex: 1, minHeight: spacing.lg }} />

        <Pressable
          onPress={handleSubmit}
          disabled={!complete || submitting}
          style={{
            marginTop: spacing.xl,
            backgroundColor: complete && !submitting ? accent : colors.separator,
            paddingVertical: spacing.lg,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {submitting ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            // Always show the SUBMIT label — disabled style applies when
            // incomplete. (Was using `reviewSubmitLoading` here, which made
            // disabled state misleadingly read as "Saving…".)
            <Text style={[styles.submit, { color: complete ? colors.bg : colors.secondary }]}>
              {copy.reviewSubmit}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  )
}

function ReviewRow({
  label,
  value,
  sublabel,
  editCue,
  colors,
  accent,
  onPress,
}: {
  label: string
  value: string
  sublabel?: string
  editCue: string
  colors: ReturnType<typeof useTheme>['colors']
  accent: string
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={{
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: colors.secondary,
          }}
        >
          {label}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: '400', color: colors.text }}>{value}</Text>
        {sublabel ? (
          <Text style={{ fontSize: 11, fontWeight: '300', color: colors.secondary }}>
            {sublabel}
          </Text>
        ) : null}
      </View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '500',
          color: accent,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
        }}
      >
        {editCue} ›
      </Text>
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
  submit: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
})
