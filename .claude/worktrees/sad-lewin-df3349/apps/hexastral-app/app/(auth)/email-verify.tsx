/**
 * Email Verify Screen
 *
 * Two-step flow:
 *   Step 1 — Input email → send OTP
 *   Step 2 — Input 6-digit OTP → confirm binding
 *
 * Navigated to from Settings → Email row.
 * On success: updates auth context then navigates back.
 */

import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BackButton } from '@/components/ui/BackButton'
import { useAuth } from '@/lib/auth'
import { config } from '@/lib/config'
import { signRequest } from '@/lib/hmac'
import { useI18n } from '@/lib/i18n'
import { useIosPalette, useTheme } from '@/lib/theme'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

export default function EmailVerifyScreen() {
  const { colors, isDark } = useTheme()
  const { t } = useI18n()
  const router = useRouter()
  const { userId, user, updateEmail } = useAuth()

  const [step, setStep] = useState<'email' | 'verify'>('email')
  const [email, setEmail] = useState(user?.email ?? '')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ios = useIosPalette()

  const inputBorderColor = (hasError: boolean) =>
    hasError ? '#ef4444' : isDark ? '#3F3F46' : '#D4D4D8'

  const requestCode = async () => {
    if (!isValidEmail(email)) {
      setError(t('settings_email_invalid'))
      return
    }
    if (!userId) {
      setError(t('error_login_hint'))
      return
    }
    Keyboard.dismiss()
    setLoading(true)
    setError(null)
    try {
      const path = `/api/user/${userId}/email/request`
      const body = JSON.stringify({ email })
      const sig = await signRequest({ body, userId, method: 'POST', path })
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userId}`,
      }
      if (sig) Object.assign(headers, sig)
      const res = await fetch(`${config.apiUrl}${path}`, { method: 'POST', headers, body })
      const json = (await res.json().catch(() => ({}))) as { message?: string }
      if (!res.ok) {
        setError(json.message ?? t('settings_email_req_error'))
        return
      }
      setStep('verify')
    } catch {
      setError(t('settings_email_req_error'))
    } finally {
      setLoading(false)
    }
  }

  const confirmCode = async () => {
    if (code.length !== 6) {
      setError(t('settings_email_code_error'))
      return
    }
    if (!userId) {
      setError(t('error_login_hint'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const path = `/api/user/${userId}/email/confirm`
      const body = JSON.stringify({ code })
      const sig = await signRequest({ body, userId, method: 'POST', path })
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userId}`,
      }
      if (sig) Object.assign(headers, sig)
      const res = await fetch(`${config.apiUrl}${path}`, { method: 'POST', headers, body })
      const json = (await res.json().catch(() => ({}))) as { message?: string }
      if (!res.ok) {
        setError(json.message ?? t('settings_email_code_error'))
        return
      }
      updateEmail(email)
      router.back()
    } catch {
      setError(t('settings_email_code_error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }}>
      {/* Back button */}
      <BackButton />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}
        >
          {/* Section label */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: '500',
              color: ios.sectionLabel,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: 8,
            }}
          >
            {t('settings_email_verify_title')}
          </Text>

          {step === 'email' ? (
            <>
              {/* Email input card */}
              <View
                style={{
                  backgroundColor: ios.card,
                  marginHorizontal: 16,
                  borderRadius: 0,
                  overflow: 'hidden',
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                }}
              >
                <TextInput
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v)
                    setError(null)
                  }}
                  placeholder={t('settings_email_input_placeholder')}
                  placeholderTextColor={`${ios.secondary}60`}
                  keyboardType='email-address'
                  autoCapitalize='none'
                  autoCorrect={false}
                  autoFocus
                  style={{
                    borderWidth: 1,
                    borderColor: inputBorderColor(!!error),
                    borderRadius: 0,
                    padding: 14,
                    fontSize: 16,
                    fontWeight: '300',
                    color: ios.text,
                  }}
                />
                {error ? (
                  <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>{error}</Text>
                ) : null}
              </View>

              <Pressable
                onPress={requestCode}
                disabled={loading}
                style={{
                  marginHorizontal: 16,
                  marginTop: 16,
                  backgroundColor: colors.accent,
                  borderRadius: 12,
                  padding: 15,
                  alignItems: 'center',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={{ fontSize: 15, fontWeight: '500', color: colors.background }}>
                    {t('settings_email_send_code')}
                  </Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              {/* Sent-to hint */}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '300',
                  color: ios.secondary,
                  paddingHorizontal: 20,
                  marginBottom: 12,
                  lineHeight: 20,
                }}
              >
                {t('settings_email_code_sent')} {email}
              </Text>

              {/* OTP input card */}
              <View
                style={{
                  backgroundColor: ios.card,
                  marginHorizontal: 16,
                  borderRadius: 0,
                  overflow: 'hidden',
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                }}
              >
                <TextInput
                  value={code}
                  onChangeText={(v) => {
                    setCode(v.replace(/\D/g, ''))
                    setError(null)
                  }}
                  placeholder='000000'
                  placeholderTextColor={`${ios.secondary}40`}
                  keyboardType='number-pad'
                  maxLength={6}
                  autoFocus
                  style={{
                    borderWidth: 1,
                    borderColor: inputBorderColor(!!error),
                    borderRadius: 0,
                    padding: 14,
                    fontSize: 30,
                    fontWeight: '300',
                    color: ios.text,
                    letterSpacing: 10,
                    textAlign: 'center',
                  }}
                />
                {error ? (
                  <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>{error}</Text>
                ) : null}
              </View>

              <Pressable
                onPress={confirmCode}
                disabled={loading || code.length !== 6}
                style={{
                  marginHorizontal: 16,
                  marginTop: 16,
                  backgroundColor: colors.accent,
                  borderRadius: 12,
                  padding: 15,
                  alignItems: 'center',
                  opacity: loading || code.length !== 6 ? 0.5 : 1,
                }}
              >
                {loading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={{ fontSize: 15, fontWeight: '500', color: colors.background }}>
                    {t('settings_email_verify_btn')}
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  setStep('email')
                  setCode('')
                  setError(null)
                }}
                style={{ marginTop: 12, alignItems: 'center', padding: 12 }}
              >
                <Text style={{ fontSize: 13, color: ios.secondary }}>
                  {t('settings_email_resend')}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
