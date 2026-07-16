/**
 * Settings — account, casting feel, coin skins, tools (Fēng / Yuel model).
 *
 * Full-screen stack route from home gear + left-swipe. Grouped cards with
 * nav rows; destructive actions as centered footer text.
 */

import { Toggle, useHaptic, useTheme } from '@zhop/core-ui'
import {
  deletePortfolioAccount,
  getPortfolioProfile,
  getPortfolioUserId,
  invalidatePortfolioSession,
  type PortfolioProfile,
  repairPortfolioCredentialMismatch,
} from '@zhop/satellite-runtime'
import { SatelliteAppleAuth } from '@zhop/satellite-ui'
import { useFocusEffect, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Check, ChevronRight } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { MeDevTools } from '@/components/MeDevTools'
import { LOGO_COIN_FACE } from '@/lib/coin-skin-assets'
import {
  DEFAULT_COIN_SKIN,
  type CoinSkinConfig,
  getCoinSkinConfig,
  invalidateCoinSkinMaterialCache,
  setCoinSkinConfig,
} from '@/lib/coin-skins'
import {
  deleteCustomCoinFaceUri,
  pickCustomCoinFaceUri,
} from '@/lib/coin-skin-upload'
import {
  getCastHapticsEnabled,
  getMotionShakeEnabled,
  setCastHapticsEnabled,
  setMotionShakeEnabled,
} from '@/lib/coincast-ritual'
import { fetchMemoryPreference, setPortfolioMemory } from '@/lib/memory-preference'
import {
  PORTFOLIO_STORAGE_PREFIX,
  PORTFOLIO_TARGET_APP,
  yaulPrivacyUrl,
  yaulTermsUrl,
} from '@/lib/growth-config'
import { useSatelliteI18n } from '@/lib/i18n'

type Session = 'loading' | 'out' | 'in'

function emailLocalPart(email: string): string {
  const at = email.indexOf('@')
  return at > 0 ? email.slice(0, at) : email
}

export default function CoinCastProfileScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const haptic = useHaptic()
  const { colors, spacing } = useTheme()
  const { t, uiLocale } = useSatelliteI18n()

  const [session, setSession] = useState<Session>('loading')
  const [profile, setProfile] = useState<PortfolioProfile | null>(null)
  const [motion, setMotion] = useState(true)
  const [haptics, setHaptics] = useState(true)
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const [skinConfig, setSkinConfig] = useState<CoinSkinConfig>(DEFAULT_COIN_SKIN)
  const [skinUploading, setSkinUploading] = useState(false)
  const [memoryEnabled, setMemoryEnabled] = useState(false)
  const [memorySaving, setMemorySaving] = useState(false)
  const [memoryLoaded, setMemoryLoaded] = useState(false)

  const cardStyle = {
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.separator,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
  } as const

  const refreshSession = useCallback(() => {
    setSession('loading')
    void (async () => {
      try {
        await repairPortfolioCredentialMismatch()
        const id = await getPortfolioUserId()
        if (id) {
          const p = await getPortfolioProfile()
          setProfile(p)
          setSession('in')
        } else {
          setProfile(null)
          setSession('out')
        }
      } catch (err) {
        console.warn('[coincast-profile] refreshSession failed', err)
        setProfile(null)
        setSession('out')
      }
    })()
  }, [])

  useFocusEffect(
    useCallback(() => {
      refreshSession()
      void (async () => {
        const [motionOn, hapticsOn, skin] = await Promise.all([
          getMotionShakeEnabled(),
          getCastHapticsEnabled(),
          getCoinSkinConfig(),
        ])
        setMotion(motionOn)
        setHaptics(hapticsOn)
        setSkinConfig(skin)
        setPrefsLoaded(true)
        const userId = await getPortfolioUserId()
        if (userId) {
          try {
            const mem = await fetchMemoryPreference()
            setMemoryEnabled(mem.enabled)
          } catch (err) {
            console.warn('[coincast-profile] memory pref load failed', err)
          }
        } else {
          setMemoryEnabled(false)
        }
        setMemoryLoaded(true)
      })()
    }, [refreshSession])
  )

  const navRow = (label: string, onPress: () => void, last?: boolean, value?: string | null) => (
    <Pressable
      onPress={() => {
        void haptic('light')
        onPress()
      }}
      accessibilityRole='button'
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: last ? 0 : 0.5,
        borderBottomColor: colors.separator,
        gap: spacing.sm,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 15 }}>{label}</Text>
      <View style={{ flex: 1 }} />
      {value ? (
        <Text numberOfLines={1} style={{ color: colors.dim, fontSize: 13, maxWidth: '50%' }}>
          {value}
        </Text>
      ) : null}
      <ChevronRight color={colors.dim} size={18} strokeWidth={1.6} />
    </Pressable>
  )

  const toggleRow = (
    label: string,
    hint: string | undefined,
    value: boolean,
    onToggle: (next: boolean) => void,
    opts?: { disabled?: boolean; saving?: boolean; last?: boolean }
  ) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: opts?.last ? 0 : 0.5,
        borderBottomColor: colors.separator,
        gap: spacing.md,
        opacity: opts?.disabled ? 0.55 : 1,
      }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: colors.text, fontSize: 15 }}>{label}</Text>
        {hint ? (
          <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 17 }}>{hint}</Text>
        ) : null}
      </View>
      {opts?.saving ? (
        <ActivityIndicator color={colors.secondary} />
      ) : (
        <Toggle
          value={value}
          onValueChange={onToggle}
          accent={colors.accent}
          disabled={opts?.disabled}
          accessibilityLabel={label}
        />
      )}
    </View>
  )

  const handleSignOut = () => {
    void haptic('light')
    Alert.alert(t('meSignOut'), t('profileSignOutConfirm'), [
      { text: t('settingsDeleteAccountCancel'), style: 'cancel' },
      {
        text: t('meSignOut'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await invalidatePortfolioSession()
            refreshSession()
          })()
        },
      },
    ])
  }

  const handleDeleteAccount = () => {
    void haptic('warning')
    Alert.alert(t('settingsDeleteAccountTitle'), t('settingsDeleteAccountBody'), [
      { text: t('settingsDeleteAccountCancel'), style: 'cancel' },
      {
        text: t('settingsDeleteAccountContinue'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const ok = await deletePortfolioAccount()
            if (!ok) {
              Alert.alert(t('settingsDeleteAccountTitle'), t('settingsDeleteAccountFailed'))
              return
            }
            refreshSession()
            router.back()
          })()
        },
      },
    ])
  }

  const creditsLabel =
    { en: 'Credits & sources', zh: '来源与致谢', 'zh-Hant': '來源與致謝', ja: 'クレジット' }[
      uiLocale as 'en' | 'zh' | 'zh-Hant' | 'ja'
    ] ?? 'Credits & sources'

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style='auto' />
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole='button'
          accessibilityLabel={t('navBack')}
          hitSlop={12}
        >
          <Text style={{ color: colors.accent, fontSize: 24 }}>‹</Text>
        </Pressable>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>
          {t('stackSettings')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          gap: spacing.lg,
        }}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        {/* Account */}
        <View style={[cardStyle, { paddingVertical: spacing.lg, gap: spacing.sm }]}>
          {session === 'loading' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ActivityIndicator color={colors.text} />
              <Text style={{ color: colors.secondary, fontSize: 14 }}>{t('meApplePreparing')}</Text>
            </View>
          ) : session === 'out' ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: colors.secondary, fontSize: 12, letterSpacing: 1 }}>
                {t('meSignInSectionTitle').toUpperCase()}
              </Text>
              <Text style={{ color: colors.text, fontSize: 15, lineHeight: 21 }}>
                {t('meSignInHint')}
              </Text>
              {Platform.OS === 'ios' ? (
                <SatelliteAppleAuth
                  storagePrefix={PORTFOLIO_STORAGE_PREFIX}
                  targetApp={PORTFOLIO_TARGET_APP}
                  continueLabel={t('meAppleContinue')}
                  loadingLabel={t('meApplePreparing')}
                  unavailableLabel={t('meAppleUnavailable')}
                  onAuthed={refreshSession}
                />
              ) : (
                <Text style={{ color: colors.secondary, fontSize: 13 }}>
                  {t('meSignInIosOnly')}
                </Text>
              )}
            </View>
          ) : (
            <View style={{ gap: 4 }}>
              <Text style={{ color: colors.secondary, fontSize: 12, letterSpacing: 1 }}>
                {t('settingsAccountAppleKind').toUpperCase()}
              </Text>
              {profile?.displayName ? (
                <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>
                  {profile.displayName}
                </Text>
              ) : profile?.email ? (
                <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>
                  {emailLocalPart(profile.email)}
                </Text>
              ) : (
                <Text style={{ color: colors.text, fontSize: 15 }}>
                  {t('settingsAccountSignedIn')}
                </Text>
              )}
              {profile?.displayName && profile?.email ? (
                <Text style={{ color: colors.secondary, fontSize: 14 }}>
                  {emailLocalPart(profile.email)}
                </Text>
              ) : null}
            </View>
          )}
        </View>

        {/* Tools */}
        <View style={cardStyle}>
          {navRow(t('meHistoryTitle'), () => router.push('/(tabs)/history'))}
          {navRow(t('meUpgrade'), () => router.push('/paywall'))}
          {navRow(t('restorePurchases'), () => router.push('/paywall'))}
          {navRow(
            t('mePrivacy'),
            () => void Linking.openURL(yaulPrivacyUrl(uiLocale))
          )}
          {navRow(
            t('meTerms'),
            () => void Linking.openURL(yaulTermsUrl(uiLocale))
          )}
          {navRow(creditsLabel, () => router.push('/credits'), true)}
        </View>

        {/* Casting & feel */}
        <View style={cardStyle}>
          <Text
            style={{
              color: colors.secondary,
              fontSize: 11,
              letterSpacing: 2,
              paddingTop: spacing.md,
              paddingBottom: spacing.xs,
            }}
          >
            {t('settingsSensorySection').toUpperCase()}
          </Text>
          {toggleRow(
            t('settingsMotionLabel'),
            t('settingsMotionHint'),
            motion,
            (next) => {
              setMotion(next)
              void setMotionShakeEnabled(next)
            },
            { disabled: !prefsLoaded }
          )}
          {toggleRow(
            t('settingsHapticsLabel'),
            t('settingsHapticsHint'),
            haptics,
            (next) => {
              setHaptics(next)
              void setCastHapticsEnabled(next)
            },
            { disabled: !prefsLoaded }
          )}
          {session === 'in'
            ? toggleRow(
                t('settingsMemoryLabel'),
                t('settingsMemoryHint'),
                memoryEnabled,
                (next) => {
                  setMemorySaving(true)
                  void (async () => {
                    try {
                      await setPortfolioMemory(next)
                      setMemoryEnabled(next)
                    } catch (err) {
                      console.warn('[coincast-profile] memory pref save failed', err)
                    } finally {
                      setMemorySaving(false)
                    }
                  })()
                },
                { disabled: !memoryLoaded, saving: memorySaving, last: true }
              )
            : toggleRow(
                t('settingsMemoryLabel'),
                t('settingsMemoryGuestHint'),
                false,
                () => {},
                { disabled: true, last: true }
              )}
        </View>

        {/* Coin skins — paper / seal */}
        <View style={[cardStyle, { paddingBottom: spacing.sm }]}>
          <Text
            style={{
              color: colors.secondary,
              fontSize: 11,
              letterSpacing: 2,
              paddingTop: spacing.md,
              paddingBottom: spacing.xs,
            }}
          >
            {t('settingsCoinSkinLabel').toUpperCase()}
          </Text>
          <Text
            style={{ color: colors.dim, fontSize: 12, lineHeight: 17, marginBottom: spacing.sm }}
          >
            {t('settingsCoinSkinHint')}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: spacing.md,
              borderBottomWidth: 0.5,
              borderBottomColor: colors.separator,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                borderWidth: 0.5,
                borderColor: colors.separator,
                backgroundColor: colors.bg,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Image
                source={
                  skinConfig.mode === 'custom' && skinConfig.customObverseUri
                    ? { uri: skinConfig.customObverseUri }
                    : LOGO_COIN_FACE
                }
                style={{ width: 44, height: 44 }}
                resizeMode='contain'
                accessibilityIgnoresInvertColors
              />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.text, fontSize: 15 }}>
                {skinConfig.mode === 'custom'
                  ? t('settingsCoinSkinCustomActive')
                  : t('settingsCoinSkinDefault')}
              </Text>
              <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 16 }}>
                {t('settingsCoinSkinUploadHint')}
              </Text>
            </View>
            {skinConfig.mode === 'logo' ? (
              <Check size={18} color={colors.accent} strokeWidth={2} />
            ) : null}
          </View>
          <Pressable
            onPress={() => {
              void haptic('light')
              void (async () => {
                setSkinUploading(true)
                try {
                  const uri = await pickCustomCoinFaceUri()
                  if (!uri) return
                  if (skinConfig.customObverseUri) {
                    await deleteCustomCoinFaceUri(skinConfig.customObverseUri)
                  }
                  const next: CoinSkinConfig = { mode: 'custom', customObverseUri: uri }
                  invalidateCoinSkinMaterialCache()
                  setSkinConfig(next)
                  await setCoinSkinConfig(next)
                } finally {
                  setSkinUploading(false)
                }
              })()
            }}
            disabled={skinUploading}
            accessibilityRole='button'
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: spacing.md,
              borderBottomWidth: 0.5,
              borderBottomColor: colors.separator,
              opacity: skinUploading ? 0.5 : 1,
            }}
          >
            <Text style={{ flex: 1, color: colors.text, fontSize: 15 }}>
              {skinUploading ? t('settingsCoinSkinUploading') : t('settingsCoinSkinUpload')}
            </Text>
            {skinUploading ? (
              <ActivityIndicator size='small' color={colors.accent} />
            ) : (
              <ChevronRight size={18} color={colors.dim} strokeWidth={2} />
            )}
          </Pressable>
          {skinConfig.mode === 'custom' ? (
            <Pressable
              onPress={() => {
                void haptic('light')
                void (async () => {
                  await deleteCustomCoinFaceUri(skinConfig.customObverseUri)
                  invalidateCoinSkinMaterialCache()
                  setSkinConfig(DEFAULT_COIN_SKIN)
                  await setCoinSkinConfig(DEFAULT_COIN_SKIN)
                })()
              }}
              accessibilityRole='button'
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: spacing.md,
              }}
            >
              <Text style={{ flex: 1, color: colors.accent, fontSize: 15 }}>
                {t('settingsCoinSkinReset')}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {__DEV__ ? (
          <View style={[cardStyle, { paddingVertical: spacing.md }]}>
            <Text
              style={{
                color: colors.accent,
                fontSize: 11,
                letterSpacing: 2,
                paddingBottom: spacing.sm,
              }}
            >
              DEV
            </Text>
            <MeDevTools />
          </View>
        ) : null}

        {session === 'in' ? (
          <View style={{ alignItems: 'center', gap: spacing.md, marginTop: spacing.md }}>
            <Pressable onPress={handleSignOut} accessibilityRole='button' hitSlop={8}>
              <Text style={{ color: colors.secondary, fontSize: 14 }}>{t('meSignOut')}</Text>
            </Pressable>
            <Pressable onPress={handleDeleteAccount} accessibilityRole='button' hitSlop={8}>
              <Text style={{ color: '#c44a3a', fontSize: 13 }}>{t('settingsDeleteAccount')}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  )
}
