/**
 * Email verify sheet — OTP bind flow (same API as hexastral-app).
 * POST /api/user/:userId/email/request + /email/confirm (HMAC).
 */

import { yuanLight, yuanSpacing, yuanType } from '@zhop/hexastral-tokens/yuan'
import { useState } from 'react'
import {
  ActivityIndicator,
  Modal,
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
    <Modal visible={visible} transparent animationType='slide' statusBarTranslucent>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
        onPress={resetAndClose}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: yuanLight.card,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            paddingBottom: 40,
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View
              style={{ width: 36, height: 4, backgroundColor: yuanLight.border }}
            />
          </View>

          <View style={{ paddingHorizontal: yuanSpacing.screenH, paddingTop: 12 }}>
            <Text style={[yuanType.heading, { color: yuanLight.text, marginBottom: 4 }]}>
              {t(locale, 'settings.email.title')}
            </Text>

            {step === 'email' ? (
              <>
                <Text style={[yuanType.caption, { color: yuanLight.textSecondary, marginTop: 8 }]}>
                  {t(locale, 'settings.email.subtitle')}
                </Text>
                <TextInput
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v)
                    setError(null)
                  }}
                  placeholder={t(locale, 'settings.email.placeholder')}
                  placeholderTextColor={yuanLight.textMuted}
                  keyboardType='email-address'
                  autoCapitalize='none'
                  autoCorrect={false}
                  autoFocus
                  style={{
                    borderWidth: 0.5,
                    borderColor: error ? yuanLight.seal : yuanLight.border,
                    padding: 14,
                    fontSize: 16,
                    color: yuanLight.text,
                    marginTop: yuanSpacing.lg,
                  }}
                />
                {error ? (
                  <Text style={[yuanType.caption, { color: yuanLight.seal, marginTop: 6 }]}>
                    {error}
                  </Text>
                ) : null}
                <Pressable
                  onPress={() => void requestCode()}
                  disabled={loading}
                  style={{
                    marginTop: yuanSpacing.lg,
                    paddingVertical: 14,
                    backgroundColor: yuanLight.accent,
                    alignItems: 'center',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? (
                    <ActivityIndicator color={yuanLight.bg} />
                  ) : (
                    <Text style={[yuanType.body, { color: yuanLight.bg, fontWeight: '600' }]}>
                      {t(locale, 'settings.email.sendCode')}
                    </Text>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[yuanType.caption, { color: yuanLight.textSecondary, marginTop: 8 }]}>
                  {t(locale, 'settings.email.codeSent')} {email}
                </Text>
                <TextInput
                  value={code}
                  onChangeText={(v) => {
                    setCode(v.replace(/\D/g, ''))
                    setError(null)
                  }}
                  placeholder='000000'
                  placeholderTextColor={yuanLight.textMuted}
                  keyboardType='number-pad'
                  maxLength={6}
                  autoFocus
                  style={{
                    borderWidth: 0.5,
                    borderColor: error ? yuanLight.seal : yuanLight.border,
                    padding: 14,
                    fontSize: 28,
                    color: yuanLight.text,
                    marginTop: yuanSpacing.lg,
                    letterSpacing: 8,
                    textAlign: 'center',
                  }}
                />
                {error ? (
                  <Text style={[yuanType.caption, { color: yuanLight.seal, marginTop: 6 }]}>
                    {error}
                  </Text>
                ) : null}
                <Pressable
                  onPress={() => void confirmCode()}
                  disabled={loading || code.length !== 6}
                  style={{
                    marginTop: yuanSpacing.lg,
                    paddingVertical: 14,
                    backgroundColor: yuanLight.accent,
                    alignItems: 'center',
                    opacity: loading || code.length !== 6 ? 0.5 : 1,
                  }}
                >
                  {loading ? (
                    <ActivityIndicator color={yuanLight.bg} />
                  ) : (
                    <Text style={[yuanType.body, { color: yuanLight.bg, fontWeight: '600' }]}>
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
                  style={{ marginTop: yuanSpacing.md, alignItems: 'center', padding: 8 }}
                >
                  <Text style={[yuanType.caption, { color: yuanLight.textMuted }]}>
                    {t(locale, 'settings.email.changeEmail')}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
