/**
 * EmailVerifyModal
 *
 * 两步底部弹窗：
 *   Step 1 — 输入邮箱 → 发送验证码
 *   Step 2 — 输入 6 位数字验证码 → 确认绑定
 *
 * Props:
 *   visible      – 是否显示
 *   userId       – 当前用户 ID
 *   currentEmail – 已绑定邮箱（用于预填）
 *   onSuccess    – 验证成功回调，参数为已验证的邮箱地址
 *   onClose      – 关闭弹窗回调
 */

import { useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native'
import { config } from '@/lib/config'
import { useI18n } from '@/lib/i18n'
import { theme } from '@/lib/theme'

interface EmailVerifyModalProps {
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
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = isDark ? theme.dark : theme.light
  const { t } = useI18n()

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
      setError(t('settings_email_invalid'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${config.apiUrl}/api/user/${userId}/email/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = (await res.json()) as { message?: string }
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
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${config.apiUrl}/api/user/${userId}/email/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const json = (await res.json()) as { message?: string }
      if (!res.ok) {
        setError(json.message ?? t('settings_email_code_error'))
        return
      }
      onSuccess(email)
      resetAndClose()
    } catch {
      setError(t('settings_email_code_error'))
    } finally {
      setLoading(false)
    }
  }

  const sheetBg = isDark ? '#18181B' : '#FFFFFF'
  const handleBg = isDark ? '#52525B' : '#A1A1AA'
  const inputBorderColor = (hasError: boolean) =>
    hasError ? '#ef4444' : isDark ? '#3F3F46' : '#D4D4D8'

  return (
    <Modal visible={visible} transparent animationType='slide' statusBarTranslucent>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
        onPress={resetAndClose}
      >
        {/* Sheet — intercept inner touches */}
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: sheetBg,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: 40,
          }}
        >
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: handleBg }} />
          </View>

          <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: '500', color: colors.text, marginBottom: 4 }}>
              {t('settings_email_verify_title')}
            </Text>

            {step === 'email' ? (
              <>
                <TextInput
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v)
                    setError(null)
                  }}
                  placeholder={t('settings_email_input_placeholder')}
                  placeholderTextColor={`${colors.textSecondary}60`}
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
                    color: colors.text,
                    marginTop: 16,
                  }}
                />
                {error ? (
                  <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>{error}</Text>
                ) : null}
                <Pressable
                  onPress={requestCode}
                  disabled={loading}
                  style={{
                    marginTop: 20,
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
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 8 }}>
                  {t('settings_email_code_sent')} {email}
                </Text>
                <TextInput
                  value={code}
                  onChangeText={(v) => {
                    setCode(v.replace(/\D/g, ''))
                    setError(null)
                  }}
                  placeholder='000000'
                  placeholderTextColor={`${colors.textSecondary}40`}
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
                    color: colors.text,
                    marginTop: 20,
                    letterSpacing: 10,
                    textAlign: 'center',
                  }}
                />
                {error ? (
                  <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>{error}</Text>
                ) : null}
                <Pressable
                  onPress={confirmCode}
                  disabled={loading || code.length !== 6}
                  style={{
                    marginTop: 20,
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
                  style={{ marginTop: 12, alignItems: 'center', padding: 8 }}
                >
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                    {t('settings_email_resend')}
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
