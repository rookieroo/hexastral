import * as Haptics from 'expo-haptics'
import { useMemo } from 'react'
import { Text, View } from 'react-native'
import { DateWheelColumn, WHEEL_H } from '@/components/ui/DateWheelPicker'
import { SHICHEN } from '@/lib/constants/shichen'
import { formatShichenLabel } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { CTAButton, SkipLink } from './OnboardingChrome'
import { onboardingStyles as ob } from './styles'

export function BirthTimeStep({
  onNext,
  timeIndex,
  setTimeIndex,
}: {
  onNext: () => void
  timeIndex: number | null
  setTimeIndex: (i: number) => void
}) {
  const { t, locale } = useI18n()
  const { colors, isDark } = useTheme()

  const shichenIndices = useMemo(() => Array.from({ length: 12 }, (_, i) => i), [])

  return (
    <View style={[ob.stepWrap, { backgroundColor: colors.background }]}>
      <View style={ob.stepHeader}>
        <Text style={[ob.stepQuestion, { color: colors.text }]}>{t('ob_birthtime_q')}</Text>
        <Text style={[ob.stepHint, { color: colors.textSecondary }]}>{t('ob_birthtime_hint')}</Text>
      </View>

      {/* 时辰 wheel — centered single column */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View
          style={[
            ob.pickerBox,
            { borderColor: colors.border, width: 260, flex: 0, height: WHEEL_H },
          ]}
        >
          <DateWheelColumn
            data={shichenIndices}
            selectedIndex={timeIndex}
            onSelect={(idx) => {
              setTimeIndex(idx)
              Haptics.selectionAsync()
            }}
            formatLabel={(v) => {
              const s = SHICHEN[v]
              const label = formatShichenLabel(v, locale)
              return `${s?.sub ?? ''}  ${label}`
            }}
            textColor={colors.text}
            dimColor={colors.textSecondary}
            borderColor={colors.border}
          />
        </View>
      </View>

      <View style={ob.stepFooter}>
        <CTAButton
          label={t('ob_continue')}
          onPress={onNext}
          disabled={timeIndex === null}
          dark={isDark}
        />
        <SkipLink onPress={onNext} label={t('ob_time_unknown')} dark={isDark} />
      </View>
    </View>
  )
}

// ─── Step: GENDER ──────────────────────────────────────────────────────────────
