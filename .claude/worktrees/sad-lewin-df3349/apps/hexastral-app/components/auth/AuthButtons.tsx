/**
 * AuthButtons — shared Apple / Google / Guest login buttons
 *
 * Used by:
 *  - onboarding AuthStep
 *  - standalone LoginScreen
 *  - AuthGateModal
 */

import * as AppleAuthentication from 'expo-apple-authentication'
import { useEffect, useState } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { BRAND_PHASE, HexastralPlanetLogo } from '@/components/branding/HexastralPlanetLogo'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

interface AuthButtonsProps {
  onApple: () => void
  onGoogle: () => void
  onGuest: () => void
  /**
   * Which button is currently in a loading state.
   * Each button only shows its own loading indicator — not a shared spinner.
   */
  loadingType?: 'apple' | 'google' | 'guest' | null
  showGuest?: boolean
  /** Show the Apple Sign-In button. Defaults to auto-detect via isAvailableAsync. */
  appleAvailable?: boolean
  /**
   * Show the brand logo + headline + hint above the buttons.
   * Set to false when the parent already renders its own header (e.g. onboarding AuthStep).
   * Defaults to true.
   */
  showBranding?: boolean
}

export function AuthButtons({
  onApple,
  onGoogle,
  onGuest,
  loadingType = null,
  showGuest = true,
  appleAvailable: appleAvailableProp,
  showBranding = true,
}: AuthButtonsProps) {
  const { colors, isDark } = useTheme()
  const { t } = useI18n()
  const [appleAvailable, setAppleAvailable] = useState(appleAvailableProp ?? false)

  useEffect(() => {
    if (appleAvailableProp !== undefined) return
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable)
  }, [appleAvailableProp])

  const ios = {
    tint: isDark ? '#FAFAFA' : '#18181B',
    tintFg: isDark ? '#18181B' : '#FFFFFF',
    separator: isDark ? '#27272A' : '#E4E4E7',
    text: isDark ? '#FAFAFA' : '#09090B',
    secondary: isDark ? '#A1A1AA' : '#71717A',
    // Dark: outlined (zinc-800 bg + zinc-100 text) to contrast Apple's solid-white
    // Light: outlined (white bg + zinc-200 border + zinc-900 text) to contrast Apple's solid-black
    googleBg: isDark ? '#27272A' : '#FFFFFF',
    googleBorder: isDark ? '#52525B' : '#E4E4E7',
    googleText: isDark ? '#FAFAFA' : '#1F1F1F',
  }

  return (
    <View style={{ gap: 10 }}>
      {/* Brand badge + headline — hidden when parent owns the header */}
      {showBranding && (
        <>
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <HexastralPlanetLogo size={52} phase={BRAND_PHASE} withBackground />
          </View>

          <Text
            style={{
              fontSize: 17,
              fontWeight: '500',
              color: ios.text,
              textAlign: 'center',
              marginBottom: 4,
            }}
          >
            {t('ob_auth_q')}
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '300',
              color: ios.secondary,
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            {t('ob_auth_hint')}
          </Text>
        </>
      )}

      {/* Apple Sign-In */}
      {appleAvailable && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={
            isDark
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={0}
          style={{ height: 54, width: '100%', opacity: loadingType !== null ? 0.6 : 1 }}
          onPress={loadingType !== null ? () => {} : onApple}
        />
      )}

      {/* Google Sign-In — both platforms */}
      <TouchableOpacity
        onPress={onGoogle}
        disabled={loadingType !== null}
        activeOpacity={0.7}
        style={{
          height: 54,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          borderRadius: 0,
          backgroundColor: ios.googleBg,
          borderWidth: 1,
          borderColor: ios.googleBorder,
          opacity: loadingType !== null ? 0.6 : 1,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700', color: ios.googleText }}>G</Text>
        <Text style={{ fontSize: 16, fontWeight: '500', color: ios.googleText }}>
          {loadingType === 'google' ? t('ob_auth_loading') : t('ob_auth_google')}
        </Text>
      </TouchableOpacity>

      {/* Guest option */}
      {showGuest && (
        <>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: 8,
            }}
          >
            <View style={{ flex: 1, height: 0.5, backgroundColor: ios.separator }} />
            <Text style={{ fontSize: 10, letterSpacing: 2, color: ios.secondary }}>OR</Text>
            <View style={{ flex: 1, height: 0.5, backgroundColor: ios.separator }} />
          </View>

          <TouchableOpacity
            onPress={onGuest}
            disabled={loadingType !== null}
            activeOpacity={0.6}
            style={{ alignItems: 'center', paddingVertical: 10 }}
          >
            <Text style={{ fontSize: 13, color: ios.secondary }}>
              {loadingType === 'guest' ? t('ob_auth_loading') : t('ob_auth_guest')}
            </Text>
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 10,
              color: `${ios.secondary}88`,
              textAlign: 'center',
              lineHeight: 15,
              paddingHorizontal: 8,
            }}
          >
            {t('ob_auth_guest_note')}
          </Text>
        </>
      )}
    </View>
  )
}
