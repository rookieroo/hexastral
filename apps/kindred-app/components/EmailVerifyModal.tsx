/**
 * Email verify sheet — OTP bind flow (same API as hexastral-app).
 * POST /api/user/:userId/email/request + /email/confirm (HMAC).
 */

import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import { config } from '@/lib/config'
import { signRequest } from '@/lib/hmac'
import { resolveLocale, t } from '@/lib/i18n'

export interface EmailVerifyModalProps {
  visible: boolean
  userId: string
  currentEmail: string | null
  onSuccess: (email: string) => void
  onClose: () => void
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

export function EmailVerifyModal({
  visible,
  userId,
  currentEmail,
  onSuccess,
  onClose,
}: EmailVerifyModalProps) {
  const locale = resolveLocale()
  const [step, setStep] = useState<'email' | 'verify'>('email')
  const [email, setEmail] = useState(currentEmail ?? '')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetAndClose = () => {
    setStep('email')
    setEmail(currentEmail ?? '')
    setCode('')
    setError(null)
    onClose()
  }

  const requestCode = async () => {
    if (!isValidEmail(email)) {
      setError(t(locale, 'settings.email.invalid'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const path = `/api/user/${userId}/email/request`
      const body = JSON.stringify({ email })
      const sig = await signRequest({ method: 'POST', path, body, userId })
      if (!sig) throw new Error('Missing device secret')
      const res = await fetch(`${config.apiUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`,
          ...sig,
        },
        body,
      })
      const json = (await res.json().catch(() => ({}))) as { message?: string }
      if (!res.ok) {
        setError(json.message ?? t(locale, 'settings.email.requestError'))
        return
      }
      setStep('verify')
    } catch {
      setError(t(locale, 'settings.email.requestError'))
    } finally {
      setLoading(false)
    }
  }

  const confirmCode = async () => {
    if (code.length !== 6) {
      setError(t(locale, 'settings.email.codeError'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const path = `/api/user/${userId}/email/confirm`
      const body = JSON.stringify({ code })
      const sig = await signRequest({ method: 'POST', path, body, userId })
      if (!sig) throw new Error('Missing device secret')
      const res = await fetch(`${config.apiUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`,
          ...sig,
        },
        body,
      })
      const json = (await res.json().catch(() => ({}))) as { message?: string }
      if (!res.ok) {
        setError(json.message ?? t(locale, 'settings.email.codeError'))
        return
      }
      onSuccess(email)
      resetAndClose()
    } catch {
      setError(t(locale, 'settings.email.codeError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    // KeyboardAvoidingView lifts the bottom-anchored sheet above the on-screen
    // keyboard. Without it the autoFocus'd TextInput summons the keyboard before
    // the sheet finishes its slide-in, and the sheet ends up hidden underneath
    // — what the user reported as "只弹出了输入法" (only the keyboard shows).
    <Modal visible={visible} transparent animationType='slide' statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
          onPress={resetAndClose}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: kindredDark.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingBottom: 40,
            }}
          >
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, backgroundColor: kindredDark.border }} />
          </View>

          <View style={{ paddingHorizontal: kindredSpacing.screenH, paddingTop: 12 }}>
            <Text style={[kindredType.heading, { color: kindredDark.text, marginBottom: 4 }]}>
              {t(locale, 'settings.email.title')}
            </Text>

            {step === 'email' ? (
              <>
                <Text
                  style={[kindredType.caption, { color: kindredDark.textSecondary, marginTop: 8 }]}
                >
                  {t(locale, 'settings.email.subtitle')}
                </Text>
                <TextInput
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v)
                    setError(null)
                  }}
                  placeholder={t(locale, 'settings.email.placeholder')}
                  placeholderTextColor={kindredDark.textMuted}
                  keyboardType='email-address'
                  autoCapitalize='none'
                  autoCorrect={false}
                  autoFocus
                  style={{
                    borderWidth: 0.5,
                    borderColor: error ? kindredDark.seal : kindredDark.border,
                    padding: 14,
                    fontSize: 16,
                    color: kindredDark.text,
                    marginTop: kindredSpacing.lg,
                  }}
                />
                {error ? (
                  <Text style={[kindredType.caption, { color: kindredDark.seal, marginTop: 6 }]}>
                    {error}
                  </Text>
                ) : null}
                <Pressable
                  onPress={() => void requestCode()}
                  disabled={loading}
                  style={{
                    marginTop: kindredSpacing.lg,
                    paddingVertical: 14,
                    backgroundColor: kindredDark.accent,
                    alignItems: 'center',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? (
                    <ActivityIndicator color={kindredDark.bg} />
                  ) : (
                    <Text style={[kindredType.body, { color: kindredDark.bg, fontWeight: '600' }]}>
                      {t(locale, 'settings.email.sendCode')}
                    </Text>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <Text
                  style={[kindredType.caption, { color: kindredDark.textSecondary, marginTop: 8 }]}
                >
                  {t(locale, 'settings.email.codeSent')} {email}
                </Text>
                <TextInput
                  value={code}
                  onChangeText={(v) => {
                    setCode(v.replace(/\D/g, ''))
                    setError(null)
                  }}
                  placeholder='000000'
                  placeholderTextColor={kindredDark.textMuted}
                  keyboardType='number-pad'
                  maxLength={6}
                  autoFocus
                  style={{
                    borderWidth: 0.5,
                    borderColor: error ? kindredDark.seal : kindredDark.border,
                    padding: 14,
                    fontSize: 28,
                    color: kindredDark.text,
                    marginTop: kindredSpacing.lg,
                    letterSpacing: 8,
                    textAlign: 'center',
                  }}
                />
                {error ? (
                  <Text style={[kindredType.caption, { color: kindredDark.seal, marginTop: 6 }]}>
                    {error}
                  </Text>
                ) : null}
                <Pressable
                  onPress={() => void confirmCode()}
                  disabled={loading || code.length !== 6}
                  style={{
                    marginTop: kindredSpacing.lg,
                    paddingVertical: 14,
                    backgroundColor: kindredDark.accent,
                    alignItems: 'center',
                    opacity: loading || code.length !== 6 ? 0.5 : 1,
                  }}
                >
                  {loading ? (
                    <ActivityIndicator color={kindredDark.bg} />
                  ) : (
                    <Text style={[kindredType.body, { color: kindredDark.bg, fontWeight: '600' }]}>
                      {t(locale, 'settings.email.verify')}
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => {
                    setStep('email')
                    setCode('')
                    setError(null)
                  }}
                  style={{ marginTop: kindredSpacing.md, alignItems: 'center', padding: 8 }}
                >
                  <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>
                    {t(locale, 'settings.email.changeEmail')}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}
