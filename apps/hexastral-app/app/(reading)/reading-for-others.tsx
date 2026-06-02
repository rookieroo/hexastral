/**
 * 替他人生成命盘 (Reading for Others Form)
 * Route: /reading-for-others
 *
 * User A pays and fills in another person's (B's) birth details.
 * The API generates a reading and emails B with an invitation to claim it.
 */

import RNDateTimePicker from '@react-native-community/datetimepicker'
import { useMutation } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { BackButton } from '@/components/ui/BackButton'
import { getIsPro, useAuth } from '@/lib/auth'
import { config } from '@/lib/config'
import { signRequest } from '@/lib/hmac'
import { useI18n } from '@/lib/i18n'
import { useIosPalette, useTheme } from '@/lib/theme'
import { randomUUID } from '@/lib/uuid'

// ── Constants ────────────────────────────────────────────────────────────────

const SHICHEN = [
  { index: 0, label: '子时', sub: '23:00–01:00' },
  { index: 1, label: '丑时', sub: '01:00–03:00' },
  { index: 2, label: '寅时', sub: '03:00–05:00' },
  { index: 3, label: '卯时', sub: '05:00–07:00' },
  { index: 4, label: '辰时', sub: '07:00–09:00' },
  { index: 5, label: '巳时', sub: '09:00–11:00' },
  { index: 6, label: '午时', sub: '11:00–13:00' },
  { index: 7, label: '未时', sub: '13:00–15:00' },
  { index: 8, label: '申时', sub: '15:00–17:00' },
  { index: 9, label: '酉时', sub: '17:00–19:00' },
  { index: 10, label: '戌时', sub: '19:00–21:00' },
  { index: 11, label: '亥时', sub: '21:00–23:00' },
  { index: 12, label: '不确定', sub: '时辰未知' },
]

type ReadingType = 'fate' | 'natal' | 'stellar'

// ── API ──────────────────────────────────────────────────────────────────────

interface GenerateResult {
  giftId: string
  readingId: string
  readingType: string
  recipientEmail: string
}

async function generateReadingForOthers(
  userId: string,
  payload: Record<string, unknown>
): Promise<GenerateResult> {
  const path = '/api/readings/for-others'
  const bodyStr = JSON.stringify(payload)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${userId}`,
  }
  const sig = await signRequest({ body: bodyStr, userId, method: 'POST', path })
  if (sig) Object.assign(headers, sig)

  const res = await fetch(`${config.apiUrl}${path}`, {
    method: 'POST',
    headers,
    body: bodyStr,
  })

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Request failed: ${res.status}`)
  }
  return res.json() as Promise<GenerateResult>
}

// ── Components ────────────────────────────────────────────────────────────────

function FormLabel({ label, ios }: { label: string; ios: any }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: ios.secondary,
        marginBottom: 8,
      }}
    >
      {label}
    </Text>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ReadingForOthersScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { t } = useI18n()
  const { colors, isDark } = useTheme()

  const ios = useIosPalette()

  // Form state
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [gender, setGender] = useState<'男' | '女' | null>(null)
  const [birthDate, setBirthDate] = useState(new Date(1985, 0, 1))
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [timeIndex, setTimeIndex] = useState<number | null>(null)
  const [city, setCity] = useState('')
  const [readingType, setReadingType] = useState<ReadingType>('fate')

  const userId = user?.id ?? null
  const isPro = getIsPro(user)

  const canSubmit =
    !!userId && recipientEmail.includes('@') && gender !== null && timeIndex !== null

  // ── Mutation ──────────────────────────────────────────────────────────────

  const generateMutation = useMutation<GenerateResult, Error, void>({
    mutationFn: () => {
      const y = birthDate.getFullYear()
      const m = String(birthDate.getMonth() + 1).padStart(2, '0')
      const d = String(birthDate.getDate()).padStart(2, '0')
      const solarDate = `${y}-${m}-${d}`

      const base = {
        readingType,
        recipientEmail: recipientEmail.trim().toLowerCase(),
        recipientName: recipientName.trim() || undefined,
        recipientGender: gender!,
        solarDate,
        timeIndex: timeIndex!,
        city: city.trim() || undefined,
        queryYear: new Date().getFullYear(),
        requestId: randomUUID(),
      }

      return generateReadingForOthers(userId!, base)
    },
    onSuccess: (_result) => {
      Alert.alert(t('reading_for_others_success_title'), t('reading_for_others_success_msg'), [
        { text: 'OK', onPress: () => router.back() },
      ])
    },
    onError: (err) => {
      if (err.message === 'insufficient_credits') {
        Alert.alert(t('chat_insufficient'))
      } else {
        Alert.alert(t('reading_for_others_error'))
      }
    },
  })

  // ── Render ────────────────────────────────────────────────────────────────

  const readingTypes: Array<{ key: ReadingType; label: string }> = [
    { key: 'fate', label: t('reading_for_others_type_fate') },
    { key: 'natal', label: t('reading_for_others_type_natal') },
    { key: 'stellar', label: t('reading_for_others_type_stellar') },
  ]

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: ios.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 56,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: ios.separator,
        }}
      >
        <BackButton style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '500', color: ios.text }}>
            {t('reading_for_others_title')}
          </Text>
          <Text style={{ fontSize: 12, color: ios.secondary, marginTop: 2 }}>
            {t('reading_for_others_subtitle')}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 24 }}
        keyboardShouldPersistTaps='handled'
      >
        {/* ── 命盘类型 ──────────────────────────────────────────── */}
        <View>
          <FormLabel label={t('reading_for_others_type')} ios={ios} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {readingTypes.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => {
                  Haptics.selectionAsync()
                  setReadingType(item.key)
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderWidth: 0.5,
                  borderColor: readingType === item.key ? ios.accent : ios.separator,
                  backgroundColor:
                    readingType === item.key
                      ? isDark
                        ? 'rgba(196,168,130,0.1)'
                        : 'rgba(60,36,21,0.05)'
                      : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: readingType === item.key ? ios.accent : ios.secondary,
                    fontWeight: readingType === item.key ? '500' : '300',
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={{ fontSize: 11, color: ios.dim, marginTop: 6 }}>
            {isPro ? t('reading_for_others_pro_included') : t('reading_for_others_pro_required')}
          </Text>
        </View>

        {/* ── 姓名 ────────────────────────────────────────────── */}
        <View>
          <FormLabel label={t('reading_for_others_recipient_name')} ios={ios} />
          <TextInput
            style={{
              backgroundColor: ios.card,
              borderRadius: 0,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 15,
              color: ios.text,
              borderWidth: 0.5,
              borderColor: ios.separator,
            }}
            placeholder={t('reading_for_others_recipient_name_ph')}
            placeholderTextColor={ios.dim}
            value={recipientName}
            onChangeText={setRecipientName}
          />
        </View>

        {/* ── 邮箱 ────────────────────────────────────────────── */}
        <View>
          <FormLabel label={t('reading_for_others_email')} ios={ios} />
          <TextInput
            style={{
              backgroundColor: ios.card,
              borderRadius: 0,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 15,
              color: ios.text,
              borderWidth: 0.5,
              borderColor:
                recipientEmail && !recipientEmail.includes('@') ? '#EF4444' : ios.separator,
            }}
            placeholder={t('reading_for_others_email_ph')}
            placeholderTextColor={ios.dim}
            value={recipientEmail}
            onChangeText={setRecipientEmail}
            keyboardType='email-address'
            autoCapitalize='none'
            autoCorrect={false}
          />
        </View>

        {/* ── 性别 ────────────────────────────────────────────── */}
        <View>
          <FormLabel label={t('reading_for_others_gender')} ios={ios} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {(['男', '女'] as const).map((g) => (
              <Pressable
                key={g}
                onPress={() => {
                  Haptics.selectionAsync()
                  setGender(g)
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  alignItems: 'center',
                  borderWidth: 0.5,
                  borderColor: gender === g ? ios.accent : ios.separator,
                  backgroundColor:
                    gender === g
                      ? isDark
                        ? 'rgba(196,168,130,0.1)'
                        : 'rgba(60,36,21,0.05)'
                      : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    color: gender === g ? ios.accent : ios.secondary,
                    fontWeight: gender === g ? '500' : '300',
                  }}
                >
                  {g === '男' ? t('reading_for_others_male') : t('reading_for_others_female')}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── 出生日期 ─────────────────────────────────────────── */}
        <View>
          <FormLabel label={t('reading_for_others_birthdate')} ios={ios} />
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={{
              backgroundColor: ios.card,
              borderRadius: 0,
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderWidth: 0.5,
              borderColor: ios.separator,
            }}
          >
            <Text style={{ fontSize: 15, color: ios.text }}>{birthDate.toLocaleDateString()}</Text>
          </Pressable>
          {showDatePicker && (
            <RNDateTimePicker
              value={birthDate}
              mode='date'
              display='spinner'
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
              onChange={(_, date) => {
                setShowDatePicker(false)
                if (date) setBirthDate(date)
              }}
            />
          )}
        </View>

        {/* ── 出生时辰 ─────────────────────────────────────────── */}
        <View>
          <FormLabel label={t('reading_for_others_birthtime')} ios={ios} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SHICHEN.map((s) => (
              <Pressable
                key={s.index}
                onPress={() => {
                  Haptics.selectionAsync()
                  setTimeIndex(s.index)
                }}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderWidth: 0.5,
                  borderColor: timeIndex === s.index ? ios.accent : ios.separator,
                  backgroundColor:
                    timeIndex === s.index
                      ? isDark
                        ? 'rgba(196,168,130,0.1)'
                        : 'rgba(60,36,21,0.05)'
                      : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: timeIndex === s.index ? '500' : '300',
                    color: timeIndex === s.index ? ios.accent : ios.secondary,
                  }}
                >
                  {s.label}
                </Text>
                <Text style={{ fontSize: 9, color: ios.dim, marginTop: 2 }}>{s.sub}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── 出生地 ──────────────────────────────────────────── */}
        <View>
          <FormLabel label={t('reading_for_others_city')} ios={ios} />
          <TextInput
            style={{
              backgroundColor: ios.card,
              borderRadius: 0,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 15,
              color: ios.text,
              borderWidth: 0.5,
              borderColor: ios.separator,
            }}
            placeholder={t('reading_for_others_city_ph')}
            placeholderTextColor={ios.dim}
            value={city}
            onChangeText={setCity}
          />
        </View>

        {/* ── 提交按钮 ─────────────────────────────────────────── */}
        <Pressable
          onPress={() => {
            if (!canSubmit) return
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            generateMutation.mutate()
          }}
          disabled={!canSubmit || generateMutation.isPending}
          style={({ pressed }) => ({
            backgroundColor: canSubmit && !generateMutation.isPending ? ios.tint : ios.separator,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          {generateMutation.isPending ? (
            <ActivityIndicator color={ios.tintFg} />
          ) : (
            <Text
              style={{
                fontSize: 16,
                fontWeight: '500',
                color: canSubmit ? ios.tintFg : ios.dim,
              }}
            >
              {t('reading_for_others_generate')}
            </Text>
          )}
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
