/**
 * LunarDatePicker — solar/lunar calendar date picker.
 *
 * Both modes now present a tappable "Date · value ›" row to keep the form
 * height stable when the user toggles Solar ↔ Lunar (the inline lunar
 * grids previously displaced every downstream field).
 *
 *   - Solar mode: tap row → inline RNDateTimePicker spinner (unchanged)
 *   - Lunar mode (zh / zh-Hant only): tap row → bottom-sheet Modal with
 *     year input + month grid + day grid + leap toggle + Done button
 *   - Solar / Lunar SegmentedControl shown above (zh / zh-Hant only)
 */

import RNDateTimePicker from '@react-native-community/datetimepicker'
import { ChevronDown } from 'lucide-react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Modal, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Switch } from '@/components/ui/Switch'
import { formatSolarDate, hasLeapMonth, lunarToSolar } from '@/lib/domain/lunarCalendar'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

interface LunarDatePickerProps {
  value: Date
  onChange: (date: Date) => void
}

function displayDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function LunarDatePicker({ value, onChange }: LunarDatePickerProps) {
  const { colors } = useTheme()
  const { t, locale } = useI18n()
  const isZh = locale === 'zh' || locale === 'zh-Hant'

  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const [showSolarPicker, setShowSolarPicker] = useState(false)
  const [showLunarSheet, setShowLunarSheet] = useState(false)

  const [calendarMode, setCalendarMode] = useState<'solar' | 'lunar'>('solar')
  const [lunarYear, setLunarYear] = useState(value.getFullYear())
  const [lunarYearText, setLunarYearText] = useState(String(value.getFullYear()))
  const [lunarMonth, setLunarMonth] = useState(1)
  const [lunarDay, setLunarDay] = useState(1)
  const [isLeapMonth, setIsLeapMonth] = useState(false)
  const lunarDirty = useRef(false)

  // Convert lunar → solar whenever user changes lunar fields
  useEffect(() => {
    if (calendarMode !== 'lunar' || !lunarDirty.current) return
    onChangeRef.current(lunarToSolar(lunarYear, lunarMonth, lunarDay, isLeapMonth))
  }, [calendarMode, lunarYear, lunarMonth, lunarDay, isLeapMonth])

  const setLunarMonthDirty = useCallback((m: number) => {
    lunarDirty.current = true
    setLunarMonth(m)
    setIsLeapMonth(false)
  }, [])
  const setLunarDayDirty = useCallback((d: number) => {
    lunarDirty.current = true
    setLunarDay(d)
  }, [])
  const setLeapMonthDirty = useCallback((v: boolean) => {
    lunarDirty.current = true
    setIsLeapMonth(v)
  }, [])

  const dateRow = (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        if (calendarMode === 'solar') {
          setShowSolarPicker((v) => !v)
        } else {
          setShowLunarSheet(true)
        }
      }}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '300', color: colors.textSecondary }}>
        {t('settings_birth_date')}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 14, fontWeight: '300', color: colors.text }}>
          {displayDate(value)}
        </Text>
        <ChevronDown size={12} color={colors.textSecondary} strokeWidth={1.5} />
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={{ gap: 10 }}>
      {/* Solar / Lunar mode toggle — zh only */}
      {isZh && (
        <SegmentedControl
          segments={[
            { key: 'solar', label: t('stellar_calendar_solar') },
            { key: 'lunar', label: t('stellar_calendar_lunar') },
          ]}
          selected={calendarMode}
          onChange={(mode) => {
            setCalendarMode(mode as 'solar' | 'lunar')
            setShowSolarPicker(false)
            setShowLunarSheet(false)
          }}
        />
      )}

      {dateRow}

      {/* Solar inline spinner */}
      {calendarMode === 'solar' && showSolarPicker && (
        <RNDateTimePicker
          value={value}
          mode='date'
          display='spinner'
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
          onChange={(_, date) => {
            if (date) {
              onChange(date)
              setShowSolarPicker(false)
            }
          }}
          style={{ height: 160 }}
        />
      )}

      {/* Lunar bottom-sheet modal — keeps form height stable */}
      <Modal
        visible={showLunarSheet}
        transparent
        animationType='slide'
        onRequestClose={() => setShowLunarSheet(false)}
      >
        <Pressable
          onPress={() => setShowLunarSheet(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.card,
              borderTopWidth: 0.5,
              borderColor: colors.border,
            }}
          >
            <SafeAreaView edges={['bottom']}>
              <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, gap: 12 }}>
                {/* Year */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, width: 38 }}>
                    {t('stellar_lunar_year')}
                  </Text>
                  <TextInput
                    style={{
                      flex: 1,
                      borderBottomWidth: 0.5,
                      borderBottomColor:
                        lunarYearText.length === 4 &&
                        (Number(lunarYearText) < 1900 || Number(lunarYearText) > 2100)
                          ? '#EF4444'
                          : colors.border,
                      color: colors.text,
                      fontSize: 16,
                      fontWeight: '300',
                      paddingVertical: 6,
                      paddingHorizontal: 4,
                    }}
                    value={lunarYearText}
                    onChangeText={(v) => {
                      const digits = v.replace(/\D/g, '')
                      setLunarYearText(digits)
                      const n = Number.parseInt(digits, 10)
                      if (!Number.isNaN(n) && n >= 1900 && n <= 2100) {
                        lunarDirty.current = true
                        setLunarYear(n)
                      }
                    }}
                    keyboardType='number-pad'
                    maxLength={4}
                  />
                </View>

                {/* Month grid */}
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                    {t('stellar_lunar_month_label')}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                      const sel = lunarMonth === m
                      return (
                        <Pressable
                          key={m}
                          onPress={() => setLunarMonthDirty(m)}
                          style={{
                            minWidth: 44,
                            height: 36,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: sel ? 1 : 0.5,
                            borderColor: sel ? colors.accent : colors.border,
                            backgroundColor: sel ? `${colors.accent}1F` : 'transparent',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: sel ? '500' : '300',
                              color: sel ? colors.accent : colors.text,
                            }}
                          >
                            {m}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </View>
                </View>

                {/* Day grid */}
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                    {t('stellar_lunar_day_label')}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => {
                      const sel = lunarDay === d
                      return (
                        <Pressable
                          key={d}
                          onPress={() => setLunarDayDirty(d)}
                          style={{
                            minWidth: 36,
                            height: 32,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: sel ? 1 : 0.5,
                            borderColor: sel ? colors.accent : colors.border,
                            backgroundColor: sel ? `${colors.accent}1F` : 'transparent',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: sel ? '500' : '300',
                              color: sel ? colors.accent : colors.text,
                            }}
                          >
                            {d}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </View>
                </View>

                {/* Leap month toggle — only when applicable */}
                {hasLeapMonth(lunarYear, lunarMonth) && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: colors.text }}>
                      {t('stellar_lunar_leap')}
                    </Text>
                    <Switch value={isLeapMonth} onValueChange={setLeapMonthDirty} />
                  </View>
                )}

                {/* Solar equivalent preview */}
                <Text style={{ fontSize: 11, color: colors.textSecondary, fontStyle: 'italic' }}>
                  {t('stellar_lunar_converted', { date: formatSolarDate(value) })}
                </Text>

                <TouchableOpacity
                  onPress={() => setShowLunarSheet(false)}
                  activeOpacity={0.8}
                  style={{
                    marginTop: 8,
                    paddingVertical: 14,
                    backgroundColor: colors.text,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: colors.background }}>
                    {t('common_done')}
                  </Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
