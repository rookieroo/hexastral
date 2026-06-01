/**
 * Compute screen — single form: full name + birth date.
 *
 * Submits to `/api/numerology/compute` then routes to /result with the
 * reading payload encoded as URL params (for state survival across the sheet
 * presentation; small enough to fit in a query string).
 */

import DateTimePicker from '@react-native-community/datetimepicker'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { computeNumerology, type NumerologyReading } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { useAppTheme } from '@/lib/theme'

function dateToIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ComputeScreen() {
  const router = useRouter()
  const { t } = useI18n()
  const { colors, isDark } = useAppTheme()
  const [name, setName] = useState('')
  const [birth, setBirth] = useState<Date>(new Date(1990, 0, 1))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const ready = name.trim().length >= 1

  const handleSubmit = async () => {
    if (!ready || busy) return
    Haptics.selectionAsync()
    setBusy(true)
    setErr(null)
    try {
      const resp = await computeNumerology({
        fullName: name.trim(),
        birthDate: dateToIso(birth),
      })
      const r: NumerologyReading = resp.reading
      router.replace({
        pathname: '/result',
        params: {
          payload: JSON.stringify(r),
        },
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('computeError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 24,
        }}
        keyboardShouldPersistTaps='handled'
      >
        <Text
          style={{
            color: colors.text,
            fontSize: 22,
            fontWeight: '500',
            letterSpacing: 0.4,
          }}
        >
          {t('computeTitle')}
        </Text>

        <View style={{ height: 24 }} />

        <Text
          style={{
            color: colors.secondary,
            fontSize: 11,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          {t('computeNameLabel')}
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('computeNamePlaceholder')}
          placeholderTextColor={colors.secondary}
          autoCapitalize='words'
          style={{
            fontSize: 18,
            color: colors.text,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.separator,
            paddingVertical: 12,
          }}
          returnKeyType='next'
        />
        <Text style={{ color: colors.secondary, fontSize: 11, marginTop: 6 }}>
          {t('computeNameHelper')}
        </Text>

        <View style={{ height: 28 }} />

        <Text
          style={{
            color: colors.secondary,
            fontSize: 11,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          {t('computeBirthLabel')}
        </Text>
        <DateTimePicker
          value={birth}
          mode='date'
          display='inline'
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
          onChange={(_, selected) => {
            if (selected) setBirth(selected)
          }}
          textColor={colors.text}
          accentColor={colors.text}
          themeVariant={isDark ? 'dark' : 'light'}
        />

        {err ? (
          <Text style={{ color: colors.secondary, fontSize: 13, marginTop: 12 }}>{err}</Text>
        ) : null}

        <View style={{ flex: 1, minHeight: 24 }} />

        <Pressable
          onPress={handleSubmit}
          disabled={!ready || busy}
          style={{
            marginTop: 16,
            paddingVertical: 16,
            alignItems: 'center',
            backgroundColor: colors.text,
            opacity: !ready || busy ? 0.4 : 1,
          }}
        >
          <Text
            style={{
              color: colors.bg,
              fontSize: 14,
              fontWeight: '500',
              letterSpacing: 1.6,
              textTransform: 'uppercase',
            }}
          >
            {busy ? t('computeBusy') : t('computeSubmit')}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
