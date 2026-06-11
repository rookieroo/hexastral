/**
 * BirthClockField — precise HH:MM birth-time picker.
 *
 * Lives inside BirthTimeStep's precise-time disclosure. Mirrors
 * BirthDateField's DateTimePicker usage so behaviour matches the date field:
 *   - Android: tapping opens the system time dialog.
 *   - iOS: tapping opens the spinner in a transparent bottom sheet (no scrim).
 *
 * Value is minutes-since-midnight (0..1439) — locale-free at the data layer;
 * the native picker renders in the device's 12/24h convention, which also
 * forces AM/PM disambiguation (the single biggest precise-entry footgun).
 */

import DateTimePicker from '@react-native-community/datetimepicker'
import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { Modal, Platform, Pressable, Text, View } from 'react-native'
import { useTheme } from '../../theme'

export interface BirthClockFieldLabels {
  /** Shown when no time is picked yet, e.g. "选择确切时间". */
  placeholder: string
  /** Sheet confirm label (iOS), e.g. "完成". */
  done: string
}

const DEFAULT_MINUTES = 12 * 60 // noon — a neutral starting wheel position

function minutesToDate(min: number): Date {
  return new Date(2000, 0, 1, Math.floor(min / 60), min % 60, 0)
}

function formatHHMM(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function BirthClockField({
  value,
  onChange,
  accent,
  locale,
  labels,
}: {
  value: number | null
  onChange: (minutes: number) => void
  accent: string
  locale?: string
  labels: BirthClockFieldLabels
}) {
  const { colors, spacing, isDark } = useTheme()
  const pickerTheme: 'dark' | 'light' = isDark ? 'dark' : 'light'
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Date>(minutesToDate(value ?? DEFAULT_MINUTES))

  const commit = (d: Date) => onChange(d.getHours() * 60 + d.getMinutes())

  const openPicker = () => {
    void Haptics.selectionAsync().catch(() => undefined)
    setDraft(minutesToDate(value ?? DEFAULT_MINUTES))
    setOpen(true)
  }

  const androidPicker = open && Platform.OS === 'android'
  const iosSheet = open && Platform.OS === 'ios'

  return (
    <View>
      <Pressable
        onPress={openPicker}
        accessibilityRole='button'
        style={{
          borderWidth: 0.5,
          borderColor: colors.separator,
          borderRadius: 12,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
        }}
      >
        <Text
          style={{
            fontSize: 17,
            color: value != null ? colors.text : colors.dim,
            letterSpacing: value != null ? 1 : 0,
          }}
        >
          {value != null ? formatHHMM(value) : labels.placeholder}
        </Text>
      </Pressable>

      {/* Android — system time dialog handles its own chrome. */}
      {androidPicker ? (
        <DateTimePicker
          value={draft}
          mode='time'
          display='spinner'
          themeVariant={pickerTheme}
          onChange={(event, picked) => {
            setOpen(false)
            if (event.type === 'set' && picked) commit(picked)
          }}
        />
      ) : null}

      {/* iOS — spinner in a transparent bottom sheet (matches BirthDateField). */}
      {iosSheet ? (
        <Modal visible transparent animationType='slide' onRequestClose={() => setOpen(false)}>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setOpen(false)}
            accessibilityRole='button'
          />
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              borderTopWidth: 0.5,
              borderColor: colors.separator,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.sm,
              paddingBottom: spacing.xl,
              shadowColor: '#000',
              shadowOpacity: 0.22,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: -6 },
              elevation: 24,
            }}
          >
            <View
              style={{
                alignSelf: 'center',
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.separator,
                marginBottom: spacing.xs,
              }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Pressable
                onPress={() => {
                  commit(draft)
                  setOpen(false)
                }}
                hitSlop={12}
                accessibilityRole='button'
              >
                <Text
                  style={{
                    color: accent,
                    fontSize: 15,
                    fontWeight: '600',
                    paddingVertical: spacing.sm,
                  }}
                >
                  {labels.done}
                </Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={draft}
              mode='time'
              display='spinner'
              themeVariant={pickerTheme}
              onChange={(_, picked) => {
                if (picked) setDraft(picked)
              }}
              locale={locale}
              style={{ alignSelf: 'center' }}
            />
          </View>
        </Modal>
      ) : null}
    </View>
  )
}
