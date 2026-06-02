import * as Haptics from 'expo-haptics'
import { Text, TouchableOpacity, View } from 'react-native'
import type { TranslationKeys } from '@/lib/i18n'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { CTAButton } from './OnboardingChrome'
import { onboardingStyles as ob } from './styles'

export function GenderStep({
  onNext,
  gender,
  setGender,
}: {
  onNext: () => void
  gender: '男' | '女' | null
  setGender: (g: '男' | '女') => void
}) {
  const { t } = useI18n()
  const { colors, isDark } = useTheme()

  const opts: Array<{
    value: '男' | '女'
    labelKey: TranslationKeys
    trigram: string
  }> = [
    { value: '男', labelKey: 'ob_gender_male', trigram: '☰' },
    { value: '女', labelKey: 'ob_gender_female', trigram: '☷' },
  ]

  return (
    <View style={[ob.stepWrap, { backgroundColor: colors.background }]}>
      <View style={ob.stepHeader}>
        <Text style={[ob.stepQuestion, { color: colors.text }]}>{t('ob_gender_q')}</Text>
        <Text style={[ob.stepHint, { color: colors.textSecondary }]}>{t('ob_gender_hint')}</Text>
      </View>

      <View style={ob.genderList}>
        {opts.map(({ value, labelKey, trigram }) => {
          const sel = gender === value
          return (
            <TouchableOpacity
              key={value}
              onPress={() => {
                setGender(value)
                Haptics.selectionAsync()
              }}
              activeOpacity={0.7}
              style={[
                ob.genderCard,
                { borderColor: sel ? colors.primary : colors.border },
                sel && { backgroundColor: `${colors.primary}10` },
              ]}
            >
              {/* Trigram symbol: ☰ Qian (male) / ☷ Kun (female) */}
              <Text
                style={{
                  fontSize: 36,
                  color: sel ? colors.primary : colors.textSecondary,
                  marginBottom: 8,
                  lineHeight: 44,
                }}
              >
                {trigram}
              </Text>
              <Text style={[ob.genderLabel, { color: sel ? colors.text : colors.textSecondary }]}>
                {t(labelKey)}
              </Text>
              <View
                style={[
                  ob.genderRadio,
                  { borderColor: sel ? colors.primary : colors.border },
                  sel && { backgroundColor: colors.primary },
                ]}
              />
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={ob.stepFooter}>
        <CTAButton
          label={t('ob_continue')}
          onPress={onNext}
          disabled={gender === null}
          dark={isDark}
        />
      </View>
    </View>
  )
}

// ─── Step: NAME ───────────────────────────────────────────────────────────────
