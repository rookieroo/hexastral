/**
 * (new-site)/building — step 3 of 6.
 *
 * Implements the fallback ladder from feng-plan §6:
 *   exact / decade / move-in / unknown.
 *
 * Each level loosens accuracy but keeps 八宅 + 流年 chapters available.
 * `unknown` drops 玄空 entirely; the data-quality footer in the report
 * surfaces this to the user.
 */

import { Button, useHaptic } from '@zhop/core-ui'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ProgressIndicator } from '@/components/ProgressIndicator'
import { resolveLocale, useStrings } from '@/lib/i18n'
import { loadDraft, patchDraft, type SiteDraft } from '@/lib/siteDraft'
import { spacing, useFengTheme } from '@/lib/theme'

type Accuracy = NonNullable<SiteDraft['buildYearAccuracy']>

const ACCURACY_OPTIONS: ReadonlyArray<Accuracy> = ['exact', 'decade', 'moveIn', 'unknown']

type ResidenceType = NonNullable<SiteDraft['residenceType']>

const RESIDENCE_OPTIONS: ReadonlyArray<ResidenceType> = ['apartment', 'flat', 'villa']

export default function BuildingScreen() {
  const router = useRouter()
  const { colors } = useFengTheme()
  const t = useStrings(resolveLocale())
  const haptic = useHaptic()
  const insets = useSafeAreaInsets()

  const [residence, setResidence] = useState<ResidenceType>('apartment')
  const [accuracy, setAccuracy] = useState<Accuracy>('unknown')
  const [buildYear, setBuildYear] = useState('')
  const [moveInYear, setMoveInYear] = useState('')
  const [floor, setFloor] = useState('')
  const [floorError, setFloorError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const d = await loadDraft()
      if (d.residenceType) setResidence(d.residenceType)
      if (d.buildYearAccuracy) setAccuracy(d.buildYearAccuracy)
      if (typeof d.buildYear === 'number') setBuildYear(String(d.buildYear))
      if (typeof d.moveInYear === 'number') setMoveInYear(String(d.moveInYear))
      if (typeof d.floor === 'number') setFloor(String(d.floor))
    })()
  }, [])

  const accuracyLabel = (a: Accuracy): string => {
    switch (a) {
      case 'exact':
        return t.new_site_building_accuracy_exact
      case 'decade':
        return t.new_site_building_accuracy_decade
      case 'moveIn':
        return t.new_site_building_accuracy_moveIn
      case 'unknown':
        return t.new_site_building_accuracy_unknown
    }
  }

  const residenceLabel = (r: ResidenceType): string => {
    switch (r) {
      case 'apartment':
        return t.new_site_residence_apartment
      case 'flat':
        return t.new_site_residence_flat
      case 'villa':
        return t.new_site_residence_villa
    }
  }

  const next = async () => {
    const parsedFloor = Number.parseInt(floor, 10)
    // 大平层 needs a floor so street 形煞 can be height-weighted (a high floor is
    // over-hit by ground-level 壁刀/天斩 otherwise). Villa/apartment: floor optional.
    if (residence === 'flat' && !Number.isFinite(parsedFloor)) {
      setFloorError(t.new_site_building_floor_required)
      return
    }
    setFloorError(null)
    const patch: Partial<SiteDraft> = { residenceType: residence, buildYearAccuracy: accuracy }
    if (accuracy === 'exact' || accuracy === 'decade') {
      const y = Number.parseInt(buildYear, 10)
      if (Number.isFinite(y)) patch.buildYear = y
    }
    if (accuracy === 'moveIn') {
      const y = Number.parseInt(moveInYear, 10)
      if (Number.isFinite(y)) patch.moveInYear = y
    }
    const f = Number.parseInt(floor, 10)
    if (Number.isFinite(f)) patch.floor = f
    await patchDraft(patch)
    router.push('/(new-site)/floorplan')
  }

  const showBuildYearInput = accuracy === 'exact' || accuracy === 'decade'
  const showMoveInYearInput = accuracy === 'moveIn'

  return (
    <ScrollView
      contentContainerStyle={{
        paddingTop: insets.top + spacing.xl,
        paddingHorizontal: spacing.xl,
        paddingBottom: insets.bottom + spacing.xl,
        gap: spacing.lg,
        backgroundColor: colors.bg,
        flexGrow: 1,
      }}
    >
      <ProgressIndicator step={2} total={4} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>
        {t.new_site_building_title}
      </Text>

      <View style={{ gap: spacing.sm }}>
        <Text
          style={{
            fontSize: 12,
            color: colors.textMute,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {t.new_site_residence_label}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {RESIDENCE_OPTIONS.map((opt) => {
            const selected = opt === residence
            return (
              <Pressable
                key={opt}
                onPress={() => {
                  void haptic('selection')
                  setResidence(opt)
                  if (opt !== 'flat') setFloorError(null)
                }}
                accessibilityRole='button'
                accessibilityState={{ selected }}
                accessibilityLabel={residenceLabel(opt)}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: 999,
                  backgroundColor: selected ? colors.accent : 'transparent',
                  borderWidth: 1,
                  borderColor: selected ? colors.accent : colors.border,
                }}
              >
                <Text style={{ color: selected ? colors.bg : colors.text, fontWeight: '600' }}>
                  {residenceLabel(opt)}
                </Text>
              </Pressable>
            )
          })}
        </View>
        {residence !== 'apartment' ? (
          <Text style={{ color: colors.textMute, fontSize: 12, lineHeight: 18 }}>
            {t.new_site_residence_premium_note}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text
          style={{
            fontSize: 12,
            color: colors.textMute,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {t.new_site_building_year_accuracy}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {ACCURACY_OPTIONS.map((opt) => {
            const selected = opt === accuracy
            return (
              <Pressable
                key={opt}
                onPress={() => {
                  void haptic('selection')
                  setAccuracy(opt)
                }}
                accessibilityRole='button'
                accessibilityState={{ selected }}
                accessibilityLabel={accuracyLabel(opt)}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: 999,
                  backgroundColor: selected ? colors.accent : 'transparent',
                  borderWidth: 1,
                  borderColor: selected ? colors.accent : colors.border,
                }}
              >
                <Text style={{ color: selected ? colors.bg : colors.text, fontWeight: '600' }}>
                  {accuracyLabel(opt)}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {showBuildYearInput ? (
        <View style={{ gap: spacing.sm }}>
          <Text
            style={{
              fontSize: 12,
              color: colors.textMute,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {t.new_site_building_year_label}
          </Text>
          <TextInput
            value={buildYear}
            onChangeText={setBuildYear}
            placeholder={accuracy === 'decade' ? '1990' : 'e.g. 1998'}
            placeholderTextColor={colors.textMute}
            keyboardType='number-pad'
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              color: colors.text,
              fontSize: 16,
            }}
          />
        </View>
      ) : null}

      {showMoveInYearInput ? (
        <View style={{ gap: spacing.sm }}>
          <Text
            style={{
              fontSize: 12,
              color: colors.textMute,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {t.new_site_building_moveIn_label}
          </Text>
          <TextInput
            value={moveInYear}
            onChangeText={setMoveInYear}
            placeholder='2020'
            placeholderTextColor={colors.textMute}
            keyboardType='number-pad'
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              color: colors.text,
              fontSize: 16,
            }}
          />
        </View>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <Text
          style={{
            fontSize: 12,
            color: colors.textMute,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {t.new_site_building_floor_label}
        </Text>
        <TextInput
          value={floor}
          onChangeText={(v) => {
            setFloor(v)
            if (floorError) setFloorError(null)
          }}
          placeholder='4'
          placeholderTextColor={colors.textMute}
          keyboardType='number-pad'
          style={{
            borderWidth: 1,
            borderColor: floorError ? colors.warning : colors.border,
            borderRadius: 10,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            color: colors.text,
            fontSize: 16,
          }}
        />
        {residence === 'flat' ? (
          <Text style={{ color: colors.textMute, fontSize: 12, lineHeight: 18 }}>
            {t.new_site_building_floor_flat_hint}
          </Text>
        ) : null}
        {floorError ? (
          <Text style={{ color: colors.warning, fontSize: 13 }}>{floorError}</Text>
        ) : null}
      </View>

      <View style={{ flex: 1 }} />

      <Button variant='primary' size='lg' fullWidth onPress={next}>
        {t.new_site_building_next}
      </Button>
    </ScrollView>
  )
}
