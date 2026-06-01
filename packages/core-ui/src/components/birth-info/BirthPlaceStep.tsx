/**
 * BirthPlaceStep — step 4: city of birth.
 *
 * Thin layout shell around the existing `CityPicker` primitive. Captures
 * `city` + `lat` + `lng` + `timezone` (the last three drive 真太阳时
 * correction server-side).
 */

import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../theme'
import { CityPicker, type CityRecord } from '../CityPicker'
import { BirthProgressIndicator } from './BirthProgressIndicator'
import type { BirthStepProps } from './types'

interface Props extends BirthStepProps {
  searchCity: (query: string) => Promise<CityRecord[]>
  topCities?: ReadonlyArray<CityRecord>
}

export function BirthPlaceStep({
  value,
  onChange,
  onNext,
  accent,
  copy,
  step,
  totalSteps,
  searchCity,
  topCities,
}: Props) {
  const { colors, spacing } = useTheme()

  // Rebuild a CityRecord from existing draft fields so CityPicker shows
  // the previous selection on re-entry. country left blank — the picker
  // only cares about `name` for the controlled display.
  const initial: CityRecord | null =
    value.city && typeof value.lat === 'number' && typeof value.lng === 'number'
      ? {
          name: value.city,
          country: '',
          lat: value.lat,
          lng: value.lng,
          timezone: value.timezone ?? null,
        }
      : null
  const [picked, setPicked] = useState<CityRecord | null>(initial)

  const handlePick = (city: CityRecord) => {
    Haptics.selectionAsync()
    setPicked(city)
  }

  const handleNext = () => {
    if (!picked) return
    Haptics.selectionAsync()
    onChange({
      city: picked.name,
      lat: picked.lat,
      lng: picked.lng,
      timezone: picked.timezone ?? 'UTC',
    })
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
        keyboardShouldPersistTaps='handled'
      >
        <BirthProgressIndicator step={step} total={totalSteps} accentColor={accent} />

        <View style={{ marginTop: spacing['2xl'], gap: spacing.sm }}>
          <Text style={[styles.title, { color: colors.text }]}>{copy.placeTitle}</Text>
          {copy.placeSubtitle ? (
            <Text style={[styles.subtitle, { color: colors.secondary }]}>{copy.placeSubtitle}</Text>
          ) : null}
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <CityPicker
            value={picked}
            onSelect={handlePick}
            search={searchCity}
            topCities={topCities ? Array.from(topCities) : undefined}
            placeholder={copy.placeSearchPlaceholder}
          />
        </View>

        <View style={{ flex: 1, minHeight: spacing.lg }} />

        <View style={[styles.footer, { marginTop: spacing.xl }]}>
          <Pressable
            onPress={handleNext}
            hitSlop={12}
            disabled={!picked}
            style={{ opacity: picked ? 1 : 0.3 }}
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
    justifyContent: 'flex-end',
  },
  cta: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
})
