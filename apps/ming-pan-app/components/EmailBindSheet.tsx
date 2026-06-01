/**
 * EmailBindSheet — bottom-sheet two-step OTP flow for binding the user's email.
 *
 * Step 1: input email → POST /api/user/:id/email/request (via satellite-runtime
 * `requestEmailOtp`). Step 2: input 6-digit code → POST .../email/confirm. On
 * success surfaces `claimedChapterInvites` in the toast so the user knows
 * pending invites just credited them.
 *
 * Designed for the locked-chapter unlock flow on ReadingReport — when A taps
 * "invite a friend" and has no email yet, we route through this first.
 */

import { confirmEmailOtp, type EmailConfirmResult, requestEmailOtp } from '@zhop/satellite-runtime'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated'

import { useI18n } from '@/lib/i18n'

const P = {
  bgDark: '#0C0B0A',
  card: '#16140F',
  gold: '#C2A878',
  cream: '#E9E2D2',
  dim: '#5A5446',
  muted: '#8A8170',
  hair: 'rgba(233,226,210,0.12)',
  error: '#C25450',
  ctaText: '#f4ecdc',
} as const

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface EmailBindSheetProps {
  visible: boolean
  onClose: () => void
  /** Called after successful confirm; surfaces the bound email + claim counts. */
  onSuccess: (result: EmailConfirmResult) => void
}

type Step = 'email' | 'code'

// Match the SlideOutDown duration so the unmount lines up with the animation.
const EXIT_DURATION_MS = 240

export function EmailBindSheet({ visible, onClose, onSuccess }: EmailBindSheetProps) {
  const { t } = useI18n()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Two-phase mount: parent `visible` flips control logical visibility, but
  // we hold the Modal in the tree for `EXIT_DURATION_MS` so the SlideOutDown
  // animation actually plays before unmount. Without this the previous
  // implementation snapped closed without exit animation.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (visible) {
      setMounted(true)
      setStep('email')
      setEmail('')
      setCode('')
      setError(null)
      setBusy(false)
    } else if (mounted) {
      const t = setTimeout(() => setMounted(false), EXIT_DURATION_MS)
      return () => clearTimeout(t)
    }
  }, [visible, mounted])

  const sendCode = useCallback(async () => {
    const trimmed = email.trim().toLowerCase()
    if (!EMAIL_RE.test(trimmed)) {
      setError(t('email.invalid'))
      return
    }
    setBusy(true)
    setError(null)
    const ok = await requestEmailOtp(trimmed)
    setBusy(false)
    if (ok) {
      setEmail(trimmed)
      setStep('code')
    } else {
      setError(t('email.sendFailed'))
    }
  }, [email, t])

  const verifyCode = useCallback(async () => {
    if (!/^\d{6}$/.test(code)) {
      setError(t('email.codeFailed'))
      return
    }
    setBusy(true)
    setError(null)
    const result = await confirmEmailOtp(code)
    setBusy(false)
    if (result) {
      onSuccess(result)
    } else {
      setError(t('email.codeFailed'))
    }
  }, [code, onSuccess, t])

  const goBackToEmail = useCallback(() => {
    setStep('email')
    setCode('')
    setError(null)
  }, [])

  if (!mounted) return null

  return (
    <Modal
      visible
      animationType='none'
      presentationStyle='overFullScreen'
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Visible-toggle drives the entering/exiting animations on the children.
          The Modal itself stays mounted for EXIT_DURATION_MS so SlideOutDown
          can play without being torn down mid-animation. */}
      {visible ? (
        <>
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(EXIT_DURATION_MS)}
            style={S.backdrop}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          </Animated.View>
          {/* KeyboardAvoidingView wraps the sheet body specifically so the
              animated translate doesn't fight the keyboard offset. */}
          <KeyboardAvoidingView
            style={S.sheetWrap}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            pointerEvents='box-none'
          >
            <Animated.View
              entering={SlideInDown.duration(260)}
              exiting={SlideOutDown.duration(EXIT_DURATION_MS)}
              pointerEvents='box-none'
            >
              <View style={S.sheet}>
                <View style={S.handle} />
                <Text style={S.title}>{t('email.bindTitle')}</Text>
                <Text style={S.hint}>{t('email.bindHint')}</Text>

          {step === 'email' ? (
            <>
              <TextInput
                style={S.input}
                value={email}
                onChangeText={setEmail}
                placeholder={t('email.placeholder')}
                placeholderTextColor={P.dim}
                keyboardType='email-address'
                autoCapitalize='none'
                autoCorrect={false}
                autoComplete='email'
                editable={!busy}
              />
              {error ? <Text style={S.error}>{error}</Text> : null}
              <Pressable
                onPress={sendCode}
                disabled={busy || email.length === 0}
                style={({ pressed }) => [
                  S.cta,
                  (busy || email.length === 0) && S.ctaDisabled,
                  pressed && { opacity: 0.85 },
                ]}
              >
                {busy ? (
                  <ActivityIndicator color={P.ctaText} />
                ) : (
                  <Text style={S.ctaText}>{t('email.sendCode')}</Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <Text style={S.codeSent}>{t('email.codeSentTo', { email })}</Text>
              <TextInput
                style={S.input}
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                placeholder={t('email.codePlaceholder')}
                placeholderTextColor={P.dim}
                keyboardType='number-pad'
                maxLength={6}
                editable={!busy}
              />
              {error ? <Text style={S.error}>{error}</Text> : null}
              <Pressable
                onPress={verifyCode}
                disabled={busy || code.length !== 6}
                style={({ pressed }) => [
                  S.cta,
                  (busy || code.length !== 6) && S.ctaDisabled,
                  pressed && { opacity: 0.85 },
                ]}
              >
                {busy ? (
                  <ActivityIndicator color={P.ctaText} />
                ) : (
                  <Text style={S.ctaText}>{t('email.verify')}</Text>
                )}
              </Pressable>
              <Pressable onPress={goBackToEmail} hitSlop={8} style={S.resendBtn}>
                <Text style={S.resend}>{t('email.resend')}</Text>
              </Pressable>
            </>
          )}
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </>
      ) : null}
    </Modal>
  )
}

const S = StyleSheet.create({
  // Backdrop covers the whole screen; the sheet wrap is bottom-pinned and
  // hosts the KeyboardAvoidingView so the input stays visible above the
  // keyboard.
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: P.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 36,
    borderTopWidth: 0.5,
    borderTopColor: P.hair,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: P.hair,
    marginBottom: 16,
  },
  title: {
    color: P.cream,
    fontFamily: 'Songti SC',
    fontSize: 22,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  hint: { color: P.muted, fontSize: 12, lineHeight: 18, marginBottom: 20 },
  codeSent: { color: P.gold, fontSize: 11, letterSpacing: 1, marginBottom: 12 },
  input: {
    backgroundColor: P.bgDark,
    borderWidth: 0.5,
    borderColor: P.hair,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: P.cream,
    fontSize: 15,
    marginBottom: 8,
  },
  error: { color: P.error, fontSize: 12, marginBottom: 8 },
  cta: {
    marginTop: 12,
    backgroundColor: P.gold,
    paddingVertical: 14,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { backgroundColor: 'rgba(194,168,120,0.4)' },
  ctaText: { color: P.ctaText, fontSize: 13, fontWeight: '600', letterSpacing: 2.5 },
  resendBtn: { alignSelf: 'center', marginTop: 14 },
  resend: { color: P.gold, fontSize: 12, letterSpacing: 0.5 },
})
