/**
 * 👤 You Tab — User profile with segmented control
 *
 * Top tabs: Profile / Chart / Settings
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useQueryClient } from '@tanstack/react-query'
import type { FateNatalChart, FateStellarChart } from '@zhop/hexastral-client'
import * as Clipboard from 'expo-clipboard'
import Constants from 'expo-constants'
import { useFocusEffect, useRouter } from 'expo-router'
import * as StoreReview from 'expo-store-review'
import type { LucideIcon } from 'lucide-react-native'
import { ChevronRight, MessageCircle, Monitor, Moon, Share2, Sun } from 'lucide-react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import PagerView from 'react-native-pager-view'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FateSignature } from '@/components/profile-page/FateSignature'
import { HeroIdentity } from '@/components/profile-page/HeroIdentity'
import { PresentMoment } from '@/components/profile-page/PresentMoment'
import { PublicVisibilityPanel } from '@/components/profile-page/PublicVisibilityPanel'
import ProfileEditSheet from '@/components/ui/ProfileEditSheet'
import { apiClient } from '@/lib/api'
import { getIsPro, useAuth } from '@/lib/auth'
import { config } from '@/lib/config'
import type { BirthInfo } from '@/lib/domain/birthInfo'
import { getBirthInfo, saveBirthInfo } from '@/lib/domain/birthInfo'
import {
  applyServerSnapshotToProfile,
  persistProfileToStorage,
  useProfile,
} from '@/lib/domain/profile'
import { checkSubscriptionStatus, restorePurchases } from '@/lib/domain/subscription'
import { formatShichenLabel } from '@/lib/format'
import { historyHref } from '@/lib/historyPrefs'
import { signRequest } from '@/lib/hmac'
import { useFateSignature } from '@/lib/hooks/useFateSignature'
import { useUserQuery } from '@/lib/hooks/useUserQuery'
import { LOCALE_NAMES, useI18n } from '@/lib/i18n'
import { storage } from '@/lib/storage'
import { getThemePreference, setThemePreference, type ThemePreference, useTheme } from '@/lib/theme'
import { useQuota } from '@/lib/ux/useQuota'
import { isUsernameEligibleForPublicVisibility } from '@/lib/validation/publicUsername'

// 12 Chinese time branches for inline picker
const SHICHEN = [
  { index: 0, branch: '子', label: '子时', sub: '23:00 – 01:00' },
  { index: 1, branch: '丑', label: '丑时', sub: '01:00 – 03:00' },
  { index: 2, branch: '寅', label: '寅时', sub: '03:00 – 05:00' },
  { index: 3, branch: '卯', label: '卯时', sub: '05:00 – 07:00' },
  { index: 4, branch: '辰', label: '辰时', sub: '07:00 – 09:00' },
  { index: 5, branch: '巳', label: '巳时', sub: '09:00 – 11:00' },
  { index: 6, branch: '午', label: '午时', sub: '11:00 – 13:00' },
  { index: 7, branch: '未', label: '未时', sub: '13:00 – 15:00' },
  { index: 8, branch: '申', label: '申时', sub: '15:00 – 17:00' },
  { index: 9, branch: '酉', label: '酉时', sub: '17:00 – 19:00' },
  { index: 10, branch: '戌', label: '戌时', sub: '19:00 – 21:00' },
  { index: 11, branch: '亥', label: '亥时', sub: '21:00 – 23:00' },
] as const

function parseSolarDate(solarDate?: string): Date {
  if (!solarDate) return new Date(2000, 0, 1)
  const parts = solarDate.split('-').map(Number)
  return new Date(parts[0] ?? 2000, (parts[1] ?? 1) - 1, parts[2] ?? 1)
}

function formatSolarDate(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function displaySolarDate(solarDate?: string): string {
  if (!solarDate) return '--'
  const parts = solarDate.split('-')
  const y = parts[0] ?? ''
  const m = (parts[1] ?? '').padStart(2, '0')
  const d = (parts[2] ?? '').padStart(2, '0')
  return `${m}/${d}/${y}`
}

type YouSection = 'profile' | 'settings'

const SECTIONS: YouSection[] = ['profile', 'settings']

export default function YouScreen() {
  const { colors, isDark } = useTheme()
  const { t, locale, changeLocale } = useI18n()
  const router = useRouter()
  const { user, userId, isAuthenticated, signOut, deleteAccount, refreshUserFromServer } = useAuth()

  const [activeSection, setActiveSection] = useState<YouSection>('profile')
  const pagerRef = useRef<PagerView>(null)

  // Profile
  const profileResult = useProfile(userId)
  const { profile, setProfile, avatarIndex, photoUri, saveProfile } = profileResult
  const [showEditSheet, setShowEditSheet] = useState(false)
  const [isSavingPublic, setIsSavingPublic] = useState(false)
  const isSavingPublicRef = useRef(false)
  // When set to true, closing the edit sheet with a valid username will
  // automatically enable chartPublic (user was prompted to set username first).
  const pendingChartPublicRef = useRef(false)
  /** Snapshot when opening edit sheet — duplicate-check baseline (avoids false `taken` on first paint). */
  const editSheetUsernameBaselineRef = useRef('')
  // Local chartPublic state decoupled from profile hook — avoids React 18 batching
  // race where profile.chartPublic and Switch value disagree mid-render.
  const [chartPublic, setChartPublic] = useState(false)
  useEffect(() => {
    setChartPublic(profile.chartPublic)
  }, [profile.chartPublic])

  const queryClient = useQueryClient()
  const { data: remoteUser } = useUserQuery(userId)

  // After the edit sheet closes, if a chartPublic enable was pending and the
  // user has now set a username, auto-save chartPublic=true.
  const saveProfileRef = useRef(saveProfile)
  saveProfileRef.current = saveProfile
  useEffect(() => {
    if (showEditSheet) return
    if (!pendingChartPublicRef.current) return
    const uname = remoteUser?.username?.trim()
    if (!uname) return
    if (chartPublic) {
      pendingChartPublicRef.current = false
      return
    }
    pendingChartPublicRef.current = false
    if (isSavingPublicRef.current) return
    isSavingPublicRef.current = true
    setIsSavingPublic(true)
    setChartPublic(true)
    void saveProfileRef
      .current({ chartPublic: true })
      .then((ok) => {
        if (!ok) {
          setChartPublic(false)
          setProfile((prev) => ({ ...prev, chartPublic: false }))
        } else if (userId) {
          queryClient.setQueryData(['user', userId], (old: unknown) => {
            if (!old || typeof old !== 'object') return old
            return { ...(old as Record<string, unknown>), chartPublic: true }
          })
        }
      })
      .finally(() => {
        setIsSavingPublic(false)
        isSavingPublicRef.current = false
      })
  }, [showEditSheet, remoteUser?.username, chartPublic, userId, queryClient, setProfile])

  useEffect(() => {
    if (remoteUser?.avatarKey) {
      // Only sync down if local profile has NO avatarKey initialized yet,
      // preventing stale Remote caches from reverting optimistic local uploads.
      if (!profile.avatarKey) {
        const remoteAvatarUrl = `${process.env.EXPO_PUBLIC_API_URL || 'https://api.hexastral.com'}/api/media/public/${remoteUser.avatarKey}`
        saveProfile({ photoUri: remoteAvatarUrl, avatarKey: remoteUser.avatarKey })
      }
    }
  }, [remoteUser?.avatarKey, profile.avatarKey, saveProfile])

  // Merge GET /user — server is source of truth for username / chartPublic (fixes stale AsyncStorage).
  useEffect(() => {
    if (!remoteUser || showEditSheet) return
    if (isSavingPublicRef.current) return
    setProfile((prev) => {
      const next = applyServerSnapshotToProfile(prev, {
        username: remoteUser.username,
        chartPublic: remoteUser.chartPublic,
        displayName: remoteUser.displayName,
        name: remoteUser.name,
      })
      if (next !== prev) void persistProfileToStorage(next)
      return next
    })
  }, [remoteUser, showEditSheet, setProfile])

  // Chart data — legacy fate reading removed; chart facts now sourced from natal/stellar endpoints (TODO)
  const natalChart = null as FateNatalChart | null
  const stellarChart = null as FateStellarChart | null

  // Profile redesign — pro gating, fate signature, paywall
  const isPro =
    remoteUser?.subscriptionStatus === 'premium' ||
    remoteUser?.subscriptionStatus === 'pro' ||
    remoteUser?.subscriptionStatus === 'active'
  const fateSignatureData = useFateSignature(userId, remoteUser ?? null)
  const { showPaywallModal } = useQuota()

  const openEditSheet = useCallback(() => {
    editSheetUsernameBaselineRef.current =
      remoteUser?.username?.trim() || profile.username?.trim() || ''
    setShowEditSheet(true)
  }, [remoteUser?.username, profile.username])

  // Settings state
  const [birthInfo, setBirthInfo] = useState<BirthInfo | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [expandedPicker, setExpandedPicker] = useState<'date' | 'time' | null>(null)
  const [dateEditValue, setDateEditValue] = useState(new Date(2000, 0, 1))
  const [calendarType, setCalendarType] = useState<'solar' | 'lunar'>('solar')
  const [themeMode, setThemeMode] = useState<ThemePreference>(getThemePreference())

  useEffect(() => {
    getBirthInfo().then((info) => {
      setBirthInfo(info)
      if (info.solarDate) setDateEditValue(parseSolarDate(info.solarDate))
      setCalendarType(info.calendarType ?? 'solar')
    })
    checkSubscriptionStatus().then((s) => {
      setIsSubscribed(s.isSubscribed)
    })
  }, [])

  useFocusEffect(
    useCallback(() => {
      void getBirthInfo().then((info) => {
        setBirthInfo(info)
        if (info.solarDate) setDateEditValue(parseSolarDate(info.solarDate))
        setCalendarType(info.calendarType ?? 'solar')
      })
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: ['user', userId] })
      }
    }, [userId, queryClient])
  )

  const scrollToSection = useCallback((section: YouSection) => {
    const idx = SECTIONS.indexOf(section)
    pagerRef.current?.setPage(idx)
  }, [])

  const handleSignOut = useCallback(() => {
    Alert.alert(t('profile_sign_out'), t('profile_sign_out_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('profile_sign_out'), style: 'destructive', onPress: signOut },
    ])
  }, [signOut, t])

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(t('profile_delete_account'), t('profile_delete_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('profile_delete_permanent'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccount()
            Alert.alert(t('profile_deleted'), t('profile_deleted_msg'))
          } catch {
            Alert.alert(t('profile_delete_failed'), t('common_retry_later'))
          }
        },
      },
    ])
  }, [deleteAccount, t])

  const handleRestore = useCallback(async () => {
    const success = await restorePurchases()
    if (success) {
      setIsSubscribed(true)
      Alert.alert(t('alert_restore_success'), t('alert_restore_success_msg'))
    } else {
      Alert.alert(t('alert_no_subscription'))
    }
  }, [t])

  const handleDateChange = useCallback(
    async (_: unknown, date?: Date) => {
      if (!date) return
      // Gate: free users cannot change birth info (triggers full chart regeneration)
      if (!isSubscribed) {
        Alert.alert(t('birth_change_gate_title'), t('birth_change_gate_desc'), [
          { text: t('cancel'), style: 'cancel' },
          { text: t('paywall_upgrade'), onPress: () => router.push('/paywall') },
        ])
        return
      }
      setDateEditValue(date)
      const formatted = formatSolarDate(date)
      await saveBirthInfo({ solarDate: formatted, birthYear: String(date.getFullYear()) })
      setBirthInfo((prev) => ({
        ...prev,
        solarDate: formatted,
        birthYear: String(date.getFullYear()),
      }))
      // Sync to server — fire-and-forget
      if (userId && !userId.startsWith('guest_')) {
        const merged = await getBirthInfo()
        if (merged.solarDate && merged.timeIndex != null) {
          apiClient.api.user[':userId']['birth-info']
            .$put({
              param: { userId },
              json: {
                birthSolarDate: merged.solarDate,
                birthTimeIndex: merged.timeIndex,
                birthGender: (merged.gender ?? '男') as '男' | '女',
                birthCity: merged.birthCity,
                birthLongitude: merged.longitude != null ? String(merged.longitude) : undefined,
                birthLatitude: merged.latitude != null ? String(merged.latitude) : undefined,
              },
            })
            .catch(() => {}) // non-blocking
        }
      }
    },
    [isSubscribed, userId, t, router]
  )

  const handleTimeSelect = useCallback(
    async (idx: number) => {
      // Gate: free users cannot change birth info (triggers full chart regeneration)
      if (!isSubscribed) {
        Alert.alert(t('birth_change_gate_title'), t('birth_change_gate_desc'), [
          { text: t('cancel'), style: 'cancel' },
          { text: t('paywall_upgrade'), onPress: () => router.push('/paywall') },
        ])
        return
      }
      await saveBirthInfo({ timeIndex: idx })
      setBirthInfo((prev) => ({ ...prev, timeIndex: idx }))
      setExpandedPicker(null)
      // Sync to server — fire-and-forget
      if (userId && !userId.startsWith('guest_')) {
        const merged = await getBirthInfo()
        if (merged.solarDate && merged.timeIndex != null) {
          apiClient.api.user[':userId']['birth-info']
            .$put({
              param: { userId },
              json: {
                birthSolarDate: merged.solarDate,
                birthTimeIndex: merged.timeIndex,
                birthGender: (merged.gender ?? '男') as '男' | '女',
                birthCity: merged.birthCity,
                birthLongitude: merged.longitude != null ? String(merged.longitude) : undefined,
                birthLatitude: merged.latitude != null ? String(merged.latitude) : undefined,
              },
            })
            .catch(() => {}) // non-blocking
        }
      }
    },
    [isSubscribed, userId, t, router]
  )

  const handleRateApp = useCallback(async () => {
    if (await StoreReview.isAvailableAsync()) {
      await StoreReview.requestReview()
    }
  }, [])

  const appVersion = Constants.expoConfig?.version ?? '—'
  const buildNumber = Constants.expoConfig?.ios?.buildNumber

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {/* Segmented control */}
      <View
        style={{
          flexDirection: 'row',
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
          paddingHorizontal: 16,
        }}
      >
        {SECTIONS.map((section) => {
          const isActive = activeSection === section
          const sectionKey = `you_${section}` as const
          return (
            <TouchableOpacity
              key={section}
              onPress={() => scrollToSection(section)}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: isActive ? colors.accent : 'transparent',
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: isActive ? '400' : '300',
                  color: isActive ? colors.accent : colors.textSecondary,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  textAlign: 'center',
                }}
              >
                {t(sectionKey)}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* ─── PagerView: swipeable pages ─── */}
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={(e) => {
          const section = SECTIONS[e.nativeEvent.position]
          if (section) setActiveSection(section)
        }}
      >
        {/* ─── Page 0: Profile ─── */}
        <ScrollView
          key='profile'
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          keyboardShouldPersistTaps='handled'
        >
          {/* ─── Hero · Identity ─── */}
          <HeroIdentity
            displayName={
              profile.displayName ||
              remoteUser?.displayName ||
              profile.name ||
              remoteUser?.name ||
              null
            }
            realName={profile.name || remoteUser?.name || null}
            username={profile.username}
            photoUri={photoUri}
            avatarIndex={avatarIndex}
            birthInfo={birthInfo}
            natalChart={natalChart}
            stellarChart={stellarChart}
            onEditPress={openEditSheet}
          />

          {/* ─── 命理签名 ─── */}
          {userId ? (
            <FateSignature
              userId={userId}
              isPro={isPro}
              signatureData={fateSignatureData}
              chartFacts={{
                dayMaster: natalChart?.dayMaster,
                dayMasterWuXing: natalChart?.dayMasterWuXing,
                geju: natalChart?.geju.primary,
                soul: stellarChart?.meta?.soul,
                fiveElementsClass: stellarChart?.meta?.fiveElementsClass,
              }}
              onUpgradePress={() => showPaywallModal()}
            />
          ) : null}

          {/* ─── 此刻 · 当下能量 ─── */}
          <PresentMoment fateId={null} yearOverview={null} fusedConclusion={null} />

          {/* ─── 公开内容 ─── */}
          <PublicVisibilityPanel
            userId={userId}
            username={remoteUser?.username ?? profile.username}
            chartPublic={chartPublic}
            hasUsername={isUsernameEligibleForPublicVisibility(
              remoteUser?.username ?? profile.username
            )}
            isSavingPublic={isSavingPublic}
            onToggleChartPublic={async (v) => {
              if (isSavingPublicRef.current) return
              isSavingPublicRef.current = true
              setIsSavingPublic(true)
              setChartPublic(v)
              try {
                const ok = await saveProfile({ chartPublic: v })
                if (!ok) {
                  setChartPublic(!v)
                  setProfile((prev) => ({ ...prev, chartPublic: !v }))
                } else {
                  if (userId) {
                    queryClient.setQueryData(['user', userId], (old: unknown) => {
                      if (!old || typeof old !== 'object') return old
                      return { ...(old as Record<string, unknown>), chartPublic: v }
                    })
                  }
                  void queryClient.invalidateQueries({ queryKey: ['user-visibility', userId] })
                }
              } finally {
                setIsSavingPublic(false)
                isSavingPublicRef.current = false
              }
            }}
            onRequireUsername={() => {
              pendingChartPublicRef.current = true
              openEditSheet()
            }}
          />
        </ScrollView>

        {/* ─── Page 1: Settings ─── */}
        <ScrollView
          key='settings'
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {/* ── CHART INPUT section ── */}
          <SectionLabel label={t('settings_section_chart')} colors={colors} isDark={isDark} />
          <View
            style={{
              backgroundColor: colors.card,
              marginHorizontal: 16,
              borderRadius: 0,
              overflow: 'hidden',
            }}
          >
            {/* Birth date row + inline DateTimePicker */}
            <View
              style={{
                borderBottomWidth: expandedPicker === 'date' ? 0 : 0.5,
                borderBottomColor: colors.border,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setExpandedPicker(expandedPicker === 'date' ? null : 'date')}
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '300', color: colors.text }}>
                  {t('settings_birth_date')}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '300', color: colors.text }}>
                  {displaySolarDate(birthInfo?.solarDate)}
                </Text>
              </TouchableOpacity>
              {expandedPicker === 'date' && (
                <>
                  {(locale === 'zh' || locale === 'zh-Hant') && (
                    <View
                      style={{
                        borderTopWidth: 0.5,
                        borderTopColor: colors.border,
                        paddingHorizontal: 20,
                        paddingVertical: 10,
                      }}
                    >
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {(['solar', 'lunar'] as const).map((type) => {
                          const selected = calendarType === type
                          return (
                            <Pressable
                              key={type}
                              onPress={() => {
                                setCalendarType(type)
                                void saveBirthInfo({ calendarType: type })
                              }}
                              style={({ pressed }) => ({
                                paddingVertical: 5,
                                paddingHorizontal: 14,
                                borderWidth: selected ? 1 : 0.5,
                                borderColor: selected ? colors.primary : colors.border,
                                backgroundColor: selected ? colors.primary : 'transparent',
                                opacity: pressed ? 0.7 : 1,
                              })}
                            >
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontWeight: selected ? '500' : '300',
                                  letterSpacing: 1,
                                  color: selected
                                    ? isDark
                                      ? '#09090B'
                                      : '#FAFAFA'
                                    : colors.textSecondary,
                                }}
                              >
                                {type === 'solar'
                                  ? t('settings_birth_calendar_solar')
                                  : t('settings_birth_calendar_lunar')}
                              </Text>
                            </Pressable>
                          )
                        })}
                      </View>
                      {calendarType === 'lunar' && (
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '300',
                            color: `${colors.textSecondary}99`,
                            marginTop: 8,
                            lineHeight: 16,
                          }}
                        >
                          {t('settings_birth_lunar_note')}
                        </Text>
                      )}
                    </View>
                  )}
                  <DateTimePicker
                    value={dateEditValue}
                    mode='date'
                    display='spinner'
                    maximumDate={new Date()}
                    minimumDate={new Date(1900, 0, 1)}
                    onChange={handleDateChange}
                    style={{ height: 180 }}
                  />
                  <View style={{ height: 0.5, backgroundColor: colors.border }} />
                </>
              )}
            </View>

            {/* Birth time row + inline 时辰 picker */}
            <View
              style={{
                borderBottomWidth: expandedPicker === 'time' ? 0 : 0.5,
                borderBottomColor: colors.border,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setExpandedPicker(expandedPicker === 'time' ? null : 'time')}
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '300', color: colors.text }}>
                  {t('settings_birth_time')}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '300', color: colors.text }}>
                  {birthInfo?.timeIndex != null
                    ? `${SHICHEN[birthInfo.timeIndex]?.branch ?? ''} ${SHICHEN[birthInfo.timeIndex]?.sub ?? ''}`
                    : '--'}
                </Text>
              </TouchableOpacity>
              {expandedPicker === 'time' && (
                <View>
                  {SHICHEN.map((h) => {
                    const active = h.index === birthInfo?.timeIndex
                    return (
                      <TouchableOpacity
                        key={h.index}
                        onPress={() => handleTimeSelect(h.index)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 13,
                          paddingHorizontal: 20,
                          borderTopWidth: 0.5,
                          borderTopColor: colors.border,
                          backgroundColor: active ? `${colors.accent}1F` : 'transparent',
                        }}
                      >
                        <Text
                          style={{
                            width: 24,
                            fontSize: 15,
                            fontWeight: '200',
                            color: active ? colors.accent : colors.textSecondary,
                          }}
                        >
                          {h.branch}
                        </Text>
                        <Text
                          style={{
                            flex: 1,
                            fontSize: 13,
                            fontWeight: '300',
                            color: active ? colors.text : colors.textSecondary,
                            marginLeft: 12,
                          }}
                        >
                          {formatShichenLabel(h.index, locale)}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '300',
                            color: `${colors.textSecondary}88`,
                          }}
                        >
                          {h.sub}
                        </Text>
                        {active && (
                          <Text style={{ fontSize: 11, color: colors.accent, marginLeft: 10 }}>
                            ✓
                          </Text>
                        )}
                      </TouchableOpacity>
                    )
                  })}
                  <View style={{ height: 0.5, backgroundColor: colors.border }} />
                </View>
              )}
            </View>

            {/* Birth place */}
            <SettingsRow
              label={t('settings_birth_place')}
              value={birthInfo?.birthCity ?? '--'}
              onPress={() => router.push('/city-picker')}
              colors={colors}
            />
          </View>

          {/* ── RECORDS section ── */}
          <SectionLabel label={t('settings_section_records')} colors={colors} isDark={isDark} />
          <View
            style={{
              backgroundColor: colors.card,
              marginHorizontal: 16,
              borderRadius: 0,
              overflow: 'hidden',
            }}
          >
            <SettingsRow
              label={t('settings_history_divination')}
              onPress={() => router.push(historyHref('oracle') as never)}
              colors={colors}
            />
            <SettingsRow
              label={t('settings_history_daily_signals')}
              onPress={() => router.push(historyHref('daily') as never)}
              colors={colors}
            />
            <SettingsRow
              label={t('settings_history_deep_reading')}
              onPress={() => router.push(historyHref('readings') as never)}
              colors={colors}
            />
          </View>

          {/* ── PREFERENCES section ── */}
          <SectionLabel label={t('settings_section_preferences')} colors={colors} isDark={isDark} />
          <View
            style={{
              backgroundColor: colors.card,
              marginHorizontal: 16,
              borderRadius: 0,
              overflow: 'hidden',
            }}
          >
            {/* Language */}
            <SettingsRow
              label={t('profile_language_row')}
              value={LOCALE_NAMES[locale]}
              onPress={() => router.push('/language')}
              colors={colors}
            />
            {/* Theme */}
            <View
              style={{
                borderBottomWidth: 0.5,
                borderBottomColor: colors.border,
                paddingVertical: 14,
                paddingHorizontal: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '300',
                  color: colors.text,
                  marginBottom: 10,
                }}
              >
                {t('settings_theme')}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: isDark ? '#27272A' : '#F4F4F5',
                  borderRadius: 0,
                  padding: 2,
                }}
              >
                {(
                  [
                    { mode: 'system', Icon: Monitor },
                    { mode: 'light', Icon: Sun },
                    { mode: 'dark', Icon: Moon },
                  ] as const
                ).map(({ mode, Icon }) => {
                  const selected = themeMode === mode
                  return (
                    <Pressable
                      key={mode}
                      onPress={() => {
                        setThemePreference(mode)
                        setThemeMode(mode)
                      }}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        paddingVertical: 7,
                        borderRadius: 0,
                        backgroundColor: selected
                          ? isDark
                            ? '#3F3F46'
                            : '#FFFFFF'
                          : 'transparent',
                      }}
                    >
                      <Icon
                        size={14}
                        color={selected ? colors.text : colors.textSecondary}
                        strokeWidth={1.5}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: selected ? '500' : '300',
                          color: selected ? colors.text : colors.textSecondary,
                        }}
                      >
                        {t(`settings_theme_${mode}`)}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
            {/* Notifications */}
            <SettingsRow
              label={t('settings_notifications')}
              onPress={() => router.push('/notifications')}
              colors={colors}
            />
          </View>

          {/* ── SUBSCRIPTION section ── */}
          <SectionLabel label={t('settings_section_account')} colors={colors} isDark={isDark} />
          <View
            style={{
              backgroundColor: colors.card,
              marginHorizontal: 16,
              borderRadius: 0,
              overflow: 'hidden',
            }}
          >
            <SettingsRow label={t('profile_restore')} onPress={handleRestore} colors={colors} />
            {!isSubscribed && (
              <TouchableOpacity
                onPress={() => router.push('/paywall')}
                style={{
                  borderBottomWidth: 0.5,
                  borderBottomColor: colors.border,
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '400', color: colors.accent }}>
                  {t('settings_unlock_hexastral')}
                </Text>
                <Text style={{ fontSize: 14, color: colors.accent }}>→</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── SUPPORT section ── */}
          <SectionLabel label={t('settings_section_support')} colors={colors} isDark={isDark} />
          <View
            style={{
              backgroundColor: colors.card,
              marginHorizontal: 16,
              borderRadius: 0,
              overflow: 'hidden',
            }}
          >
            <SettingsRow
              label={t('settings_share_invite')}
              icon={Share2}
              onPress={() =>
                Share.share({ message: `${t('bonds_invite_msg')} https://hexastral.com/invite` })
              }
              colors={colors}
            />
            <SettingsRow
              label={t('settings_feedback')}
              icon={MessageCircle}
              onPress={() => Linking.openURL('mailto:support@hexastral.com')}
              colors={colors}
            />
            <SettingsRow label={t('settings_rate_app')} onPress={handleRateApp} colors={colors} />
            <SettingsRow
              label={t('settings_about')}
              onPress={() => router.push('/about')}
              colors={colors}
            />
            <SettingsRow
              label={t('settings_privacy_policy')}
              onPress={() => Linking.openURL('https://hexastral.com/privacy')}
              colors={colors}
            />
            <SettingsRow
              label={t('settings_terms_of_service')}
              onPress={() => Linking.openURL('https://hexastral.com/terms')}
              colors={colors}
            />
            {/* Version */}
            <View
              style={{
                borderBottomWidth: 0.5,
                borderBottomColor: colors.border,
                paddingVertical: 14,
                paddingHorizontal: 20,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '300', color: colors.text }}>
                {t('settings_version')}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '300', color: colors.textSecondary }}>
                {appVersion}
                {buildNumber ? ` (${buildNumber})` : ''}
              </Text>
            </View>
          </View>

          {/* Sign out + Delete account */}
          {isAuthenticated && (
            <>
              <SectionLabel label={t('settings_section_account')} colors={colors} isDark={isDark} />
              <View
                style={{
                  backgroundColor: colors.card,
                  marginHorizontal: 16,
                  borderRadius: 0,
                  overflow: 'hidden',
                  marginBottom: 32,
                }}
              >
                <TouchableOpacity
                  onPress={handleSignOut}
                  style={{
                    borderBottomWidth: 0.5,
                    borderBottomColor: isDark ? '#27272A' : '#E4E4E7',
                    paddingVertical: 14,
                    paddingHorizontal: 20,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '300', color: colors.text }}>
                    {t('profile_sign_out')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDeleteAccount}
                  style={{ paddingVertical: 14, paddingHorizontal: 20 }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '300', color: colors.textSecondary }}>
                    {t('profile_delete_account')}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Dev tools — systematic testing console */}
          {__DEV__ && userId ? (
            <DevConsole
              userId={userId}
              isSubscribed={isSubscribed}
              serverIsPro={getIsPro(remoteUser ?? null)}
              serverSubscriptionLabel={remoteUser?.subscriptionStatus ?? '—'}
              colors={colors}
              isDark={isDark}
              t={t}
              setIsSubscribed={setIsSubscribed}
              queryClient={queryClient}
              router={router}
              refreshUserFromServer={refreshUserFromServer}
            />
          ) : null}
        </ScrollView>
      </PagerView>

      {/* Profile edit bottom sheet */}
      <ProfileEditSheet
        visible={showEditSheet}
        onClose={async () => {
          setShowEditSheet(false)
          if (userId) {
            await queryClient.refetchQueries({ queryKey: ['user', userId] })
          }
        }}
        profile={profileResult}
        email={user?.email ?? null}
        colors={colors}
        isDark={isDark}
        t={t}
        usernameAvailabilityBaseline={editSheetUsernameBaselineRef.current}
      />
    </SafeAreaView>
  )
}

/* ── Section label ── */
function SectionLabel({
  label,
  colors,
  isDark,
}: {
  label: string
  colors: ReturnType<typeof useTheme>['colors']
  isDark: boolean
}) {
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: '500',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 8,
      }}
    >
      {label}
    </Text>
  )
}

/* ── Reusable settings row ── */
function SettingsRow({
  label,
  value,
  hint,
  icon: Icon,
  onPress,
  colors,
}: {
  label: string
  value?: string
  hint?: string
  icon?: LucideIcon
  onPress: () => void
  colors: ReturnType<typeof useTheme>['colors']
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border,
        paddingVertical: 14,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {Icon && (
        <View style={{ width: 16, marginRight: 12 }}>
          <Icon size={14} color={colors.textSecondary} strokeWidth={1.2} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '300', color: colors.text }}>{label}</Text>
        {hint ? (
          <Text
            style={{ fontSize: 11, fontWeight: '300', color: colors.textSecondary, marginTop: 2 }}
          >
            {hint}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text
          style={{ fontSize: 13, fontWeight: '300', color: colors.textSecondary, marginLeft: 8 }}
        >
          {value}
        </Text>
      ) : (
        <ChevronRight size={14} color={colors.textSecondary} strokeWidth={1} />
      )}
    </TouchableOpacity>
  )
}

/* ─────────────────────────────────────────────────────────────
 * DevConsole — systematic, scenario-coverage testing console.
 * Five sections (Identity / Subscription / Data / Flows / Diagnostics)
 * mirror the QA matrix so every primary user state can be reached
 * deterministically.  DEV-only; not bundled into release.
 * ────────────────────────────────────────────────────────────*/
type Router = ReturnType<typeof useRouter>
type QC = ReturnType<typeof useQueryClient>
type Colors = ReturnType<typeof useTheme>['colors']

async function callDev(
  userId: string,
  method: 'POST' | 'DELETE',
  path: string,
  body?: unknown
): Promise<Response> {
  const bodyStr = body !== undefined ? JSON.stringify(body) : ''
  const sig = await signRequest({ body: bodyStr, userId, method, path })
  const headers: Record<string, string> = {
    Authorization: `Bearer ${userId}`,
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (sig) Object.assign(headers, sig)
  return fetch(`${config.apiUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? bodyStr : undefined,
  })
}

function DevConsole({
  userId,
  isSubscribed,
  serverIsPro,
  serverSubscriptionLabel,
  setIsSubscribed,
  colors,
  isDark,
  t,
  queryClient,
  router,
  refreshUserFromServer,
}: {
  userId: string
  isSubscribed: boolean
  /** D1 `users.subscription_status` — same source as Fate-tab Pro gates (`useUserQuery`). */
  serverIsPro: boolean
  serverSubscriptionLabel: string
  setIsSubscribed: (v: boolean) => void
  colors: Colors
  isDark: boolean
  t: ReturnType<typeof useI18n>['t']
  queryClient: QC
  router: Router
  refreshUserFromServer: () => Promise<void>
}) {
  const setSubscription = async (status: 'free' | 'premium') => {
    try {
      const res = await callDev(userId, 'POST', '/api/dev/set-subscription', { status })
      if (!res.ok) throw new Error(await res.text())
      setIsSubscribed(status === 'premium')
      await queryClient.invalidateQueries({ queryKey: ['user', userId] })
      await queryClient.invalidateQueries({ queryKey: ['quota', userId] })
      await queryClient.invalidateQueries({ queryKey: ['quota-free', userId] })
      await refreshUserFromServer()
      Alert.alert('Dev', `subscriptionStatus → ${status}`)
    } catch (e) {
      Alert.alert('Error', String(e))
    }
  }

  const copyUserId = async () => {
    await Clipboard.setStringAsync(userId)
    Alert.alert('Copied', userId)
  }

  const clearFateData = async (silent = false) => {
    try {
      await callDev(userId, 'DELETE', '/api/dev/fate')
      storage.remove('fate_generating_at')
      storage.remove('hexastral_latest_shuangpan_id')
      // Wipe every fate / chart / reading-flavoured query so nothing rehydrates stale
      queryClient.removeQueries({ queryKey: ['fate-reading'] })
      queryClient.removeQueries({ queryKey: ['fate-preview'] })
      queryClient.removeQueries({ queryKey: ['fate-history'] })
      queryClient.removeQueries({ queryKey: ['comprehensive-fate'] })
      queryClient.removeQueries({ queryKey: ['destiny-reading'] })
      queryClient.removeQueries({ queryKey: ['chart'] })
      queryClient.removeQueries({ queryKey: ['chat-history'] })
      if (!silent) Alert.alert('Dev', 'Fate readings + chart cache cleared.')
    } catch (e) {
      if (!silent) Alert.alert('Error', String(e))
    }
  }

  const fullReset = () => {
    Alert.alert(
      'Full Reset',
      'Wipes:\n• AsyncStorage + MMKV + React-Query cache\n• D1 fate readings + chart cache\n• D1 birth profile (date/time/gender/city)\n\nApple sign-in & subscription preserved. Onboarding restarts from blank.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            // 1. Server-side wipe (fate + charts + birth_*) — single batched call
            try {
              const res = await callDev(userId, 'POST', '/api/dev/full-reset')
              if (!res.ok && __DEV__) {
                console.warn('[dev] full-reset server call failed', await res.text())
              }
            } catch (err) {
              if (__DEV__) console.warn('[dev] full-reset server error', err)
            }
            // 2. Client-side wipe
            try {
              for (const k of storage.getAllKeys()) storage.remove(k)
            } catch {
              // ignore
            }
            await AsyncStorage.clear().catch(() => {})
            queryClient.clear()
            router.replace('/onboarding')
          },
        },
      ]
    )
  }

  const restartOnboarding = async () => {
    await AsyncStorage.removeItem('hexastral_onboarded').catch(() => {})
    router.replace('/onboarding')
  }
  // restartOnboarding intentionally retained but not surfaced — Full Reset is
  // the only reliable way to replay onboarding (otherwise server still holds
  // birth_*  and useBirthInfoQuery will instantly re-hydrate the form).
  void restartOnboarding

  return (
    <>
      {/* IDENTITY ───── who am I */}
      <SectionLabel label='DEV · Identity' colors={colors} isDark={isDark} />
      <View
        style={{
          backgroundColor: colors.card,
          marginHorizontal: 16,
          borderRadius: 0,
          overflow: 'hidden',
          marginBottom: 8,
        }}
      >
        <SettingsRow label='Copy User ID' hint={userId} onPress={copyUserId} colors={colors} />
      </View>

      {/* SUBSCRIPTION ───── plan toggles */}
      <SectionLabel label='DEV · Subscription' colors={colors} isDark={isDark} />
      <View
        style={{
          backgroundColor: colors.card,
          marginHorizontal: 16,
          borderRadius: 0,
          overflow: 'hidden',
          marginBottom: 8,
        }}
      >
        <SettingsRow
          label='Server (D1)'
          value={`${serverSubscriptionLabel}${serverIsPro ? ' · Pro gate' : ''}`}
          hint='Matches useUserQuery / Fate tab — not RevenueCat'
          onPress={() => {}}
          colors={colors}
        />
        <SettingsRow
          label='RevenueCat'
          value={isSubscribed ? 'active' : 'inactive'}
          hint='Store subscription — unchanged by D1 dev toggles below'
          onPress={() => {}}
          colors={colors}
        />
        <SettingsRow
          label={`Set to Pro (D1)${serverIsPro ? '  ✓' : ''}`}
          hint='subscription_status → premium · unlocks paywalled tabs'
          onPress={() => setSubscription('premium')}
          colors={colors}
        />
        <SettingsRow
          label={`Reset to Free (D1)${!serverIsPro ? '  ✓' : ''}`}
          hint='subscription_status → free · re-locks paywalls'
          onPress={() => setSubscription('free')}
          colors={colors}
        />
      </View>

      {/* DATA RESET ───── deterministic state for QA */}
      <SectionLabel label='DEV · Data Reset' colors={colors} isDark={isDark} />
      <View
        style={{
          backgroundColor: colors.card,
          marginHorizontal: 16,
          borderRadius: 0,
          overflow: 'hidden',
          marginBottom: 8,
        }}
      >
        <SettingsRow
          label='Clear Fate + Charts (keep birth info)'
          hint='D1 fate_readings + comprehensive_fate_reports + user_charts. Next visit re-generates.'
          onPress={() => clearFateData(false)}
          colors={colors}
        />
      </View>

      {/* FLOWS ───── enter common screens fast */}
      <SectionLabel label='DEV · Flows' colors={colors} isDark={isDark} />
      <View
        style={{
          backgroundColor: colors.card,
          marginHorizontal: 16,
          borderRadius: 0,
          overflow: 'hidden',
          marginBottom: 8,
        }}
      >
        <SettingsRow label='Open Paywall' onPress={() => router.push('/paywall')} colors={colors} />
        <SettingsRow
          label='Open Synastry (Compatibility)'
          onPress={() => router.push('/(tabs)/synastry')}
          colors={colors}
        />
      </View>

      {/* DIAGNOSTICS ───── observability */}
      <SectionLabel label='DEV · Diagnostics' colors={colors} isDark={isDark} />
      <View
        style={{
          backgroundColor: colors.card,
          marginHorizontal: 16,
          borderRadius: 0,
          overflow: 'hidden',
          marginBottom: 8,
        }}
      >
        <SettingsRow
          label='API Endpoint'
          hint={config.apiUrl}
          onPress={async () => {
            await Clipboard.setStringAsync(config.apiUrl)
            Alert.alert('Copied', config.apiUrl)
          }}
          colors={colors}
        />
        <SettingsRow
          label='Build'
          hint={`${Constants.expoConfig?.version ?? '—'}${Constants.expoConfig?.ios?.buildNumber ? ` (${Constants.expoConfig.ios.buildNumber})` : ''}`}
          onPress={() => {}}
          colors={colors}
        />
      </View>

      {/* DANGER ───── nuclear */}
      <View
        style={{
          backgroundColor: colors.card,
          marginHorizontal: 16,
          borderRadius: 0,
          overflow: 'hidden',
          marginBottom: 32,
          borderWidth: 0.5,
          borderColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={fullReset}
          style={{ paddingVertical: 14, paddingHorizontal: 20 }}
        >
          <Text style={{ fontSize: 15, fontWeight: '500', color: '#FF3B30' }}>
            Full Reset → Replay Onboarding
          </Text>
          <Text
            style={{ fontSize: 11, fontWeight: '300', color: colors.textSecondary, marginTop: 2 }}
          >
            Wipes client storage + D1 fate/charts/birth_*. Apple sign-in preserved.
          </Text>
        </TouchableOpacity>
      </View>
    </>
  )
}
