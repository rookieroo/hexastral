/**
 * Bond Accept — 共振邀请响应页
 *
 * Deep link: hexastral://bond-accept/{token}
 * Also accessible via: /bond-accept?token=xxx
 *
 * Flow: Fetch invitation info → Display inviter & relationship →
 * B enters birth data (if accepting) → Submit response.
 */

import RNDateTimePicker from '@react-native-community/datetimepicker'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Check, ChevronLeft, Lock, X } from 'lucide-react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth'
import type { InvitationInfo, RespondResult } from '@/lib/domain/bonds'
import {
  fetchInvitationInfo,
  RELATIONSHIP_LABELS,
  respondToInvite,
  updateBond,
} from '@/lib/domain/bonds'
import { formatShichenLabel } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { useIosPalette, useTheme } from '@/lib/theme'
import type { GeocodedCity } from '@/lib/ux/geocode'
import { searchCity } from '@/lib/ux/geocode'

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

export default function BondAcceptScreen() {
  const { colors, isDark } = useTheme()
  const { t, locale } = useI18n()
  const { userId } = useAuth()
  const router = useRouter()
  const { token } = useLocalSearchParams<{ token: string }>()

  const ios = useIosPalette()

  const [info, setInfo] = useState<InvitationInfo | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(true)

  // Birth form state (for accept)
  const [showBirthForm, setShowBirthForm] = useState(false)
  const [birthDate, setBirthDate] = useState(new Date(1990, 0, 1))
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [timeIndex, setTimeIndex] = useState<number | null>(null)
  const [gender, setGender] = useState<'男' | '女' | null>(null)
  const [cityQuery, setCityQuery] = useState('')
  const [citySuggestions, setCitySuggestions] = useState<GeocodedCity[]>([])
  const [selectedCity, setSelectedCity] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [done, setDone] = useState<'accepted' | 'declined' | null>(null)
  const [respondResult, setRespondResult] = useState<RespondResult | null>(null)
  const [myLabel, setMyLabel] = useState<string>('')
  const [showLabelPicker, setShowLabelPicker] = useState(false)

  const cityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Fetch invitation info ──

  useEffect(() => {
    if (!token) {
      setFetchError('Missing invitation token')
      setLoadingInfo(false)
      return
    }
    let cancelled = false
    fetchInvitationInfo(token)
      .then((data) => {
        if (!cancelled) setInfo(data)
      })
      .catch((err) => {
        if (!cancelled) setFetchError(err instanceof Error ? err.message : 'Unknown error')
      })
      .finally(() => {
        if (!cancelled) setLoadingInfo(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

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

  // ── Decline ──

  const handleDecline = useCallback(async () => {
    if (!token) return
    if (!userId) {
      setSubmitError(t('error_login_hint'))
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await respondToInvite(token, { userId, action: 'decline' })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setDone('declined')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setSubmitting(false)
    }
  }, [token, userId, t])

  // ── Accept ──

  const canAccept = timeIndex != null && gender != null

  const handleAccept = useCallback(async () => {
    if (!token || !canAccept || !gender || timeIndex == null) return
    if (!userId) {
      setSubmitError(t('error_login_hint'))
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const y = birthDate.getFullYear()
      const m = birthDate.getMonth() + 1
      const d = birthDate.getDate()
      const result = await respondToInvite(token, {
        userId,
        action: 'accept',
        birthData: {
          solarDate: `${y}-${m}-${d}`,
          timeIndex,
          gender,
          city: selectedCity ?? undefined,
        },
        language: locale,
      })
      setRespondResult(result)
      setMyLabel(info?.relationshipLabel ?? '')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setDone('accepted')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setSubmitting(false)
    }
  }, [
    token,
    canAccept,
    gender,
    timeIndex,
    birthDate,
    selectedCity,
    userId,
    locale,
    info?.relationshipLabel,
  ])

  // ── Loading state ──

  if (loadingInfo) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: ios.bg, justifyContent: 'center', alignItems: 'center' }}
      >
        <ActivityIndicator color={ios.dim} />
      </SafeAreaView>
    )
  }

  // ── Error state ──

  if (fetchError || !info) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }}>
        <Header ios={ios} onBack={() => router.back()} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <Text style={{ fontSize: 14, color: ios.secondary, textAlign: 'center', lineHeight: 22 }}>
            {fetchError ?? t('bond_invite_not_found')}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // ── Done state ──

  if (done) {
    // ── Declined: simple confirmation ──
    if (done === 'declined') {
      return (
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: ios.bg,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 40,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '300',
              color: ios.text,
              letterSpacing: 2,
              marginBottom: 12,
            }}
          >
            {t('bond_declined_title')}
          </Text>
          <Text style={{ fontSize: 13, color: ios.secondary, textAlign: 'center', lineHeight: 20 }}>
            {t('bond_declined_desc')}
          </Text>
          <Pressable
            onPress={() => router.replace('/(tabs)/friends')}
            style={{
              marginTop: 24,
              paddingHorizontal: 24,
              paddingVertical: 12,
              backgroundColor: ios.tint,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '500', color: ios.tintFg, letterSpacing: 2 }}>
              {t('bond_go_to_bonds')}
            </Text>
          </Pressable>
        </SafeAreaView>
      )
    }

    // ── Accepted: enriched briefing ──
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }}>
        <ScrollView
          contentContainerStyle={{ padding: 24, alignItems: 'center', gap: 20, paddingBottom: 80 }}
        >
          <Text style={{ fontSize: 16, fontWeight: '300', color: ios.text, letterSpacing: 2 }}>
            {t('bond_accepted_title')}
          </Text>

          {/* Score + Grade card */}
          {respondResult?.score != null ? (
            <View style={{ alignItems: 'center', gap: 12, paddingVertical: 20 }}>
              <View
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  borderWidth: 1.5,
                  borderColor: ios.accent,
                  backgroundColor: `${ios.accent}10`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{ fontSize: 36, fontWeight: '200', color: ios.text, letterSpacing: -2 }}
                >
                  {respondResult.score}
                </Text>
                <Text style={{ fontSize: 10, color: ios.secondary, marginTop: -2 }}>/ 100</Text>
              </View>
              {respondResult.grade ? (
                <View
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 4,
                    borderWidth: 0.5,
                    borderColor: `${ios.accent}30`,
                  }}
                >
                  <Text
                    style={{ fontSize: 13, fontWeight: '300', color: ios.accent, letterSpacing: 2 }}
                  >
                    {respondResult.grade}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Exposed dimension */}
          {respondResult?.exposedDimension ? (
            <View
              style={{
                width: '100%',
                borderWidth: 0.5,
                borderColor: ios.separator,
                padding: 16,
                gap: 8,
              }}
            >
              <Text
                style={{ fontSize: 12, fontWeight: '300', color: ios.accent, letterSpacing: 2 }}
              >
                {respondResult.exposedDimension.label}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 24, fontWeight: '200', color: ios.text }}>
                  {respondResult.exposedDimension.score}
                </Text>
                <Text style={{ fontSize: 10, color: ios.secondary }}>/ 100</Text>
              </View>
              {respondResult.exposedDimension.description ? (
                <Text
                  style={{ fontSize: 12, fontWeight: '300', color: ios.secondary, lineHeight: 18 }}
                >
                  {respondResult.exposedDimension.description}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Locked dimensions hint */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
            <Lock size={14} color={ios.dim} strokeWidth={1.2} />
            <Text style={{ fontSize: 11, color: ios.dim, letterSpacing: 1 }}>
              {t('bond_briefing_locked')}
            </Text>
          </View>

          {/* B's independent label picker */}
          <View style={{ width: '100%', gap: 8, marginTop: 8 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '300',
                color: ios.secondary,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              {t('bond_set_your_label')}
            </Text>
            <Pressable
              onPress={() => setShowLabelPicker(!showLabelPicker)}
              style={{
                paddingVertical: 10,
                borderBottomWidth: 0.5,
                borderBottomColor: ios.separator,
              }}
            >
              <Text style={{ fontSize: 15, color: ios.text }}>
                {myLabel || t('bond_label_hint')}
              </Text>
            </Pressable>
            {showLabelPicker ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 8 }}>
                {RELATIONSHIP_LABELS.map((key) => (
                  <Pressable
                    key={key}
                    onPress={async () => {
                      Haptics.selectionAsync()
                      const label = t(`bond_label_${key}` as Parameters<typeof t>[0])
                      setMyLabel(label)
                      setShowLabelPicker(false)
                      // Persist label to B's mirror bond
                      if (respondResult?.mirrorBondId && userId) {
                        await updateBond(userId, respondResult.mirrorBondId, {
                          relationshipLabel: label,
                        }).catch((err) => {
                          if (__DEV__) console.error('[Bond] Label update failed:', err)
                        })
                      }
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderWidth: 0.5,
                      borderColor: ios.separator,
                      backgroundColor:
                        myLabel === t(`bond_label_${key}` as Parameters<typeof t>[0])
                          ? `${ios.accent}15`
                          : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 12, color: ios.text }}>
                      {t(`bond_label_${key}` as Parameters<typeof t>[0])}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          {/* Navigate to bonds */}
          <Pressable
            onPress={() => router.replace('/(tabs)/friends')}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 12,
              backgroundColor: ios.tint,
              marginTop: 12,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '500', color: ios.tintFg, letterSpacing: 2 }}>
              {t('bond_go_to_bonds')}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── Invitation display ──

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }}>
      <Header ios={ios} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 120 }}>
        {/* Invitation card */}
        <View
          style={{
            borderWidth: 0.5,
            borderColor: ios.separator,
            padding: 24,
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              color: ios.secondary,
              letterSpacing: 4,
              textTransform: 'uppercase',
            }}
          >
            {t('bond_invite_from')}
          </Text>
          <Text style={{ fontSize: 20, fontWeight: '300', color: ios.text, letterSpacing: 1 }}>
            {info.inviterName}
          </Text>
          <Text style={{ fontSize: 12, color: ios.accent, letterSpacing: 2 }}>
            {info.relationshipLabel}
          </Text>
          {info.message ? (
            <Text
              style={{
                fontSize: 13,
                color: ios.secondary,
                fontStyle: 'italic',
                lineHeight: 20,
                textAlign: 'center',
                marginTop: 8,
              }}
            >
              "{info.message}"
            </Text>
          ) : null}
          <Text style={{ fontSize: 10, color: ios.dim, marginTop: 4 }}>
            {t('bond_invite_expires')}: {new Date(info.expiresAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Birth form (shown when user wants to accept) */}
        {showBirthForm ? (
          <>
            <Text style={{ fontSize: 13, color: ios.secondary, lineHeight: 20 }}>
              {t('bond_accept_birth_prompt')}
            </Text>

            {/* Date */}
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
                {t('bond_birth_date')}
              </Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: 0.5,
                  borderBottomColor: ios.separator,
                }}
              >
                <Text style={{ fontSize: 15, color: ios.text }}>
                  {birthDate.toLocaleDateString()}
                </Text>
              </Pressable>
              {showDatePicker && (
                <RNDateTimePicker
                  value={birthDate}
                  mode='date'
                  display='spinner'
                  maximumDate={new Date()}
                  minimumDate={new Date(1920, 0, 1)}
                  onChange={(_, date) => {
                    setShowDatePicker(false)
                    if (date) setBirthDate(date)
                  }}
                />
              )}
            </View>

            {/* Time */}
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
                {t('bond_birth_time')}
              </Text>
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
                      {formatShichenLabel(s.index, locale)}
                    </Text>
                    <Text style={{ fontSize: 9, color: ios.dim, marginTop: 2 }}>{s.sub}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Gender */}
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
                {t('bond_gender')}
              </Text>
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
                      borderColor: gender === g ? ios.accent : ios.separator,
                      alignItems: 'center',
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
                        fontSize: 14,
                        fontWeight: gender === g ? '500' : '300',
                        color: gender === g ? ios.accent : ios.secondary,
                      }}
                    >
                      {g === '男' ? t('gender_male') : t('gender_female')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* City (optional) */}
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
                {`${t('bond_birth_city')} (${t('optional')})`}
              </Text>
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
            </View>

            {submitError ? (
              <Text style={{ fontSize: 12, color: '#ef4444', lineHeight: 18 }}>{submitError}</Text>
            ) : null}

            {/* Submit accept */}
            <Pressable
              onPress={handleAccept}
              disabled={submitting || !canAccept}
              style={({ pressed }) => ({
                backgroundColor: ios.tint,
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                opacity: submitting || !canAccept ? 0.4 : pressed ? 0.8 : 1,
              })}
            >
              {submitting ? (
                <ActivityIndicator color={ios.tintFg} size='small' />
              ) : (
                <>
                  <Check size={16} color={ios.tintFg} strokeWidth={1.5} />
                  <Text
                    style={{ fontSize: 13, fontWeight: '500', color: ios.tintFg, letterSpacing: 2 }}
                  >
                    {t('bond_confirm_accept')}
                  </Text>
                </>
              )}
            </Pressable>
          </>
        ) : (
          <>
            {/* Action buttons */}
            <Pressable
              onPress={() => setShowBirthForm(true)}
              style={({ pressed }) => ({
                backgroundColor: ios.tint,
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Check size={16} color={ios.tintFg} strokeWidth={1.5} />
              <Text
                style={{ fontSize: 13, fontWeight: '500', color: ios.tintFg, letterSpacing: 2 }}
              >
                {t('bond_accept')}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleDecline}
              disabled={submitting}
              style={({ pressed }) => ({
                borderWidth: 0.5,
                borderColor: ios.separator,
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                opacity: submitting ? 0.4 : pressed ? 0.7 : 1,
              })}
            >
              {submitting ? (
                <ActivityIndicator color={ios.secondary} size='small' />
              ) : (
                <>
                  <X size={16} color={ios.secondary} strokeWidth={1.5} />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '300',
                      color: ios.secondary,
                      letterSpacing: 2,
                    }}
                  >
                    {t('bond_decline')}
                  </Text>
                </>
              )}
            </Pressable>

            {submitError ? (
              <Text style={{ fontSize: 12, color: '#ef4444', lineHeight: 18 }}>{submitError}</Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function Header({ ios, onBack }: { ios: any; onBack: () => void }) {
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
        Invitation
      </Text>
    </View>
  )
}
