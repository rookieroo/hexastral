/**
 * Bond Create — 双模式关系创建
 *
 * Mode picker → Solo (默念) or Resonance (共振)
 *
 * Solo: Name → Relationship → Birth data → Ritual ceremony → Coin confirm → Reading
 * Resonance: Name → Relationship → Email → Optional message → Coin confirm → Sent
 */

import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ChevronLeft, Eye, Mail, Send, Sparkles } from 'lucide-react-native'
import { useCallback, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RitualCeremony } from '@/components/branding/RitualCeremony'
import { LunarDatePicker } from '@/components/ui/LunarDatePicker'
import { getIsPro, useAuth } from '@/lib/auth'
import { createSoloBond, RELATIONSHIP_LABELS, sendResonanceInvite } from '@/lib/domain/bonds'
import { useI18n } from '@/lib/i18n'
import { useIosPalette, useTheme } from '@/lib/theme'
import type { GeocodedCity } from '@/lib/ux/geocode'
import { searchCity } from '@/lib/ux/geocode'

type Mode = 'solo' | 'resonance'
type Step = 'form' | 'ritual' | 'loading' | 'done'

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
]

export default function BondCreateScreen() {
  const { colors, isDark } = useTheme()
  const { t } = useI18n()
  const { userId, user } = useAuth()
  const router = useRouter()
  const params = useLocalSearchParams<{ relationship?: string; mode?: string }>()

  const ios = useIosPalette()
  const isPro = getIsPro(user ?? null)

  const initMode = params.mode === 'resonance' ? 'resonance' : 'solo'
  const [step, setStep] = useState<Step>('form')
  const [mode, setMode] = useState<Mode>(initMode)
  const [targetName, setTargetName] = useState('')
  const [relationshipLabel, setRelationshipLabel] = useState(params.relationship ?? '')
  const [customLabel, setCustomLabel] = useState('')

  // Solo fields
  const [birthDate, setBirthDate] = useState(new Date(1990, 0, 1))
  const [timeIndex, setTimeIndex] = useState<number | null>(null)
  const [gender, setGender] = useState<'男' | '女' | null>(null)
  const [cityQuery, setCityQuery] = useState('')
  const [citySuggestions, setCitySuggestions] = useState<GeocodedCity[]>([])
  const [selectedCity, setSelectedCity] = useState<string | null>(null)

  // Resonance fields
  const [targetEmail, setTargetEmail] = useState('')
  const [message, setMessage] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const effectiveLabel = relationshipLabel === 'custom' ? customLabel : relationshipLabel

  const canSubmitSolo = targetName.trim() && effectiveLabel.trim() && timeIndex != null && gender

  const hasEmail = !!user?.email
  const canSubmitResonance =
    targetName.trim() &&
    effectiveLabel.trim() &&
    targetEmail.trim() &&
    targetEmail.includes('@') &&
    hasEmail

  // ── City search ──

  const handleCitySearch = useCallback((text: string) => {
    setCityQuery(text)
    setSelectedCity(null)
    if (cityTimerRef.current) clearTimeout(cityTimerRef.current)
    if (text.length < 2) {
      setCitySuggestions([])
      return
    }
    cityTimerRef.current = setTimeout(async () => {
      const results = await searchCity(text)
      setCitySuggestions(results.slice(0, 5))
    }, 350)
  }, [])

  // ── Submit ──

  const handleSubmit = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      if (mode === 'solo') {
        if (!canSubmitSolo || !gender || timeIndex == null) return
        const y = birthDate.getFullYear()
        const m = birthDate.getMonth() + 1
        const d = birthDate.getDate()
        await createSoloBond(userId, {
          targetName: targetName.trim(),
          relationshipLabel: effectiveLabel.trim(),
          targetBirth: {
            solarDate: `${y}-${m}-${d}`,
            timeIndex,
            gender,
            city: selectedCity ?? undefined,
          },
        })
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        router.back()
      } else {
        await sendResonanceInvite(userId, {
          targetEmail: targetEmail.trim().toLowerCase(),
          targetName: targetName.trim(),
          relationshipLabel: effectiveLabel.trim(),
          message: message.trim() || undefined,
        })
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        Alert.alert(t('bond_invite_sent_title'), t('bond_invite_sent_desc'), [
          { text: 'OK', onPress: () => router.back() },
        ])
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      if (msg.includes('limited to') || msg.includes('bond')) {
        Alert.alert(t('bond_limit_title'), t('bond_limit_desc'), [
          { text: t('cancel'), style: 'cancel' },
          { text: t('paywall_upgrade'), onPress: () => router.push('/paywall') },
        ])
      } else if (msg === 'pro_required' || msg === 'purchase_required') {
        if (mode === 'solo') router.push('/paywall')
        else setError(t('bond_limit_desc'))
      } else {
        setError(msg)
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setLoading(false)
    }
  }, [
    userId,
    mode,
    targetName,
    effectiveLabel,
    birthDate,
    timeIndex,
    gender,
    selectedCity,
    targetEmail,
    message,
    canSubmitSolo,
    router,
    t,
  ])

  // ── Render: Ritual ceremony (Solo only) ──

  if (step === 'ritual') {
    return (
      <View style={{ flex: 1, backgroundColor: ios.bg }}>
        <RitualCeremony
          targetName={targetName.trim()}
          onComplete={() => {
            setStep('form')
            handleSubmit()
          }}
        />
      </View>
    )
  }

  // ── Render: Form ──

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }}>
      <Header title={t('bond_create_title')} ios={ios} onBack={() => router.back()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 120 }}>
          {/* Mode toggle — Solo / Resonance segmented control */}
          <View
            style={{
              flexDirection: 'row',
              borderWidth: 0.5,
              borderColor: ios.separator,
              overflow: 'hidden',
            }}
          >
            {(['solo', 'resonance'] as const).map((m) => {
              const active = mode === m
              return (
                <Pressable
                  key={m}
                  onPress={() => {
                    Haptics.selectionAsync()
                    setMode(m)
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    backgroundColor: active ? ios.tint : 'transparent',
                    borderRightWidth: m === 'solo' ? 0.5 : 0,
                    borderRightColor: ios.separator,
                  }}
                >
                  {m === 'solo' ? (
                    <Eye size={14} color={active ? ios.tintFg : ios.text} strokeWidth={1.5} />
                  ) : (
                    <Sparkles size={14} color={active ? ios.tintFg : ios.text} strokeWidth={1.5} />
                  )}
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: active ? '500' : '400',
                      color: active ? ios.tintFg : ios.text,
                      letterSpacing: 1,
                    }}
                  >
                    {m === 'solo' ? t('bond_mode_solo') : t('bond_mode_resonance')}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {/* Name */}
          <FormSection label={t('bond_target_name')} ios={ios}>
            <TextInput
              value={targetName}
              onChangeText={setTargetName}
              placeholder={t('bond_target_name_placeholder')}
              placeholderTextColor={ios.dim}
              maxLength={50}
              style={{
                fontSize: 15,
                color: ios.text,
                borderBottomWidth: 0.5,
                borderBottomColor: ios.separator,
                paddingVertical: 10,
              }}
            />
          </FormSection>

          {/* Relationship label */}
          <FormSection label={t('bond_relationship')} ios={ios}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {RELATIONSHIP_LABELS.map((key) => (
                <Pressable
                  key={key}
                  onPress={() => {
                    Haptics.selectionAsync()
                    setRelationshipLabel(key)
                  }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderWidth: 0.5,
                    borderColor: relationshipLabel === key ? ios.tint : ios.separator,
                    backgroundColor: relationshipLabel === key ? ios.tint : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: relationshipLabel === key ? '500' : '400',
                      color: relationshipLabel === key ? ios.tintFg : ios.text,
                    }}
                  >
                    {t(`bond_label_${key}` as Parameters<typeof t>[0])}
                  </Text>
                </Pressable>
              ))}
              {/* Custom */}
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync()
                  setRelationshipLabel('custom')
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderWidth: 0.5,
                  borderColor: relationshipLabel === 'custom' ? ios.tint : ios.separator,
                  backgroundColor: relationshipLabel === 'custom' ? ios.tint : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: relationshipLabel === 'custom' ? '500' : '400',
                    color: relationshipLabel === 'custom' ? ios.tintFg : ios.text,
                  }}
                >
                  {t('bond_label_custom')}
                </Text>
              </Pressable>
            </View>
            {relationshipLabel === 'custom' && (
              <TextInput
                value={customLabel}
                onChangeText={setCustomLabel}
                placeholder={t('bond_label_custom_placeholder')}
                placeholderTextColor={ios.dim}
                maxLength={30}
                style={{
                  fontSize: 15,
                  color: ios.text,
                  borderBottomWidth: 0.5,
                  borderBottomColor: ios.separator,
                  paddingVertical: 10,
                  marginTop: 8,
                }}
              />
            )}
          </FormSection>

          {mode === 'solo' ? (
            <>
              {!isPro ? (
                <View
                  style={{
                    padding: 12,
                    borderWidth: 0.5,
                    borderColor: ios.separator,
                    backgroundColor: ios.cardElevated,
                  }}
                >
                  <Text style={{ color: ios.secondary, fontSize: 12 }}>{t('paywall_upgrade')}</Text>
                </View>
              ) : null}
              {/* ── Solo: Birth data ── */}
              <FormSection label={t('bond_birth_date')} ios={ios}>
                <LunarDatePicker value={birthDate} onChange={setBirthDate} />
              </FormSection>

              <FormSection label={t('bond_birth_time')} ios={ios}>
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
                        borderColor: timeIndex === s.index ? ios.tint : ios.separator,
                        backgroundColor: timeIndex === s.index ? ios.tint : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: timeIndex === s.index ? '500' : '400',
                          color: timeIndex === s.index ? ios.tintFg : ios.text,
                        }}
                      >
                        {s.label}
                      </Text>
                      <Text
                        style={{
                          fontSize: 9,
                          color: timeIndex === s.index ? ios.tintFg : ios.secondary,
                          marginTop: 2,
                        }}
                      >
                        {s.sub}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </FormSection>

              <FormSection label={t('bond_gender')} ios={ios}>
                <View style={{ flexDirection: 'row', gap: 16 }}>
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
                        borderWidth: 0.5,
                        borderColor: gender === g ? ios.tint : ios.separator,
                        alignItems: 'center',
                        backgroundColor: gender === g ? ios.tint : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: gender === g ? '500' : '400',
                          color: gender === g ? ios.tintFg : ios.text,
                        }}
                      >
                        {g === '男' ? t('gender_male') : t('gender_female')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </FormSection>

              <FormSection label={`${t('bond_birth_city')} (${t('optional')})`} ios={ios}>
                <TextInput
                  value={cityQuery}
                  onChangeText={handleCitySearch}
                  placeholder={t('bond_city_placeholder')}
                  placeholderTextColor={ios.dim}
                  style={{
                    fontSize: 15,
                    color: ios.text,
                    borderBottomWidth: 0.5,
                    borderBottomColor: ios.separator,
                    paddingVertical: 10,
                  }}
                />
                {citySuggestions.length > 0 && !selectedCity && (
                  <View style={{ borderWidth: 0.5, borderColor: ios.separator, marginTop: 4 }}>
                    {citySuggestions.map((c) => (
                      <Pressable
                        key={`${c.name}-${c.lat}-${c.lon}`}
                        onPress={() => {
                          setSelectedCity(c.name)
                          setCityQuery(c.name)
                          setCitySuggestions([])
                        }}
                        style={{
                          padding: 10,
                          borderBottomWidth: 0.5,
                          borderBottomColor: ios.separator,
                        }}
                      >
                        <Text style={{ fontSize: 14, color: ios.text }}>{c.name}</Text>
                        <Text style={{ fontSize: 11, color: ios.dim }}>{c.country}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </FormSection>
            </>
          ) : (
            <>
              <View
                style={{
                  padding: 12,
                  borderWidth: 0.5,
                  borderColor: ios.separator,
                  backgroundColor: ios.cardElevated,
                }}
              >
                <View style={{ gap: 6 }}>
                  <Text style={{ color: ios.text, fontSize: 14, fontWeight: '500' }}>
                    {t('bond_mode_resonance')}
                  </Text>
                  <Text style={{ color: ios.secondary, fontSize: 12, lineHeight: 18 }}>
                    {t('bond_mode_resonance_desc')}
                  </Text>
                </View>
              </View>
              {/* ── Resonance: Email + message ── */}
              <FormSection label={t('bond_target_email')} ios={ios}>
                <TextInput
                  value={targetEmail}
                  onChangeText={setTargetEmail}
                  placeholder={t('bond_email_placeholder')}
                  placeholderTextColor={ios.dim}
                  keyboardType='email-address'
                  autoCapitalize='none'
                  autoCorrect={false}
                  maxLength={254}
                  style={{
                    fontSize: 15,
                    color: ios.text,
                    borderBottomWidth: 0.5,
                    borderBottomColor: ios.separator,
                    paddingVertical: 10,
                  }}
                />
              </FormSection>

              <FormSection label={`${t('bond_message')} (${t('optional')})`} ios={ios}>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder={t('bond_message_placeholder')}
                  placeholderTextColor={ios.dim}
                  multiline
                  maxLength={500}
                  style={{
                    fontSize: 15,
                    color: ios.text,
                    borderWidth: 0.5,
                    borderColor: ios.separator,
                    padding: 12,
                    minHeight: 80,
                    textAlignVertical: 'top',
                  }}
                />
              </FormSection>

              {hasEmail ? (
                <View
                  style={{
                    padding: 14,
                    borderWidth: 0.5,
                    borderColor: ios.separator,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Mail size={14} color={ios.secondary} strokeWidth={1.5} />
                  <Text style={{ fontSize: 12, color: ios.secondary, flex: 1, lineHeight: 18 }}>
                    {t('bond_resonance_sending_from')}
                    {user?.email}
                  </Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => router.push('/email-verify')}
                  style={{
                    padding: 14,
                    borderWidth: 0.5,
                    borderColor: isDark ? '#7f1d1d' : '#fecaca',
                    backgroundColor: isDark ? 'rgba(127,29,29,0.1)' : 'rgba(254,202,202,0.2)',
                  }}
                >
                  <Text
                    style={{ fontSize: 12, color: isDark ? '#fca5a5' : '#991b1b', lineHeight: 18 }}
                  >
                    {t('bond_resonance_bind_email_hint')}
                  </Text>
                </Pressable>
              )}
            </>
          )}

          {/* Error */}
          {error ? (
            <Text style={{ fontSize: 12, color: '#ef4444', lineHeight: 18 }}>{error}</Text>
          ) : null}

          {/* Submit button */}
          <TouchableOpacity
            onPress={
              mode === 'solo'
                ? () => {
                    Haptics.selectionAsync()
                    setStep('ritual')
                  }
                : handleSubmit
            }
            disabled={loading || (mode === 'solo' ? !canSubmitSolo : !canSubmitResonance)}
            activeOpacity={0.7}
            style={{
              backgroundColor: ios.tint,
              opacity:
                loading || (mode === 'solo' ? !canSubmitSolo : !canSubmitResonance) ? 0.4 : 1,
              borderRadius: 0,
              paddingVertical: 14,
              paddingHorizontal: 20,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {loading ? (
              <ActivityIndicator color={ios.tintFg} size='small' />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {mode === 'solo' ? (
                  <Eye size={16} color={ios.tintFg} strokeWidth={1.5} />
                ) : (
                  <Send size={16} color={ios.tintFg} strokeWidth={1.5} />
                )}
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: ios.tintFg,
                  }}
                >
                  {mode === 'solo' ? t('bond_submit_solo') : t('bond_submit_resonance')}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ── Shared sub-components ────────────────────────────────────

function Header({ title, ios, onBack }: { title: string; ios: any; onBack: () => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
      }}
    >
      <Pressable
        onPress={onBack}
        hitSlop={12}
        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
      >
        <ChevronLeft size={20} color={ios.text} strokeWidth={1.2} />
      </Pressable>
      <Text
        style={{
          fontSize: 15,
          fontWeight: '500',
          color: ios.text,
          letterSpacing: 1,
        }}
      >
        {title}
      </Text>
    </View>
  )
}

function FormSection({
  label,
  ios,
  children,
}: {
  label: string
  ios: any
  children: React.ReactNode
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '300',
          color: ios.secondary,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  )
}
