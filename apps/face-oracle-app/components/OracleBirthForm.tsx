/**
 * Compact birth Form for FaceOracle funnel — same field contract as Yuel/Yuun
 * (solar date, 时辰, gender; optional city).
 */

import {
  BirthDateField,
  type BirthDateFieldValue,
  ShichenField,
  type ShichenIndex,
  shichenFieldLabelsForLocale,
  useTheme,
} from '@zhop/core-ui'
import { Pressable, Text, TextInput, View } from 'react-native'

export interface OracleBirthValue {
  date: BirthDateFieldValue
  timeIndex: number | null
  gender: '男' | '女' | null
  city: string
}

interface Props {
  locale: string
  value: OracleBirthValue
  onChange: (next: OracleBirthValue) => void
}

export function OracleBirthForm({ locale, value, onChange }: Props) {
  const { colors, spacing } = useTheme()
  const zh = locale.startsWith('zh')
  const dateLabels = {
    solar: zh ? '阳历' : 'Solar',
    lunar: zh ? '农历' : 'Lunar',
    pickerDone: zh ? '完成' : 'Done',
    placeholder: zh ? '选择出生日期' : 'Birth date',
  }

  return (
    <View style={{ gap: spacing.md }}>
      <BirthDateField
        value={value.date}
        onChange={(date) => onChange({ ...value, date })}
        accent={colors.accent}
        labels={dateLabels}
        locale={locale.startsWith('zh') ? 'zh-CN' : 'en-US'}
        prominent
      />
      <ShichenField
        value={value.timeIndex as ShichenIndex | null}
        onChange={(timeIndex) => onChange({ ...value, timeIndex })}
        accent={colors.accent}
        labels={shichenFieldLabelsForLocale(locale)}
        locale={locale}
      />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {(['男', '女'] as const).map((g) => {
          const active = value.gender === g
          return (
            <Pressable
              key={g}
              onPress={() => onChange({ ...value, gender: g })}
              style={{
                flex: 1,
                borderWidth: 0.5,
                borderColor: colors.separator,
                borderRadius: 0,
                paddingVertical: 12,
                alignItems: 'center',
                backgroundColor: active ? colors.card : 'transparent',
              }}
            >
              <Text style={{ color: colors.text }}>
                {g === '男' ? (zh ? '男' : 'Male') : zh ? '女' : 'Female'}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        value={value.city}
        onChangeText={(city) => onChange({ ...value, city })}
        placeholder={zh ? '出生城市（可选）' : 'Birth city (optional)'}
        placeholderTextColor={colors.secondary}
        style={{
          borderWidth: 0.5,
          borderColor: colors.separator,
          borderRadius: 0,
          padding: 12,
          color: colors.text,
        }}
      />
    </View>
  )
}
