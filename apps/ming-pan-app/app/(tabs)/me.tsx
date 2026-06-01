/**
 * "我" tab — profile, chart data, engagement, settings.
 *
 * Contains: birth info, 命盘速览 (chart appendix), account (Apple Sign-In),
 * flagship upsell, and dev tools. All on dark bg matching the FLIP aesthetic.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { BackArrowIcon, ChevronDownIcon, ChevronRightIcon } from '@zhop/hexastral-icons/action'
import {
  checkPortfolioUsernameAvailable,
  clearLocalBirthDraft,
  clearPortfolioUserId,
  deletePortfolioAccount,
  getLocalBirthDraft,
  getPortfolioProfile,
  getPortfolioUserId,
  invalidatePortfolioSession,
  type LocalBirthDraft,
  type PortfolioProfile,
  repairPortfolioCredentialMismatch,
  saveAndCacheBirthInfo,
  unbindUserEmail,
  updatePortfolioProfile,
} from '@zhop/satellite-runtime'
import { BaseSharePoster } from '@zhop/portfolio-posters'
import { captureAndSharePoster } from '@zhop/satellite-ui'
import { SatelliteAppleAuth } from '@zhop/satellite-ui/SatelliteAppleAuth'
import { SatelliteGoogleAuth } from '@zhop/satellite-ui/SatelliteGoogleAuth'
import * as Linking from 'expo-linking'
import { Link, useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ChartAppendix } from '@/components/ChartAppendix'
import { EmailBindSheet } from '@/components/EmailBindSheet'
import { FlagshipUpsell } from '@/components/FlagshipUpsell'
import { setEntitlement, useEntitlement } from '@/lib/entitlement'
import {
  HEXASTRAL_PROFILE_URL,
  HEXASTRAL_WEB_URL,
  PORTFOLIO_STORAGE_PREFIX,
  PORTFOLIO_TARGET_APP,
} from '@/lib/growth-config'
import { ALL_LOCALES, genderLabel, LOCALE_LABELS, shichenLabel, useI18n } from '@/lib/i18n'
import { computeFateNatalChart } from '@/lib/natal'
import { computeDayunChain, computeWuxingCount, maxWuxing, parseBirthInput } from '@/lib/reading'
import { clearReadingMark, useReadingMark } from '@/lib/reading-mark'
import { useAppTheme } from '@/lib/theme'
import { useBirthDraft } from '@/lib/use-birth-draft'
import { useEditBirth } from '@/lib/use-edit-birth'
import { computeZiweiChart } from '@/lib/ziwei'

type Session = 'loading' | 'in' | 'out'

/**
 * AsyncStorage key for the last successfully synced birth-info fingerprint.
 * Lets the "Synced ✓" affordance survive tab navigation: hydrate on mount and
 * on draft change, set on successful sync. Cleared implicitly when the draft
 * fingerprint changes (the comparison just fails).
 */
const SYNCED_DRAFT_KEY = 'fate.lastSyncedDraft'

function fingerprintDraft(d: LocalBirthDraft | null): string | null {
  if (!d || d.timeIndex == null) return null
  return `${d.solarDate}|${d.timeIndex}|${d.gender}`
}

export default function FateMeScreen() {
  const { colors } = useAppTheme()
  const router = useRouter()
  const state = useBirthDraft()
  const [session, setSession] = useState<Session>('loading')
  const [draft, setDraft] = useState<LocalBirthDraft | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced] = useState(false)

  /* ── public profile (username + chartPublic for hexastral.com/u/<slug>) ── */
  const [profile, setProfile] = useState<PortfolioProfile | null>(null)
  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameDraft, setUsernameDraft] = useState('')
  const [usernameCheck, setUsernameCheck] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const { entitlement, refresh: refreshEntitlement } = useEntitlement()
  const { viewedAt, refresh: refreshMark } = useReadingMark()

  /* ── locale ── */
  const { locale, setLocale, t } = useI18n()
  const cycleLocale = useCallback(() => {
    const idx = ALL_LOCALES.indexOf(locale)
    setLocale(ALL_LOCALES[(idx + 1) % ALL_LOCALES.length] ?? 'en')
  }, [locale, setLocale])

  const shareApp = useCallback(async () => {
    const message = t('share.message')
    try {
      await Share.share(
        Platform.OS === 'ios'
          ? { message, url: HEXASTRAL_WEB_URL }
          : { message: `${message}\n${HEXASTRAL_WEB_URL}` }
      )
    } catch {
      // share sheet dismissed — no-op
    }
  }, [t])

  /* ── 生态 disclosure — collapsed by default so the funnel never feels pushy ── */
  const [ecoOpen, setEcoOpen] = useState(false)
  const ecoRotation = useSharedValue(0)
  const toggleEco = useCallback(() => {
    const next = !ecoOpen
    setEcoOpen(next)
    ecoRotation.value = withTiming(next ? 180 : 0, { duration: 250 })
  }, [ecoOpen, ecoRotation])
  const ecoChevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ecoRotation.value}deg` }],
  }))

  const refresh = useCallback(() => {
    void (async () => {
      setDraft(await getLocalBirthDraft(PORTFOLIO_STORAGE_PREFIX))
      try {
        await repairPortfolioCredentialMismatch()
        const id = await getPortfolioUserId()
        setSession(id ? 'in' : 'out')
        if (id) {
          const p = await getPortfolioProfile()
          setProfile(p)
        } else {
          setProfile(null)
        }
      } catch {
        setSession('out')
        setProfile(null)
      }
    })()
  }, [])

  /* ── profile callbacks ── */
  const startEditUsername = useCallback(() => {
    setUsernameDraft(profile?.username ?? '')
    setUsernameCheck('idle')
    setProfileError(null)
    setEditingUsername(true)
  }, [profile])

  const cancelEditUsername = useCallback(() => {
    setEditingUsername(false)
    setUsernameDraft('')
    setUsernameCheck('idle')
  }, [])

  const saveUsername = useCallback(async () => {
    const trimmed = usernameDraft.trim().toLowerCase()
    if (usernameCheck !== 'available' || !trimmed) return
    if (trimmed === profile?.username) {
      setEditingUsername(false)
      return
    }
    setProfileSaving(true)
    setProfileError(null)
    try {
      const next = await updatePortfolioProfile({ username: trimmed })
      setProfile(next)
      setEditingUsername(false)
      setUsernameDraft('')
      setUsernameCheck('idle')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setProfileError(`${t('me.profileErrorPrefix')}${msg}`)
    } finally {
      setProfileSaving(false)
    }
  }, [usernameDraft, usernameCheck, profile, t])

  const toggleChartPublic = useCallback(
    async (next: boolean) => {
      if (!profile) return
      setProfileSaving(true)
      setProfileError(null)
      try {
        const updated = await updatePortfolioProfile({ chartPublic: next })
        setProfile(updated)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setProfileError(`${t('me.profileErrorPrefix')}${msg}`)
      } finally {
        setProfileSaving(false)
      }
    },
    [profile, t]
  )

  // P1-13 — Share-poster image pipeline. Renders a hidden 360×640 poster
  // off-screen, captures via view-shot, posts to native Share. Falls back to
  // plain text+url share on capture failure or platforms without image
  // support. Recipient scans the QR code → P1-15 Universal Links opens the
  // /u/{username} profile directly in their app (closes the viral loop).
  const posterRef = useRef<View>(null)
  const shareProfile = useCallback(async () => {
    if (!profile?.username || !profile.chartPublic) return
    const url = `${HEXASTRAL_PROFILE_URL}/u/${profile.username}`
    const message = t('share.profileMessage')
    await captureAndSharePoster({
      posterRef,
      message,
      fallbackUrl: url,
    })
  }, [profile, t])

  /* ── debounced username availability check while editing ── */
  useEffect(() => {
    if (!editingUsername) return
    const draft = usernameDraft.trim().toLowerCase()
    if (!draft) {
      setUsernameCheck('idle')
      return
    }
    if (profile && draft === profile.username) {
      setUsernameCheck('available')
      return
    }
    if (draft.length < 2 || draft.length > 30 || !/^[a-z0-9_]+$/.test(draft)) {
      setUsernameCheck('invalid')
      return
    }
    setUsernameCheck('checking')
    const id = setTimeout(async () => {
      const result = await checkPortfolioUsernameAvailable(draft)
      setUsernameCheck(
        result.available ? 'available' : result.reason === 'invalid' ? 'invalid' : 'taken'
      )
    }, 400)
    return () => clearTimeout(id)
  }, [editingUsername, usernameDraft, profile])

  const { canEdit, willVoid, lockReason, editBirth, refresh: refreshEditGate } = useEditBirth()
  const [bindSheetOpen, setBindSheetOpen] = useState(false)

  const signOut = useCallback(() => {
    Alert.alert(t('me.signOutTitle'), t('me.signOutBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('me.signOutContinue'),
        style: 'destructive',
        onPress: async () => {
          // Clear local credentials + invalidate the session token so signed
          // requests fail-closed. AsyncStorage birth-draft etc. stay intact —
          // anonymous tier still works after sign-out.
          await invalidatePortfolioSession().catch(() => {})
          await clearPortfolioUserId().catch(() => {})
          refresh()
          void refreshEditGate()
        },
      },
    ])
  }, [refresh, refreshEditGate, t])

  const unbindEmail = useCallback(() => {
    Alert.alert(t('me.unbindEmailTitle'), t('me.unbindEmailBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('me.unbindEmailContinue'),
        style: 'destructive',
        onPress: async () => {
          await unbindUserEmail()
          refresh()
          void refreshEditGate()
        },
      },
    ])
  }, [refresh, refreshEditGate, t])

  const deleteAccount = useCallback(() => {
    Alert.alert(t('me.deleteAccountTitle'), t('me.deleteAccountBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('me.deleteAccountContinue'),
        style: 'destructive',
        onPress: async () => {
          const ok = await deletePortfolioAccount()
          if (!ok) {
            Alert.alert(t('me.deleteAccountTitle'), t('me.deleteAccountFailed'))
            return
          }
          // Server + local credentials gone — route back to onboarding so the
          // user starts fresh on this device (no reinstall needed).
          await clearLocalBirthDraft(PORTFOLIO_STORAGE_PREFIX).catch(() => {})
          refresh()
          router.replace('/birth?mode=onboarding')
        },
      },
    ])
  }, [refresh, router, t])

  // Map app locale → privacy / terms URL locale segment (hexastral-web uses
  // zh / tw / en / ja / ko in its [locale] route).
  const legalLocale: 'zh' | 'tw' | 'ja' | 'en' =
    locale === 'zh-Hans' ? 'zh' : locale === 'zh-Hant' ? 'tw' : locale === 'ja' ? 'ja' : 'en'
  const openPrivacy = useCallback(() => {
    void Linking.openURL(`${HEXASTRAL_WEB_URL}/${legalLocale}/privacy`)
  }, [legalLocale])
  const openTerms = useCallback(() => {
    void Linking.openURL(`${HEXASTRAL_WEB_URL}/${legalLocale}/terms`)
  }, [legalLocale])

  useFocusEffect(
    useCallback(() => {
      refresh()
      // Also re-evaluate the birth-edit gate — manifest may have changed
      // since the user last visited this tab (e.g. they signed in elsewhere,
      // or a pending invite redeemed and reset entitlement-derived state).
      void refreshEditGate()
    }, [refresh, refreshEditGate])
  )

  /* ── chart computation for appendix ── */
  const chart = useMemo(() => {
    if (state.status !== 'ready') return null
    try {
      return computeFateNatalChart({
        solarDate: state.draft.solarDate,
        timeIndex: state.draft.timeIndex ?? 0,
        gender: state.draft.gender,
      })
    } catch {
      return null
    }
  }, [state])

  const ziwei = useMemo(() => {
    if (state.status !== 'ready') return null
    try {
      return computeZiweiChart({
        solarDate: state.draft.solarDate,
        timeIndex: state.draft.timeIndex ?? 0,
        gender: state.draft.gender,
      })
    } catch {
      return null
    }
  }, [state])

  const derivation = useMemo(() => {
    if (!chart || state.status !== 'ready') return null
    try {
      const bd = parseBirthInput(state.draft.solarDate, state.draft.timeIndex ?? 0)
      const wuxingCount = computeWuxingCount(chart.pillars)
      const mElem = maxWuxing(wuxingCount)
      const yElem = chart.geju.favorableElement
      const { steps } = computeDayunChain(bd, state.draft.gender)
      return { wuxingCount, maxElem: mElem, yongElem: yElem, steps }
    } catch {
      return null
    }
  }, [chart, state])

  /* ── sync state persistence ── */
  // Hydrate `synced` from AsyncStorage so the "Synced ✓" label survives a tab
  // round-trip. Re-runs whenever the draft fingerprint changes — editing birth
  // info implicitly invalidates the prior sync.
  const draftFingerprint = useMemo(() => fingerprintDraft(draft), [draft])
  useEffect(() => {
    if (!draftFingerprint) {
      setSynced(false)
      return
    }
    let cancelled = false
    void AsyncStorage.getItem(SYNCED_DRAFT_KEY)
      .then((stored) => {
        if (!cancelled) setSynced(stored === draftFingerprint)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [draftFingerprint])

  /* ── callbacks ── */
  const syncBirth = useCallback(async () => {
    if (!draft || draft.timeIndex == null) return
    const fp = fingerprintDraft(draft)
    setSyncing(true)
    try {
      await saveAndCacheBirthInfo({
        birthSolarDate: draft.solarDate,
        birthTimeIndex: draft.timeIndex,
        gender: draft.gender,
      })
      if (fp) await AsyncStorage.setItem(SYNCED_DRAFT_KEY, fp).catch(() => {})
      setSynced(true)
    } catch (err) {
      console.warn('[fate-me] birth sync failed', err)
    } finally {
      setSyncing(false)
    }
  }, [draft])


  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back()
    else router.replace('/(tabs)')
  }, [router])

  const devRestartOnboarding = useCallback(() => {
    Alert.alert('DEV', '清除本地生辰 + 批注,回到首次启动状态。', [
      { text: '取消', style: 'cancel' },
      {
        text: '继续',
        style: 'destructive',
        onPress: async () => {
          await clearLocalBirthDraft(PORTFOLIO_STORAGE_PREFIX)
          await clearReadingMark()
          await refreshMark()
          refresh()
          router.replace('/birth?mode=onboarding')
        },
      },
    ])
  }, [refresh, refreshMark, router])

  const devToggleEntitlement = useCallback(async () => {
    const next = entitlement === 'paid' ? 'free' : 'paid'
    await setEntitlement(next)
    await refreshEntitlement()
  }, [entitlement, refreshEntitlement])

  const devClearReadingMark = useCallback(async () => {
    await clearReadingMark()
    await refreshMark()
  }, [refreshMark])

  /* ── render ── */
  const card = { backgroundColor: colors.card, borderColor: colors.separator }
  const birthLine = draft
    ? `${draft.solarDate} · ${
        draft.timeIndex == null ? t('birth.timeUnknown') : shichenLabel(draft.timeIndex, locale)
      } · ${genderLabel(draft.gender, locale)}`
    : t('me.noBirth')

  return (
    <SafeAreaView style={[S.root, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* P1-13 — Hidden share-poster. Rendered off-screen (left: -9999) so
          it's part of the React tree (view-shot needs a mounted, laid-out
          View) but invisible to the user. collapsable={false} is required
          on Android — without it RN may flatten and capture nothing. */}
      <View
        ref={posterRef}
        collapsable={false}
        style={{ position: 'absolute', left: -9999, top: 0 }}
        pointerEvents='none'
      >
        <BaseSharePoster
          title={
            profile?.username
              ? `${profile.displayName ?? profile.username}`
              : t('share.profileMessage')
          }
          subtitle={t('me.chartCard')}
          shareUrl={
            profile?.username
              ? `${HEXASTRAL_PROFILE_URL}/u/${profile.username}`
              : HEXASTRAL_WEB_URL
          }
        />
      </View>

      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={goBack}
          hitSlop={10}
          accessibilityRole='button'
          accessibilityLabel={t('common.back')}
          style={S.backBtn}
        >
          <BackArrowIcon size={24} color={colors.text} />
        </Pressable>

        {/* 命盘 */}
        <View style={[S.card, card]}>
          <Text style={[S.cardTitle, { color: colors.secondary }]}>{t('me.chartCard')}</Text>
          <Text style={[S.cardBody, { color: colors.text }]}>{birthLine}</Text>
          {canEdit ? (
            <Pressable onPress={editBirth} hitSlop={8}>
              <Text style={[S.link, { color: colors.accent }]}>
                {draft ? t('me.editBirth') : t('me.addBirth')}
                {willVoid ? t('me.voidSuffix') : ''}
              </Text>
            </Pressable>
          ) : (
            <>
              <Text style={[S.locked, { color: colors.dim }]}>
                {lockReason === 'sign_in_required' ? t('me.lockedSignIn') : t('me.locked')}
              </Text>
              <Text style={[S.hint, { color: colors.dim }]}>
                {lockReason === 'sign_in_required' ? t('me.lockedSignInHint') : t('me.lockedHint')}
              </Text>
            </>
          )}
        </View>

        {/* 命盘速览 — chart data (八字 + 紫微) */}
        {chart && derivation ? (
          <View style={[S.card, card]}>
            <ChartAppendix
              chart={chart}
              wuxingCount={derivation.wuxingCount}
              maxElem={derivation.maxElem}
              yongElem={derivation.yongElem}
              dayunSteps={derivation.steps}
              ziwei={ziwei}
            />
          </View>
        ) : null}

        {/* 偏好 */}
        <View style={[S.card, card]}>
          <Text style={[S.cardTitle, { color: colors.secondary }]}>{t('me.prefs')}</Text>
          <View style={S.kvRow}>
            <Text style={[S.kvKey, { color: colors.dim }]}>{t('me.language')}</Text>
            <Pressable onPress={cycleLocale} hitSlop={6}>
              <Text style={[S.kvVal, { color: colors.accent }]}>{LOCALE_LABELS[locale]}</Text>
            </Pressable>
          </View>
          <Pressable onPress={shareApp} hitSlop={8}>
            <Text style={[S.link, { color: colors.accent }]}>{t('me.shareApp')}</Text>
          </Pressable>
        </View>

        {/* 账号 */}
        <View style={[S.card, card]}>
          <Text style={[S.cardTitle, { color: colors.secondary }]}>{t('me.account')}</Text>
          {session === 'loading' ? (
            <ActivityIndicator color={colors.secondary} />
          ) : session === 'out' ? (
            <>
              <Text style={[S.hint, { color: colors.secondary }]}>{t('me.signInHint')}</Text>
              {Platform.OS === 'ios' ? (
                <SatelliteAppleAuth
                  storagePrefix={PORTFOLIO_STORAGE_PREFIX}
                  targetApp={PORTFOLIO_TARGET_APP}
                  continueLabel={t('me.appleContinue')}
                  loadingLabel={t('me.preparing')}
                  unavailableLabel={t('me.deviceUnavailable')}
                  onAuthed={refresh}
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
                onAuthed={refresh}
              />
            </>
          ) : (
            // Row-style actions: each row is a 44pt tappable area with a left
            // label, right state, and chevron — easier to hit than the old
            // stacked text Pressables and clearer that they're interactive.
            <View style={S.accountRows}>
              {profile?.email ? (
                <>
                  <View style={[S.actionRow, { borderBottomColor: colors.separator }]}>
                    <Text style={[S.actionLabel, { color: colors.text }]}>
                      {t('me.bindEmail')}
                    </Text>
                    <Text style={[S.actionValue, { color: colors.dim }]} numberOfLines={1}>
                      {profile.email}
                    </Text>
                  </View>
                  <Pressable
                    onPress={unbindEmail}
                    style={({ pressed }) => [
                      S.actionRow,
                      { borderBottomColor: colors.separator },
                      pressed && S.actionRowPressed,
                    ]}
                  >
                    <Text style={[S.actionLabel, { color: colors.secondary }]}>
                      {t('me.unbindEmail')}
                    </Text>
                    <ChevronRightIcon size={16} color={colors.dim} strokeWidth={1.4} />
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={() => setBindSheetOpen(true)}
                  style={({ pressed }) => [
                    S.actionRow,
                    { borderBottomColor: colors.separator },
                    pressed && S.actionRowPressed,
                  ]}
                >
                  <Text style={[S.actionLabel, { color: colors.text }]}>
                    {t('me.bindEmail')}
                  </Text>
                  <ChevronRightIcon size={16} color={colors.dim} strokeWidth={1.4} />
                </Pressable>
              )}
              {draft && draft.timeIndex != null ? (
                <Pressable
                  onPress={syncBirth}
                  disabled={syncing || synced}
                  style={({ pressed }) => [
                    S.actionRow,
                    { borderBottomColor: colors.separator },
                    pressed && !syncing && !synced && S.actionRowPressed,
                  ]}
                >
                  <Text style={[S.actionLabel, { color: colors.text }]}>
                    {t('me.syncChart')}
                  </Text>
                  {syncing ? (
                    <ActivityIndicator color={colors.secondary} size='small' />
                  ) : synced ? (
                    <Text style={[S.actionValue, { color: colors.secondary }]}>
                      {t('me.synced')}
                    </Text>
                  ) : (
                    <ChevronRightIcon size={16} color={colors.dim} strokeWidth={1.4} />
                  )}
                </Pressable>
              ) : null}
              <Pressable
                onPress={signOut}
                style={({ pressed }) => [
                  S.actionRowLast,
                  pressed && S.actionRowPressed,
                ]}
              >
                <Text style={[S.actionLabel, { color: colors.secondary }]}>
                  {t('me.signOut')}
                </Text>
                <ChevronRightIcon size={16} color={colors.dim} strokeWidth={1.4} />
              </Pressable>
            </View>
          )}
        </View>

        {/* 公开主页 — username + chartPublic powers hexastral.com/u/<slug> */}
        {session === 'in' && profile ? (
          <View style={[S.card, card]}>
            <Text style={[S.cardTitle, { color: colors.secondary }]}>{t('me.publicCard')}</Text>

            {editingUsername ? (
              <View style={{ gap: 8 }}>
                <Text style={[S.kvKey, { color: colors.dim }]}>{t('me.usernameLabel')}</Text>
                <TextInput
                  value={usernameDraft}
                  onChangeText={setUsernameDraft}
                  placeholder={t('me.usernamePlaceholder')}
                  placeholderTextColor={colors.dim}
                  autoCapitalize='none'
                  autoCorrect={false}
                  maxLength={30}
                  style={[S.usernameInput, { color: colors.text, borderColor: colors.separator }]}
                />
                <Text
                  style={[
                    S.usernameStatus,
                    {
                      color:
                        usernameCheck === 'available'
                          ? colors.accent
                          : usernameCheck === 'taken' || usernameCheck === 'invalid'
                            ? '#c0584a'
                            : colors.dim,
                    },
                  ]}
                >
                  {usernameCheck === 'checking'
                    ? t('me.usernameChecking')
                    : usernameCheck === 'available'
                      ? t('me.usernameAvailable')
                      : usernameCheck === 'taken'
                        ? t('me.usernameTaken')
                        : usernameCheck === 'invalid'
                          ? t('me.usernameInvalid')
                          : ''}
                </Text>
                <View style={S.profileActions}>
                  <Pressable onPress={cancelEditUsername} hitSlop={8} disabled={profileSaving}>
                    <Text style={[S.link, { color: colors.dim }]}>{t('me.usernameCancel')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={saveUsername}
                    hitSlop={8}
                    disabled={profileSaving || usernameCheck !== 'available'}
                  >
                    <Text
                      style={[
                        S.link,
                        {
                          color:
                            !profileSaving && usernameCheck === 'available'
                              ? colors.accent
                              : colors.dim,
                        },
                      ]}
                    >
                      {profileSaving ? t('me.usernameSaving') : t('me.usernameSave')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={S.kvRow}>
                <Text style={[S.kvKey, { color: colors.dim }]}>{t('me.usernameLabel')}</Text>
                <Pressable onPress={startEditUsername} hitSlop={6}>
                  <Text
                    style={[
                      S.kvVal,
                      { color: profile.username ? colors.text : colors.accent },
                    ]}
                  >
                    {profile.username ? `@${profile.username}` : t('me.usernameNotSet')}
                    {'  '}
                    <Text style={{ color: colors.accent }}>{t('me.usernameEdit')}</Text>
                  </Text>
                </Pressable>
              </View>
            )}

            {profile.username && !editingUsername ? (
              <View style={S.publicRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={[S.kvKey, { color: colors.dim }]}>{t('me.chartPublic')}</Text>
                  <Text style={[S.hint, { color: colors.dim, marginTop: 4 }]}>
                    {t('me.chartPublicHint')}
                  </Text>
                </View>
                <Switch
                  value={profile.chartPublic}
                  onValueChange={toggleChartPublic}
                  disabled={profileSaving}
                  // Native iOS green clashes with the ink/gold palette.
                  // Drive on/off track + thumb from the theme so the toggle
                  // matches the rest of the surface.
                  trackColor={{ false: colors.separator, true: colors.accent }}
                  thumbColor={colors.text}
                  ios_backgroundColor={colors.separator}
                />
              </View>
            ) : null}

            {profile.username && profile.chartPublic && !editingUsername ? (
              <>
                <Text style={[S.profileUrl, { color: colors.secondary }]}>
                  {HEXASTRAL_PROFILE_URL.replace(/^https?:\/\//, '')}/u/{profile.username}
                </Text>
                <Pressable onPress={shareProfile} hitSlop={8}>
                  <Text style={[S.link, { color: colors.accent }]}>
                    {t('me.sharePublicPage')}
                  </Text>
                </Pressable>
              </>
            ) : null}

            {profileError ? (
              <Text style={[S.hint, { color: '#c0584a' }]}>{profileError}</Text>
            ) : null}
          </View>
        ) : null}

        {/* 生态 — flagship upsell, collapsed by default */}
        <View style={[S.card, card]}>
          <Pressable onPress={toggleEco} hitSlop={8} style={S.discHeader}>
            <View style={S.discHeaderLeft}>
              <Text style={[S.cardTitle, { color: colors.secondary }]}>{t('me.eco')}</Text>
              {ecoOpen ? null : (
                <Text style={[S.discSub, { color: colors.dim }]}>{t('me.ecoSub')}</Text>
              )}
            </View>
            <Animated.View style={ecoChevronStyle}>
              <ChevronDownIcon size={18} color={colors.secondary} />
            </Animated.View>
          </Pressable>
          {ecoOpen ? <FlagshipUpsell /> : null}
        </View>

        {/* 隐私与条款 — required by App Store Guideline 5.1.1 + GDPR.
            Renders for everyone, signed-in or not, so a user can audit
            our data practices before tying their account to an email. */}
        <View style={[S.card, card]}>
          <Text style={[S.cardTitle, { color: colors.secondary }]}>
            {t('me.legalSection')}
          </Text>
          <View style={S.accountRows}>
            <Pressable
              onPress={openPrivacy}
              style={({ pressed }) => [
                S.actionRow,
                { borderBottomColor: colors.separator },
                pressed && S.actionRowPressed,
              ]}
            >
              <Text style={[S.actionLabel, { color: colors.text }]}>{t('me.privacy')}</Text>
              <ChevronRightIcon size={16} color={colors.dim} strokeWidth={1.4} />
            </Pressable>
            <Pressable
              onPress={openTerms}
              style={({ pressed }) => [S.actionRowLast, pressed && S.actionRowPressed]}
            >
              <Text style={[S.actionLabel, { color: colors.text }]}>{t('me.terms')}</Text>
              <ChevronRightIcon size={16} color={colors.dim} strokeWidth={1.4} />
            </Pressable>
          </View>
        </View>

        {/* Danger zone — irreversible account deletion. Shown only when
            signed in (anonymous users have nothing server-side to delete). */}
        {session === 'in' ? (
          <View style={[S.card, card]}>
            <Text style={[S.cardTitle, { color: colors.secondary }]}>
              {t('me.dangerSection')}
            </Text>
            <View style={S.accountRows}>
              <Pressable
                onPress={deleteAccount}
                style={({ pressed }) => [S.actionRowLast, pressed && S.actionRowPressed]}
              >
                <Text style={[S.actionLabel, { color: '#C25450' }]}>
                  {t('me.deleteAccount')}
                </Text>
                <ChevronRightIcon size={16} color={colors.dim} strokeWidth={1.4} />
              </Pressable>
            </View>
          </View>
        ) : null}

        {__DEV__ ? (
          <>
            <View style={[S.card, card]}>
              <Text style={[S.cardTitle, { color: colors.secondary }]}>{'Dev'}</Text>
              <View style={S.kvRow}>
                <Text style={[S.kvKey, { color: colors.dim }]}>Entitlement</Text>
                <Pressable onPress={devToggleEntitlement} hitSlop={6}>
                  <Text
                    style={[
                      S.kvVal,
                      { color: entitlement === 'paid' ? colors.accent : colors.text },
                    ]}
                  >
                    {entitlement === 'paid' ? 'PAID' : 'FREE'}
                  </Text>
                </Pressable>
              </View>
              <View style={S.kvRow}>
                <Text style={[S.kvKey, { color: colors.dim }]}>Reading viewed</Text>
                <Pressable onPress={devClearReadingMark} hitSlop={6}>
                  <Text style={[S.kvVal, { color: colors.text }]}>
                    {viewedAt ? `${viewedAt.slice(0, 10)}` : 'idle'}
                  </Text>
                </Pressable>
              </View>
              <Pressable onPress={devRestartOnboarding} hitSlop={8}>
                <Text style={[S.link, { color: colors.accent }]}>{'Restart onboarding'}</Text>
              </Pressable>
            </View>

            <View style={[S.card, card]}>
              <Text style={[S.cardTitle, { color: colors.secondary }]}>{'Dev · Spikes'}</Text>
              {(['flip-magic', 'skia-moon', 'ink-wipe', 'seal-stamp', 'unseal'] as const).map(
                (s) => (
                  <Link key={s} href={`/spike/${s}` as '/spike/flip-magic'} asChild>
                    <Pressable hitSlop={8}>
                      <Text style={[S.link, { color: colors.accent }]}>{s}</Text>
                    </Pressable>
                  </Link>
                )
              )}
            </View>
          </>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Email bind sheet — also reachable from ReadingReport's unlock flow,
          mounted here so signed-in users can bind without going through Unlock. */}
      <EmailBindSheet
        visible={bindSheetOpen}
        onClose={() => setBindSheetOpen(false)}
        onSuccess={() => {
          setBindSheetOpen(false)
          refresh()
          void refreshEditGate()
        }}
      />
    </SafeAreaView>
  )
}

const S = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, gap: 16 },
  backBtn: { alignSelf: 'flex-start' },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 16, gap: 10 },
  cardTitle: { fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' },
  discHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  discHeaderLeft: { flex: 1, gap: 6 },
  discSub: { fontSize: 13, lineHeight: 18 },
  cardBody: { fontSize: 16, fontWeight: '500' },
  hint: { fontSize: 13, lineHeight: 19 },
  link: { fontSize: 14, fontWeight: '500' },
  locked: { fontSize: 13, fontWeight: '500' },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kvKey: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
  kvVal: { fontSize: 13, fontWeight: '500', fontFamily: 'Menlo' },
  usernameInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'Menlo',
  },
  usernameStatus: { fontSize: 12, lineHeight: 16 },
  profileActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 4 },
  publicRow: { flexDirection: 'row', alignItems: 'center' },
  profileUrl: { fontSize: 12, fontFamily: 'Menlo' },

  // Account-card row-style actions — each row is a tappable list-item with
  // proper minimum height (~44pt) instead of a bare text link.
  accountRows: { marginHorizontal: -16, marginBottom: -16, marginTop: 4 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  actionRowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 48,
    gap: 12,
  },
  actionRowPressed: { opacity: 0.55 },
  actionLabel: { fontSize: 15, fontWeight: '500' },
  actionValue: { fontSize: 13, flexShrink: 1, textAlign: 'right' },
})
