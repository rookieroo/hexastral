/**
 * InviteUnlockSheet — bottom-sheet for sending a chapter-unlock invite.
 *
 * Calls `inviteChapterUnlock` (satellite-runtime). The error union from the
 * helper maps 1:1 to localised messages so the user always sees something
 * actionable (e.g. "this email is already pending" vs generic "invalid").
 * On success the sheet flips to a confirmation state and surfaces the target
 * email — the parent decides when to dismiss.
 */

import { type InviteChapterUnlockError, inviteChapterUnlock } from '@zhop/satellite-runtime'
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

import { type StringKey, useI18n } from '@/lib/i18n'

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

const ERR_KEY: Record<InviteChapterUnlockError, StringKey> = {
  duplicate: 'invite.errDuplicate',
  at_cap: 'invite.errAtCap',
  self_invite: 'invite.errSelf',
  invalid: 'invite.errInvalid',
  mailer_failed: 'invite.errMailer',
  no_email: 'email.bindHint',
  network: 'invite.errMailer',
  unauthed: 'invite.errMailer',
}

export interface InviteUnlockSheetProps {
  visible: boolean
  onClose: () => void
  /** Called after the invite is accepted by the server (pending row written). */
  onSent: (targetEmail: string) => void
}

type Phase = 'compose' | 'sent'

const EXIT_DURATION_MS = 240

export function InviteUnlockSheet({ visible, onClose, onSent }: InviteUnlockSheetProps) {
  const { t } = useI18n()
  const [targetEmail, setTargetEmail] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('compose')

  // Two-phase mount: keep the Modal in the tree for EXIT_DURATION_MS after
  // `visible` flips false so SlideOutDown can play. Without this the previous
  // implementation snapped closed without exit animation.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (visible) {
      setMounted(true)
      setTargetEmail('')
      setMessage('')
      setBusy(false)
      setError(null)
      setPhase('compose')
    } else if (mounted) {
      const t = setTimeout(() => setMounted(false), EXIT_DURATION_MS)
      return () => clearTimeout(t)
    }
  }, [visible, mounted])

  const send = useCallback(async () => {
    const trimmed = targetEmail.trim().toLowerCase()
    if (!EMAIL_RE.test(trimmed)) {
      setError(t('invite.errInvalid'))
      return
    }
    setBusy(true)
    setError(null)
    const result = await inviteChapterUnlock({
      targetEmail: trimmed,
      message: message.trim() || undefined,
    })
    setBusy(false)
    if (result.ok) {
      onSent(trimmed)
      setPhase('sent')
    } else {
      setError(t(ERR_KEY[result.error]))
    }
  }, [targetEmail, message, onSent, t])

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
      {visible ? (
        <>
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(EXIT_DURATION_MS)}
            style={S.backdrop}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          </Animated.View>
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
                {phase === 'compose' ? (
                  <>
                    <Text style={S.title}>{t('invite.title')}</Text>
                    <Text style={S.hint}>{t('invite.hint')}</Text>
                    <TextInput
                      style={S.input}
                      value={targetEmail}
                      onChangeText={setTargetEmail}
                      placeholder={t('invite.targetEmailPlaceholder')}
                      placeholderTextColor={P.dim}
                      keyboardType='email-address'
                      autoCapitalize='none'
                      autoCorrect={false}
                      autoComplete='email'
                      editable={!busy}
                    />
                    <TextInput
                      style={[S.input, S.message]}
                      value={message}
                      onChangeText={setMessage}
                      placeholder={t('invite.messagePlaceholder')}
                      placeholderTextColor={P.dim}
                      multiline
                      maxLength={280}
                      editable={!busy}
                    />
                    {error ? <Text style={S.error}>{error}</Text> : null}
                    <Pressable
                      onPress={send}
                      disabled={busy || targetEmail.length === 0}
                      style={({ pressed }) => [
                        S.cta,
                        (busy || targetEmail.length === 0) && S.ctaDisabled,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      {busy ? (
                        <ActivityIndicator color={P.ctaText} />
                      ) : (
                        <Text style={S.ctaText}>{t('invite.send')}</Text>
                      )}
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={S.title}>{t('invite.sentTitle')}</Text>
                    <Text style={S.hint}>{t('invite.sentBody', { email: targetEmail })}</Text>
                    <Pressable
                      onPress={onClose}
                      style={({ pressed }) => [S.cta, pressed && { opacity: 0.85 }]}
                    >
                      <Text style={S.ctaText}>{t('common.cancel')}</Text>
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
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
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
  input: {
    backgroundColor: P.bgDark,
    borderWidth: 0.5,
    borderColor: P.hair,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: P.cream,
    fontSize: 15,
    marginBottom: 12,
  },
  message: { minHeight: 60, textAlignVertical: 'top' },
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
})
