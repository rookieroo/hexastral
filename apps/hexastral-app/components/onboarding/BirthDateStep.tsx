import RNDateTimePicker from '@react-native-community/datetimepicker'
import { solarToLunar } from '@zhop/astro-core/lunar'
import { useMemo } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'
import { AndroidDatePicker } from '@/components/ui/DateWheelPicker'
import type { TranslationKeys } from '@/lib/i18n'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { getLocalizedLunarText } from './lunar'
import { CTAButton } from './OnboardingChrome'
import { onboardingStyles as ob } from './styles'

export function BirthDateStep({
  onNext,
  birthDate,
  setBirthDate,
  showLunar,
  setShowLunar,
}: {
  onNext: () => void
  birthDate: Date
  setBirthDate: (d: Date) => void
  showLunar: boolean
  setShowLunar: (v: boolean) => void
}) {
  const { t, locale } = useI18n()
  const { colors, isDark } = useTheme()

  // CJK locales use Year/Month/Day order; western locales use Month/Day/Year
  const columnOrder =
    locale.startsWith('zh') || locale.startsWith('ja') || locale.startsWith('ko')
      ? ('ymd' as const)
      : ('mdy' as const)

  const lunarAnnotation = useMemo(() => {
    try {
      const ld = solarToLunar(
        birthDate.getFullYear(),
        birthDate.getMonth() + 1,
        birthDate.getDate()
      )
      return getLocalizedLunarText(ld, t)
    } catch {
      return null
    }
  }, [birthDate, t])

  return (
    <View style={[ob.stepWrap, { backgroundColor: colors.background }]}>
      <View style={ob.stepHeader}>
        <Text style={[ob.stepQuestion, { color: colors.text }]}>{t('ob_birthdate_q')}</Text>
        <Text style={[ob.stepHint, { color: colors.textSecondary }]}>{t('ob_birthdate_hint')}</Text>
      </View>

      {/* Solar / Lunar text-tab toggle */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 32,
          paddingBottom: showLunar && lunarAnnotation ? 2 : 12,
          gap: 20,
        }}
      >
        {(['solar', 'lunar'] as const).map((mode) => {
          const active = (showLunar ? 'lunar' : 'solar') === mode
          return (
            <Pressable
              key={mode}
              onPress={() => setShowLunar(mode === 'lunar')}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.4 : 1 })}
            >
              <Text
                style={{
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  fontWeight: active ? '500' : '300',
                  color: active ? colors.text : colors.textSecondary,
                }}
              >
                {mode === 'solar'
                  ? t('settings_birth_calendar_solar' as TranslationKeys)
                  : t('settings_birth_calendar_lunar' as TranslationKeys)}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Lunar annotation — only shown when lunar mode is active */}
      {showLunar && lunarAnnotation ? (
        <View style={{ paddingHorizontal: 32, paddingBottom: 10 }}>
          <Text style={{ fontSize: 11, letterSpacing: 0.2, color: colors.textSecondary }}>
            {lunarAnnotation}
          </Text>
        </View>
      ) : null}

      <View style={[ob.pickerBox, { borderColor: colors.border }]}>
        {Platform.OS === 'android' ? (
          <AndroidDatePicker
            value={birthDate}
            onChange={setBirthDate}
            minimumDate={new Date('1900-01-01')}
            maximumDate={new Date()}
            textColor={colors.text}
            dimColor={colors.textSecondary}
            borderColor={colors.border}
            columnOrder={columnOrder}
          />
        ) : (
          <RNDateTimePicker
            value={birthDate}
            mode='date'
            display='spinner'
            onChange={(_, date) => date && setBirthDate(date)}
            maximumDate={new Date()}
            minimumDate={new Date('1900-01-01')}
            textColor={colors.text}
            style={{ flex: 1 }}
          />
        )}
      </View>

      <View style={[ob.stepFooter, { paddingTop: 24 }]}>
        <CTAButton label={t('ob_continue')} onPress={onNext} dark={isDark} />
      </View>
    </View>
  )
}

// ─── Step: BIRTHTIME ─────────────────────────────────────────────────────────
