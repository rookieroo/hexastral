/**
 * 登录页 — 品牌展示 + 认证入口
 *
 * ① Apple 登录：使用 AppleAuthenticationButton 官方组件
 *    — 样式由 iOS 系统渲染，颜色/字体/Apple Logo 均保证正确
 *    — 模拟器上 isAvailableAsync() = false，降级为自定义按钮
 * ② 访客体验（不保存记录）
 */

import * as AppleAuthentication from 'expo-apple-authentication'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BRAND_PHASE, HexastralPlanetLogo } from '@/components/branding/HexastralPlanetLogo'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

export default function LoginScreen() {
  const { colors, isDark } = useTheme()
  const { signInWithApple, signInWithGoogle, signInAsGuest } = useAuth()
  const { t } = useI18n()
  const router = useRouter()
  const [appleAvailable, setAppleAvailable] = useState(false)
  const [_appleLoading, setAppleLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable)
  }, [])

  const handleApple = async () => {
    setError(null)
    setAppleLoading(true)
    try {
      await signInWithApple()
      if (router.canGoBack()) router.back()
      else router.replace('/(tabs)')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code !== 'ERR_REQUEST_CANCELED') {
        setError(err instanceof Error ? err.message : t('error_try_again'))
      }
    } finally {
      setAppleLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      if (router.canGoBack()) router.back()
      else router.replace('/(tabs)')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code !== 'SIGN_IN_CANCELLED') {
        setError(err instanceof Error ? err.message : t('error_try_again'))
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleGuest = async () => {
    setError(null)
    setGuestLoading(true)
    try {
      await signInAsGuest()
      if (router.canGoBack()) router.back()
      else router.replace('/(tabs)')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error_try_again'))
      setGuestLoading(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 背景装饰 — 渐隐圆晕 */}
      <View
        pointerEvents='none'
        style={{
          position: 'absolute',
          top: -80,
          left: '50%',
          marginLeft: -200,
          width: 400,
          height: 400,
          borderRadius: 200,
          backgroundColor: isDark ? '#27272A20' : '#D4D4D810',
        }}
      />

      <View style={{ flex: 1, justifyContent: 'space-between', paddingHorizontal: 32 }}>
        {/* 品牌区 */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 0 }}>
          <HexastralPlanetLogo size={88} phase={BRAND_PHASE} />

          <View style={{ alignItems: 'center', marginTop: 24 }}>
            <Text
              style={{
                fontSize: 32,
                fontWeight: '200',
                color: colors.text,
                letterSpacing: 12,
                includeFontPadding: false,
              }}
            >
              HEXASTRAL
            </Text>
            {t('index_brand_cn') ? (
              <Text
                style={{
                  fontSize: 13,
                  color: colors.accent,
                  letterSpacing: 4,
                  marginTop: 6,
                }}
              >
                {t('index_brand_cn')}
              </Text>
            ) : null}
          </View>

          <View
            style={{
              width: 40,
              height: 1,
              backgroundColor: colors.accent,
              opacity: 0.4,
              marginTop: 24,
              marginBottom: 12,
            }}
          />

          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              textAlign: 'center',
              lineHeight: 20,
              letterSpacing: 0.3,
            }}
          >
            {t('index_tagline')}
          </Text>
        </View>

        {/* 操作区 */}
        <View style={{ paddingBottom: 16, gap: 12 }}>
          {/* DEV 快速跳过 — 只在开发构建中可见 */}
          {__DEV__ && (
            <Pressable
              onPress={handleGuest}
              style={({ pressed }) => ({
                alignSelf: 'flex-end',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 0,
                backgroundColor: isDark ? '#2A2A3A' : '#F0ECF8',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ fontSize: 11, color: colors.textSecondary, fontFamily: 'monospace' }}>
                DEV: skip
              </Text>
            </Pressable>
          )}
          {error ? (
            <Text style={{ color: '#EF4444', textAlign: 'center', fontSize: 13 }}>{error}</Text>
          ) : null}

          {/* Apple 官方按钮 — 样式由 iOS 系统保证，包含正确的 Apple Logo */}
          {appleAvailable ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={
                isDark
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={0}
              style={{ height: 54, width: '100%' }}
              onPress={handleApple}
            />
          ) : null}

          {/* Google 登录按钮 — iOS 上与 Apple 并列，Android 上唯一主登录方式 */}
          <Pressable
            onPress={handleGoogle}
            disabled={googleLoading}
            style={({ pressed }) => ({
              height: 54,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              borderRadius: 0,
              backgroundColor: isDark ? '#131314' : '#FFFFFF',
              borderWidth: 1,
              borderColor: isDark ? '#8E918F' : '#E4E4E7',
              opacity: pressed || googleLoading ? 0.7 : 1,
            })}
          >
            {/* Google 'G' logo — SVG path rendered as text approximation */}
            <Text style={{ fontSize: 18, color: '#4285F4', fontWeight: '700' }}>G</Text>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '500',
                color: isDark ? '#E3E3E3' : '#1F1F1F',
              }}
            >
              {googleLoading
                ? '…'
                : Platform.OS === 'android'
                  ? t('profile_sign_in_google')
                  : t('profile_sign_in_google')}
            </Text>
          </Pressable>

          {/* 访客 — 文字按钮，低优先级 */}
          <Button variant='ghost' size='sm' onPress={handleGuest} loading={guestLoading}>
            {t('profile_sign_in_guest')}
          </Button>

          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 11,
              textAlign: 'center',
              lineHeight: 16,
              paddingHorizontal: 8,
            }}
          >
            {t('terms_agree')}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}
