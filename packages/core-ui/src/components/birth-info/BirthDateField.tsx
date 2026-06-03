/**
 * BirthDateField — the HexAstral standard inline date entry (kindred + auspice).
 *
 * One input habit for both calendars (per 2026-06 form-standards feedback):
 *   • A compact auto-formatted TEXT INPUT (`YYYY-MM-DD`) is the primary entry —
 *     it occupies one line, works identically for 公历 and 农历, and never
 *     hijacks the screen the way an inline calendar does.
 *   • A small wheel affordance beside the input summons a picker for people who
 *     prefer wheels: the SYSTEM cascading spinner (`DateTimePicker
 *     display='spinner'`) for solar, and the shared `LunarDateWheels` for 农历 —
 *     so the lunar picker keeps the exact same interaction habit as solar.
 *     Confirming writes back into the same text input.
 *   • A solar/lunar segmented toggle sits above the input. The canonical
 *     (solar) date is recomputed on every change and reported via `onChange`.
 *
 * Leap-month (闰月) note: typing can't express a leap month; picking one from
 * the lunar wheels sets `isLeap` and the field shows the leap hint. Typing
 * afterwards clears the flag (the typed date wins).
 */

import DateTimePicker from '@react-native-community/datetimepicker'
import { lunarToSolar, solarToLunar } from '@zhop/astro-core'
import * as Haptics from 'expo-haptics'
import { useCallback, useState } from 'react'
import { Modal, Platform, Pressable, Text, TextInput, View } from 'react-native'
import { useTheme } from '../../theme'
import { type LunarDateValue, LunarDateWheels } from './LunarDateWheels'

export type BirthCalendar = 'solar' | 'lunar'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MIN_DATE = new Date(1900, 0, 1)
const MAX_DATE = new Date()

export interface BirthDateFieldValue {
  /** What's shown in the input — `YYYY-MM-DD` in the chosen calendar. */
  input: string
  calendar: BirthCalendar
  /** 闰月 flag — only settable from the lunar wheels. */
  isLeap: boolean
  /** Canonical solar `YYYY-MM-DD`, or null while incomplete / invalid. */
  solarDate: string | null
}

export interface BirthDateFieldLabels {
  /** Calendar toggle labels. */
  solar: string
  lunar: string
  /** Picker sheet confirm CTA (e.g. "完成" / "Done"). */
  pickerDone: string
  /** Hint under the input while in lunar mode. */
  lunarHint?: string
  /** Suffix shown when a leap month was picked from the wheels (e.g. "闰月"). */
  leapLabel?: string
  /** Input placeholder. Defaults to '1995-08-12'. */
  placeholder?: string
  /** a11y label for the open-picker affordance. */
  openPicker?: string
}

export interface BirthDateFieldProps {
  value: { input: string; calendar: BirthCalendar; isLeap?: boolean }
  onChange: (next: BirthDateFieldValue) => void
  /** Brand accent for the toggle / picker chrome. */
  accent: string
  labels: BirthDateFieldLabels
  /** Forwarded to the native DateTimePicker (e.g. 'zh-CN'). */
  locale?: string
}

/** Auto-insert dashes → YYYY-MM-DD; strips non-digits, caps at 8 digits. */
export function formatBirthDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 4) return digits
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
}

/** Convert a typed/picked date in `calendar` to canonical solar, or null. */
export function birthInputToSolar(
  input: string,
  calendar: BirthCalendar,
  isLeap = false
): string | null {
  if (!DATE_RE.test(input)) return null
  if (calendar === 'solar') {
    // Reject impossible solar dates (e.g. 2024-02-31) via Date round-trip.
    const [y, m, d] = input.split('-').map(Number)
    if (!y || !m || !d || y < 1900) return null
    const dt = new Date(y, m - 1, d)
    if (dt.getMonth() !== m - 1 || dt.getDate() !== d) return null
    return input
  }
  const [y, m, d] = input.split('-').map(Number)
  if (!y || !m || !d || y < 1900 || y > 2100) return null
  if (m < 1 || m > 12 || d < 1 || d > 30) return null
  try {
    const sd = lunarToSolar(y, m, d, isLeap)
    return formatSolar(sd)
  } catch {
    return null
  }
}

function formatSolar(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function parseInput(input: string): { y: number; m: number; d: number } | null {
  if (!DATE_RE.test(input)) return null
  const [y, m, d] = input.split('-').map(Number)
  if (!y || !m || !d) return null
  return { y, m, d }
}

/* ── Picker seeds — pure helpers, only run when the picker sheet opens ────── */

function defaultSolarSeed(): Date {
  const now = new Date()
  return new Date(now.getFullYear() - 25, 5, 15)
}

function defaultLunarSeed(): LunarDateValue {
  try {
    const l = solarToLunar(new Date().getFullYear() - 25, 6, 15)
    return { year: l.year, month: l.month, day: l.day, isLeap: l.isLeap }
  } catch {
    return { year: 1995, month: 6, day: 15, isLeap: false }
  }
}

function solarSeedFrom(input: string, calendar: BirthCalendar): Date {
  const p = calendar === 'solar' ? parseInput(input) : null
  if (p) {
    const d = new Date(p.y, p.m - 1, p.d)
    if (d >= MIN_DATE && d <= MAX_DATE) return d
  }
  return defaultSolarSeed()
}

function lunarSeedFrom(input: string, calendar: BirthCalendar, isLeap: boolean): LunarDateValue {
  const p = calendar === 'lunar' ? parseInput(input) : null
  if (p && p.y >= 1901 && p.y <= 2099 && p.m >= 1 && p.m <= 12 && p.d >= 1 && p.d <= 30) {
    return { year: p.y, month: p.m, day: p.d, isLeap }
  }
  return defaultLunarSeed()
}

export function BirthDateField({ value, onChange, accent, labels, locale }: BirthDateFieldProps) {
  const { colors, spacing, isDark } = useTheme()
  // Pin the native iOS DateTimePicker to the CoreUI theme — otherwise the
  // spinner follows the device system theme and renders light even when the
  // host app (kindred) forces dark, so the wheel text is washed out against
  // the kindred dark sheet ("滚轮选择器在 light 模式下看不清").
  const pickerTheme: 'dark' | 'light' = isDark ? 'dark' : 'light'
  const { input, calendar } = value
  const isLeap = value.isLeap ?? false
  const [pickerOpen, setPickerOpen] = useState(false)

  // ── Commit helpers — every change reports the full derived value up ──────
  const emit = useCallback(
    (nextInput: string, nextCalendar: BirthCalendar, nextLeap: boolean) => {
      onChange({
        input: nextInput,
        calendar: nextCalendar,
        isLeap: nextLeap,
        solarDate: birthInputToSolar(nextInput, nextCalendar, nextLeap),
      })
    },
    [onChange]
  )

  const handleType = (raw: string) => {
    // Typing wins over a previously wheel-picked leap month.
    emit(formatBirthDateInput(raw), calendar, false)
  }

  const handleCalendar = (next: BirthCalendar) => {
    if (next === calendar) return
    void Haptics.selectionAsync().catch(() => undefined)
    emit(input, next, false)
  }

  // ── Picker sheet state (seeded from the current input on open) ───────────
  const [pickSolar, setPickSolar] = useState<Date>(defaultSolarSeed)
  const [pickLunar, setPickLunar] = useState<LunarDateValue>(defaultLunarSeed)

  const openPicker = () => {
    void Haptics.selectionAsync().catch(() => undefined)
    // Seed from what's currently typed (or sensible defaults) — done here, not
    // in render, so typing never pays for conversions it doesn't need.
    setPickSolar(solarSeedFrom(input, calendar))
    setPickLunar(lunarSeedFrom(input, calendar, isLeap))
    setPickerOpen(true)
  }

  const confirmPicker = () => {
    setPickerOpen(false)
    if (calendar === 'solar') {
      emit(formatSolar(pickSolar), 'solar', false)
    } else {
      const padded = `${pickLunar.year}-${String(pickLunar.month).padStart(2, '0')}-${String(pickLunar.day).padStart(2, '0')}`
      emit(padded, 'lunar', pickLunar.isLeap)
    }
  }

  // Android's solar picker is its own system dialog — no surrounding sheet.
  const androidSolarPicker = pickerOpen && calendar === 'solar' && Platform.OS === 'android'
  const sheetPicker = pickerOpen && !androidSolarPicker

  return (
    <View style={{ gap: spacing.sm }}>
      {/* Calendar toggle — 公历 / 农历 */}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {(
          [
            ['solar', labels.solar],
            ['lunar', labels.lunar],
          ] as const
        ).map(([key, label]) => {
          const selected = calendar === key
          return (
            <Pressable
              key={key}
              onPress={() => handleCalendar(key)}
              accessibilityRole='button'
              accessibilityState={{ selected }}
              style={{
                flex: 1,
                paddingVertical: spacing.sm,
                borderRadius: 10,
                borderWidth: 0.5,
                borderColor: selected ? accent : colors.separator,
                backgroundColor: selected ? `${accent}1F` : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: selected ? accent : colors.text,
                  fontSize: 14,
                  fontWeight: selected ? '600' : '400',
                }}
              >
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* The input row — compact text entry + wheel affordance */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 0.5,
          borderBottomColor: colors.separator,
        }}
      >
        <TextInput
          value={input}
          onChangeText={handleType}
          placeholder={labels.placeholder ?? '1995-08-12'}
          placeholderTextColor={colors.dim}
          keyboardType='numeric'
          maxLength={10}
          style={{
            flex: 1,
            fontSize: 16,
            color: colors.text,
            paddingVertical: spacing.sm,
            padding: 0,
          }}
        />
        {calendar === 'lunar' && isLeap && labels.leapLabel ? (
          <Text style={{ color: accent, fontSize: 12, marginRight: spacing.sm }}>
            {labels.leapLabel}
          </Text>
        ) : null}
        {/* Wheel affordance — summons the system spinner (solar) / lunar wheels */}
        <Pressable
          onPress={openPicker}
          hitSlop={10}
          accessibilityRole='button'
          accessibilityLabel={labels.openPicker ?? labels.pickerDone}
          style={{ paddingVertical: spacing.sm, paddingLeft: spacing.sm }}
        >
          <WheelGlyph color={colors.secondary} />
        </Pressable>
      </View>

      {calendar === 'lunar' && labels.lunarHint ? (
        <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 18 }}>{labels.lunarHint}</Text>
      ) : null}

      {/* Android solar — the system date dialog handles its own chrome. */}
      {androidSolarPicker ? (
        <DateTimePicker
          value={pickSolar}
          mode='date'
          display='spinner'
          minimumDate={MIN_DATE}
          maximumDate={MAX_DATE}
          themeVariant={pickerTheme}
          onChange={(event, picked) => {
            setPickerOpen(false)
            if (event.type === 'set' && picked) emit(formatSolar(picked), 'solar', false)
          }}
        />
      ) : null}

      {/* iOS solar spinner + all-platform lunar wheels — bottom sheet. */}
      <Modal
        visible={sheetPicker}
        transparent
        animationType='slide'
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: colors.scrim }}
          onPress={() => setPickerOpen(false)}
          accessibilityRole='button'
        />
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: spacing.xl,
          }}
        >
          {/* Sheet header — confirm on the right */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Pressable onPress={confirmPicker} hitSlop={12} accessibilityRole='button'>
              <Text
                style={{
                  color: accent,
                  fontSize: 15,
                  fontWeight: '600',
                  paddingVertical: spacing.sm,
                }}
              >
                {labels.pickerDone}
              </Text>
            </Pressable>
          </View>
          {calendar === 'solar' ? (
            <DateTimePicker
              value={pickSolar}
              mode='date'
              display='spinner'
              minimumDate={MIN_DATE}
              maximumDate={MAX_DATE}
              themeVariant={pickerTheme}
              onChange={(_, picked) => {
                if (picked) setPickSolar(picked)
              }}
              locale={locale}
              style={{ alignSelf: 'center' }}
            />
          ) : (
            <LunarDateWheels
              year={pickLunar.year}
              month={pickLunar.month}
              day={pickLunar.day}
              isLeap={pickLunar.isLeap}
              accent={accent}
              onChange={setPickLunar}
            />
          )}
        </View>
      </Modal>
    </View>
  )
}

/** Tiny 3-row "wheel" glyph — the open-picker affordance (no icon dep). */
function WheelGlyph({ color }: { color: string }) {
  const edge = { width: 14, height: 1.5, borderRadius: 1, backgroundColor: color, opacity: 0.5 }
  return (
    <View style={{ gap: 2.5, alignItems: 'center' }}>
      <View style={edge} />
      <View style={{ width: 18, height: 2, borderRadius: 1, backgroundColor: color }} />
      <View style={edge} />
    </View>
  )
}

/** Per-locale default labels — apps can override any field. */
export function birthDateFieldLabelsForLocale(locale: string): BirthDateFieldLabels {
  if (locale.startsWith('zh-Hant') || locale === 'zh-TW' || locale === 'zh-HK') {
    return {
      solar: '陽曆',
      lunar: '農曆',
      pickerDone: '完成',
      lunarHint: '輸入農曆日期，我們會自動換算為陽曆排盤。',
      leapLabel: '閏月',
      placeholder: '1995-08-12',
      openPicker: '開啟選擇器',
    }
  }
  if (locale.startsWith('zh')) {
    return {
      solar: '阳历',
      lunar: '农历',
      pickerDone: '完成',
      lunarHint: '输入农历日期，我们会自动换算为阳历排盘。',
      leapLabel: '闰月',
      placeholder: '1995-08-12',
      openPicker: '打开选择器',
    }
  }
  if (locale.startsWith('ja')) {
    return {
      solar: '新暦',
      lunar: '旧暦',
      pickerDone: '完了',
      lunarHint: '旧暦の日付を入力すると、自動的に新暦へ換算します。',
      leapLabel: '閏月',
      placeholder: '1995-08-12',
      openPicker: 'ピッカーを開く',
    }
  }
  return {
    solar: 'Solar',
    lunar: 'Lunar',
    pickerDone: 'Done',
    lunarHint: 'Enter a Chinese (lunar) calendar date — we convert it for the chart.',
    leapLabel: 'leap',
    placeholder: '1995-08-12',
    openPicker: 'Open picker',
  }
}
