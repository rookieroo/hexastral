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
import {
  EARTHLY_BRANCHES,
  HEAVENLY_STEMS,
  LUNAR_DAY_NAMES,
  LUNAR_MONTH_NAMES,
  lunarToSolar,
  solarToLunar,
} from '@zhop/astro-core'
import * as Haptics from 'expo-haptics'
import { useCallback, useState } from 'react'
import { Modal, Platform, Pressable, Text, TextInput, View } from 'react-native'
import { useTheme } from '../../theme'
import { type LunarDateValue, LunarDateWheels } from './LunarDateWheels'
import { type SolarDateValue, SolarDateWheels } from './SolarDateWheels'

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
  /** Input placeholder. Defaults to 'YYYY-MM-DD'. */
  placeholder?: string
  /** Placeholder for the 农历 display field before a date is picked (lunar mode
   *  is tap-to-pick, not free-text). Defaults to the solar placeholder. */
  lunarPlaceholder?: string
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
  /**
   * Boxed, larger input instead of the thin underline. The underline variant
   * read as plain text on the kindred form ("不容易找到输入位置"); `prominent`
   * gives the entry an obvious bordered field + bigger type so it's clearly the
   * place to type. Defaults to false (the underline) for hosts that want the
   * quieter inline look.
   */
  prominent?: boolean
  /**
   * Hide the built-in 公历/农历 segmented control. The host then owns the
   * calendar switch (e.g. a compact 农历 toggle beside the field's section
   * title) and flips `value.calendar` via `onChange` itself — keeps the form
   * from reading as "好多 select/button" when solar is the default. The lunar
   * hint + picker behaviour are unchanged. Defaults to false.
   */
  hideCalendarToggle?: boolean
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

/** 农历 input ("YYYY-MM-DD" holding 农历 Y/M/D) → display label. CJK shows the full
 *  干支年 + 农历月日 (壬申年 正月初六) so the field never reads as a 公历 date; en falls
 *  back to numeric "Lunar Y/M/D" (the 农历 glyphs are opaque to a non-CJK reader). */
function formatLunarDisplay(input: string, isLeap: boolean, locale?: string): string | null {
  if (!DATE_RE.test(input)) return null
  const [y, m, d] = input.split('-').map(Number)
  if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 30) return null
  if (locale === 'en') return `Lunar ${y}/${m}/${d}`
  const stem = HEAVENLY_STEMS[(((y - 4) % 10) + 10) % 10] ?? ''
  const branch = EARTHLY_BRANCHES[(((y - 4) % 12) + 12) % 12] ?? ''
  const mon = `${isLeap ? '闰' : ''}${LUNAR_MONTH_NAMES[m - 1] ?? `${m}月`}`
  const dayName = LUNAR_DAY_NAMES[d - 1] ?? `${d}`
  return `${stem}${branch}年 ${mon}${dayName}`
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

export function BirthDateField({
  value,
  onChange,
  accent,
  labels,
  locale,
  prominent = false,
  hideCalendarToggle = false,
}: BirthDateFieldProps) {
  const { colors, spacing, isDark } = useTheme()
  // Pin the native iOS DateTimePicker to the CoreUI theme — otherwise the
  // spinner follows the device system theme and renders light even when the
  // host app (kindred) forces dark, so the wheel text is washed out against
  // the kindred dark sheet ("滚轮选择器在 light 模式下看不清").
  const pickerTheme: 'dark' | 'light' = isDark ? 'dark' : 'light'
  const { input, calendar } = value
  const isLeap = value.isLeap ?? false
  // In 农历 mode the field is tap-to-pick and shows the date AS 农历 (壬申年 正月初六).
  const lunarLabel = calendar === 'lunar' ? formatLunarDisplay(input, isLeap, locale) : null
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
    // Clear on switch — the same digits are a DIFFERENT day in each calendar, so
    // reinterpreting them silently mis-reads the date. User re-picks once (2026-06).
    emit('', next, false)
  }

  // ── Picker sheet state (seeded from the current input on open) ───────────
  const [pickSolar, setPickSolar] = useState<Date>(defaultSolarSeed)
  const [pickSolarYMD, setPickSolarYMD] = useState<SolarDateValue>(() => {
    const d = defaultSolarSeed()
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }
  })
  const [pickLunar, setPickLunar] = useState<LunarDateValue>(defaultLunarSeed)

  const openPicker = () => {
    void Haptics.selectionAsync().catch(() => undefined)
    // Seed from what's currently typed (or sensible defaults) — done here, not
    // in render, so typing never pays for conversions it doesn't need.
    const seed = solarSeedFrom(input, calendar)
    setPickSolar(seed)
    setPickSolarYMD({ year: seed.getFullYear(), month: seed.getMonth() + 1, day: seed.getDate() })
    setPickLunar(lunarSeedFrom(input, calendar, isLeap))
    setPickerOpen(true)
  }

  const confirmPicker = () => {
    setPickerOpen(false)
    if (calendar === 'solar') {
      // Android reads the custom wheels (pickSolarYMD); iOS reads the native
      // spinner's Date (pickSolar).
      const solarDate =
        Platform.OS === 'android'
          ? new Date(pickSolarYMD.year, pickSolarYMD.month - 1, pickSolarYMD.day)
          : pickSolar
      emit(formatSolar(solarDate), 'solar', false)
    } else {
      const padded = `${pickLunar.year}-${String(pickLunar.month).padStart(2, '0')}-${String(pickLunar.day).padStart(2, '0')}`
      emit(padded, 'lunar', pickLunar.isLeap)
    }
  }

  // Every picker now renders in the shared bottom sheet — solar on Android uses
  // the custom SolarDateWheels (matches 农历); iOS keeps its native spinner.
  const sheetPicker = pickerOpen

  return (
    <View style={{ gap: spacing.sm }}>
      {/* Calendar toggle — 公历 / 农历. Hidden when the host owns the switch
          (hideCalendarToggle) so solar can be the quiet default. */}
      {hideCalendarToggle ? null : (
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
      )}

      {/* The input row — compact text entry + wheel affordance. `prominent`
          boxes it (border + larger type) so it's unmistakably an input. */}
      <View
        style={
          prominent
            ? {
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 0.5,
                borderColor: colors.separator,
                borderRadius: 10,
                paddingHorizontal: spacing.md,
              }
            : {
                flexDirection: 'row',
                alignItems: 'center',
                borderBottomWidth: 0.5,
                borderBottomColor: colors.separator,
              }
        }
      >
        {calendar === 'solar' ? (
          <TextInput
            value={input}
            onChangeText={handleType}
            placeholder={labels.placeholder ?? 'YYYY-MM-DD'}
            placeholderTextColor={colors.dim}
            keyboardType='numeric'
            maxLength={10}
            style={{
              flex: 1,
              fontSize: prominent ? 19 : 16,
              letterSpacing: prominent ? 1 : 0,
              color: colors.text,
              // `padding: 0` first kills Android's default TextInput inset; the
              // explicit paddingVertical then sets the row height.
              padding: 0,
              paddingVertical: prominent ? spacing.md : spacing.sm,
            }}
          />
        ) : (
          // 农历 is tap-to-pick (typing 农历 on a numeric keypad is meaningless, and
          // an ISO string here read as a 公历 date). Show the picked date AS 农历.
          <Pressable
            onPress={openPicker}
            accessibilityRole='button'
            accessibilityLabel={labels.openPicker ?? labels.pickerDone}
            style={{ flex: 1, paddingVertical: prominent ? spacing.md : spacing.sm }}
          >
            <Text
              style={{
                fontSize: prominent ? 19 : 16,
                letterSpacing: prominent ? 1 : 0,
                color: lunarLabel ? colors.text : colors.dim,
              }}
            >
              {lunarLabel ?? labels.lunarPlaceholder ?? labels.placeholder ?? 'YYYY-MM-DD'}
            </Text>
          </Pressable>
        )}
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

      {/* Solar (iOS native spinner / Android custom wheels) + all-platform lunar
          wheels — one shared bottom sheet. statusBar/navigationBarTranslucent make
          the Modal edge-to-edge so the sheet reaches the true screen bottom on
          Android (no dimmed gap strip under the gesture bar, 2026-06 feedback). */}
      <Modal
        visible={sheetPicker}
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        animationType='slide'
        onRequestClose={() => setPickerOpen(false)}
      >
        {/* Transparent backdrop — the half-screen above the sheet stays visible
            (no grey scrim, light or dark, 2026-06 feedback); still tap-to-dismiss.
            The sheet separates via its own shadow + grab handle. */}
        <Pressable
          style={{ flex: 1 }}
          onPress={() => setPickerOpen(false)}
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
          {/* Grab handle — native-sheet affordance + separation without dimming. */}
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
            Platform.OS === 'android' ? (
              <SolarDateWheels
                year={pickSolarYMD.year}
                month={pickSolarYMD.month}
                day={pickSolarYMD.day}
                accent={accent}
                minYear={MIN_DATE.getFullYear()}
                maxYear={MAX_DATE.getFullYear()}
                onChange={setPickSolarYMD}
              />
            ) : (
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
            )
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
      placeholder: 'YYYY-MM-DD',
      lunarPlaceholder: '選擇農曆日期',
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
      placeholder: 'YYYY-MM-DD',
      lunarPlaceholder: '选择农历日期',
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
      placeholder: 'YYYY-MM-DD',
      lunarPlaceholder: '旧暦の日付を選ぶ',
      openPicker: 'ピッカーを開く',
    }
  }
  return {
    solar: 'Solar',
    lunar: 'Lunar',
    pickerDone: 'Done',
    lunarHint: 'Enter a Chinese (lunar) calendar date — we convert it for the chart.',
    leapLabel: 'leap',
    placeholder: 'YYYY-MM-DD',
    lunarPlaceholder: 'Pick a lunar date',
    openPicker: 'Open picker',
  }
}
