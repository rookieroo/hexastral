/**
 * SignInPromptSheet — bottom sheet wrapper around `SatelliteAppleAuth` +
 * `SatelliteGoogleAuth` so the unlock flow on Reading can pull up sign-in
 * inline, without bouncing the user to the Me tab.
 *
 * After `onAuthed` fires, the parent typically dismisses this sheet and
 * opens the next step (email bind / invite). The auth buttons themselves
 * are self-rendering — we just provide a themed container + i18n labels.
 */

import { SatelliteAppleAuth } from '@zhop/satellite-ui/SatelliteAppleAuth'
import { SatelliteGoogleAuth } from '@zhop/satellite-ui/SatelliteGoogleAuth'
import { useEffect, useState } from 'react'
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated'

import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { useI18n } from '@/lib/i18n'

const P = {
  card: '#16140F',
  cream: '#E9E2D2',
  muted: '#8A8170',
  hair: 'rgba(233,226,210,0.12)',
} as const

const EXIT_DURATION_MS = 240

export interface SignInPromptSheetProps {
  visible: boolean
  onClose: () => void
  /** Fired after auth succeeds — parent decides whether to proceed (bind/invite) or just close. */
  onAuthed: () => void
}

export function SignInPromptSheet({ visible, onClose, onAuthed }: SignInPromptSheetProps) {
  const { t } = useI18n()

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (visible) {
      setMounted(true)
    } else if (mounted) {
      const id = setTimeout(() => setMounted(false), EXIT_DURATION_MS)
      return () => clearTimeout(id)
    }
  }, [visible, mounted])

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
          <Animated.View
            entering={SlideInDown.duration(260)}
            exiting={SlideOutDown.duration(EXIT_DURATION_MS)}
            style={S.sheetWrap}
            pointerEvents='box-none'
          >
            <View style={S.sheet}>
              <View style={S.handle} />
              <Text style={S.title}>{t('signIn.title')}</Text>
              <Text style={S.hint}>{t('signIn.hint')}</Text>
              {Platform.OS === 'ios' ? (
                <SatelliteAppleAuth
                  storagePrefix={PORTFOLIO_STORAGE_PREFIX}
                  targetApp={PORTFOLIO_TARGET_APP}
                  continueLabel={t('me.appleContinue')}
                  loadingLabel={t('me.preparing')}
                  unavailableLabel={t('me.deviceUnavailable')}
                  onAuthed={onAuthed}
                />
              ) : null}
              <SatelliteGoogleAuth
                storagePrefix={PORTFOLIO_STORAGE_PREFIX}
                targetApp={PORTFOLIO_TARGET_APP}
                iosClientId={process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID}
                webClientId={process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID}
                continueLabel={t('me.googleContinue')}
                loadingLabel={t('me.preparing')}
                unavailableLabel={t('me.googleUnavailable')}
                onAuthed={onAuthed}
              />
            </View>
          </Animated.View>
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
    gap: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: P.hair,
    marginBottom: 12,
  },
  title: {
    color: P.cream,
    fontFamily: 'Songti SC',
    fontSize: 22,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  hint: { color: P.muted, fontSize: 12, lineHeight: 18, marginBottom: 12 },
})
