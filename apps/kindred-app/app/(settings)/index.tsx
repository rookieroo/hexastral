/**
 * Settings — email, Apple/Google sign-in, birth edit, daily push, reference,
 * legal. Row chrome mirrors Yuun Me: title-only rows (no long captions); Sign
 * out only when a recoverable identity is linked.
 */

import { Card } from '@zhop/core-ui'
import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { EmailVerifyModal } from '@/components/EmailVerifyModal'
import { SignInSheet } from '@/components/SignInSheet'
import { useAuth } from '@/lib/auth'
import { devClearReportCache, devSetServerPro, devWipeUserAndRestart } from '@/lib/dev-tools'
import {
  getKindredDevLocale,
  type Locale,
  privacyPolicyUrl,
  resolveLocale,
  setKindredDevLocale,
  t,
} from '@/lib/i18n'
import { getKindredDevPro, type KindredDevPro, setKindredDevPro } from '@/lib/iap'
import { clearDraft } from '@/lib/onboardingDraft'
import { getDailyPushEnabled, setDailyPushEnabled } from '@/lib/push-preference'
import { registerPushTokenDetailed, unregisterPushToken } from '@/lib/serverPush'
import { devReplaySplash } from '@/lib/splash-control'
import { resetOnboarding } from '../index'

const LEGAL_BASE = 'https://yuel.hexastral.com'
function legalUrl(path: '/privacy' | '/terms', locale: Locale): string {
  if (path === '/privacy') return privacyPolicyUrl(locale)
  const segment =
    locale === 'zh-Hant' ? 'tw' : locale === 'zh' ? 'zh' : locale === 'ja' ? 'ja' : 'en'
  if (segment === 'en') return `${LEGAL_BASE}/terms`
  return `${LEGAL_BASE}/${segment}/terms`
}

type Status = 'idle' | 'pending' | 'linked' | 'recovered' | 'already_linked' | 'error'

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  if (local.length <= 2) return `${local[0]}***@${domain}`
  return `${local.slice(0, 2)}***@${domain}`
}

const BIRTH_COPY: Record<Locale, { section: string; row: string }> = {
  en: { section: 'Birth info', row: 'Edit birth info' },
  zh: { section: '出生信息', row: '修改出生信息' },
  'zh-Hant': { section: '出生資訊', row: '修改出生資訊' },
  ja: { section: '出生情報', row: '出生情報を編集' },
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      style={[
        kindredType.seal,
        { color: kindredDark.textSecondary, marginBottom: kindredSpacing.sm },
      ]}
    >
      {children}
    </Text>
  )
}

function RowDivider() {
  return <View style={{ height: 0.5, backgroundColor: kindredDark.border }} />
}

function SettingsRow({
  label,
  onPress,
  trailing,
}: {
  label: string
  onPress?: () => void
  trailing?: ReactNode
}) {
  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: kindredSpacing.md,
        paddingVertical: kindredSpacing.sm,
        paddingHorizontal: kindredSpacing.md,
      }}
    >
      <Text style={[kindredType.body, { color: kindredDark.text, flex: 1 }]}>{label}</Text>
      {trailing}
    </View>
  )
  if (!onPress) return body
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {body}
    </Pressable>
  )
}

export default function SettingsScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const { userId, userEmail, hasLinkedSignIn, signOut, deleteAccount, refreshProfile, setUserEmail } =
    useAuth()
  const [signInOpen, setSignInOpen] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [dailyPush, setDailyPushState] = useState(false)
  const [dailyPushBusy, setDailyPushBusy] = useState(false)
  const [devPro, setDevPro] = useState<KindredDevPro>(getKindredDevPro())
  const [devLocale, setDevLocale] = useState<Locale | null>(getKindredDevLocale())
  const [deletingAccount, setDeletingAccount] = useState(false)

  const cycleDevLocale = () => {
    const order: (Locale | null)[] = [null, 'en', 'zh', 'zh-Hant', 'ja']
    const next = order[(order.indexOf(devLocale) + 1) % order.length] ?? null
    setKindredDevLocale(next)
    setDevLocale(next)
  }
  const cycleDevPro = () => {
    const next: KindredDevPro = devPro === null ? 'pro' : devPro === 'pro' ? 'free' : null
    setKindredDevPro(next)
    setDevPro(next)
    if (userId) void devSetServerPro(userId, next === 'pro')
  }

  useEffect(() => {
    void getDailyPushEnabled().then(setDailyPushState)
  }, [])

  const handleDailyPushToggle = async (value: boolean) => {
    if (dailyPushBusy) return
    setDailyPushBusy(true)
    setDailyPushState(value)
    try {
      await setDailyPushEnabled(value)
      if (value) {
        const result = await registerPushTokenDetailed(userId, { prompt: true })
        if (!result.ok) {
          await setDailyPushEnabled(false)
          setDailyPushState(false)
          if (result.reason === 'denied') {
            Alert.alert(
              t(locale, 'settings.dailyPush.deniedTitle'),
              t(locale, 'settings.dailyPush.deniedBody'),
              [
                { text: t(locale, 'settings.deleteAccount.cancel'), style: 'cancel' },
                {
                  text: t(locale, 'settings.dailyPush.openSettings'),
                  onPress: () => void Linking.openSettings(),
                },
              ]
            )
          } else if (result.reason === 'no_module' || result.reason === 'token') {
            Alert.alert(
              t(locale, 'settings.dailyPush.unavailableTitle'),
              t(locale, 'settings.dailyPush.unavailableBody')
            )
          } else {
            Alert.alert(
              t(locale, 'settings.dailyPush.failedTitle'),
              t(locale, 'settings.dailyPush.failedBody')
            )
          }
        }
      } else {
        await unregisterPushToken(userId)
      }
    } catch {
      setDailyPushState(!value)
    } finally {
      setDailyPushBusy(false)
    }
  }

  const openLegal = useCallback(
    (path: '/privacy' | '/terms') => {
      void Linking.openURL(legalUrl(path, locale))
    },
    [locale]
  )

  useEffect(() => {
    void refreshProfile()
  }, [refreshProfile])

  const handleSignOut = () => {
    Alert.alert(t(locale, 'settings.signOut.confirmTitle'), t(locale, 'settings.signOut.confirmBody'), [
      { text: t(locale, 'settings.deleteAccount.cancel'), style: 'cancel' },
      {
        text: t(locale, 'settings.signOut'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await signOut()
            router.replace('/')
          })()
        },
      },
    ])
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      t(locale, 'settings.deleteAccount.confirmTitle'),
      t(locale, 'settings.deleteAccount.confirmBody'),
      [
        { text: t(locale, 'settings.deleteAccount.cancel'), style: 'cancel' },
        {
          text: t(locale, 'settings.deleteAccount.confirmCta'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              if (deletingAccount) return
              setDeletingAccount(true)
              try {
                const ok = await deleteAccount()
                if (!ok) {
                  Alert.alert(t(locale, 'settings.deleteAccount.failed'))
                  return
                }
                setStatus('idle')
                router.replace('/')
              } catch (err) {
                if (__DEV__) console.error('[Settings] delete account failed', err)
                Alert.alert(t(locale, 'settings.deleteAccount.failed'))
              } finally {
                setDeletingAccount(false)
              }
            })()
          },
        },
      ]
    )
  }

  const onEmailVerified = useCallback(
    (email: string) => {
      setUserEmail(email)
      void refreshProfile()
    },
    [setUserEmail, refreshProfile]
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: kindredSpacing.screenH,
          paddingTop: kindredSpacing.xl,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[kindredType.heading, { color: kindredDark.textMuted }]}>←</Text>
        </Pressable>
        <Text style={[kindredType.seal, { color: kindredDark.textMuted }]}>
          {t(locale, 'settings.title')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: kindredSpacing.screenH,
          paddingTop: kindredSpacing.xl,
          paddingBottom: kindredSpacing.xxl,
          gap: kindredSpacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <SectionLabel>{t(locale, 'settings.email.section')}</SectionLabel>
          <Card
            variant='outlined'
            padding='none'
            style={{ backgroundColor: kindredDark.card, gap: 0, borderRadius: 0 }}
          >
            <SettingsRow
              label={userEmail ? maskEmail(userEmail) : t(locale, 'settings.email.notLinked')}
              onPress={() => setEmailModalOpen(true)}
              trailing={
                <Text style={[kindredType.caption, { color: kindredDark.accent }]}>
                  {userEmail ? t(locale, 'settings.email.change') : t(locale, 'settings.email.link')}
                </Text>
              }
            />
          </Card>
        </View>

        <View>
          <SectionLabel>{t(locale, 'settings.account')}</SectionLabel>
          <Card
            variant='outlined'
            padding='none'
            style={{ backgroundColor: kindredDark.card, gap: 0, borderRadius: 0 }}
          >
            {hasLinkedSignIn ? (
              <SettingsRow
                label={
                  status === 'recovered'
                    ? `✓ ${t(locale, 'settings.recovered')}`
                    : `✓ ${t(locale, 'settings.linked')}`
                }
              />
            ) : (
              <SettingsRow
                label={t(locale, 'signIn.title')}
                onPress={() => setSignInOpen(true)}
              />
            )}
          </Card>
        </View>

        <View>
          <SectionLabel>{BIRTH_COPY[locale].section}</SectionLabel>
          <Card
            variant='outlined'
            padding='none'
            style={{ backgroundColor: kindredDark.card, gap: 0, borderRadius: 0 }}
          >
            <SettingsRow
              label={BIRTH_COPY[locale].row}
              onPress={() =>
                router.push({ pathname: '/(onboarding)/self', params: { mode: 'edit' } })
              }
            />
          </Card>
        </View>

        <View>
          <SectionLabel>{t(locale, 'settings.notifications.section')}</SectionLabel>
          <Card
            variant='outlined'
            padding='none'
            style={{ backgroundColor: kindredDark.card, gap: 0, borderRadius: 0 }}
          >
            <SettingsRow
              label={t(locale, 'settings.dailyPush.label')}
              trailing={
                <Switch
                  value={dailyPush}
                  onValueChange={handleDailyPushToggle}
                  disabled={dailyPushBusy}
                  trackColor={{ false: kindredDark.border, true: kindredDark.seal }}
                  ios_backgroundColor={kindredDark.border}
                />
              }
            />
            <Text
              style={[
                kindredType.caption,
                {
                  color: kindredDark.textMuted,
                  paddingHorizontal: kindredSpacing.md,
                  paddingBottom: kindredSpacing.sm,
                  lineHeight: 16,
                },
              ]}
            >
              {t(locale, 'settings.dailyPush.caption')}
            </Text>
          </Card>
        </View>

        <View>
          <SectionLabel>{t(locale, 'settings.reference.section')}</SectionLabel>
          <Card
            variant='outlined'
            padding='none'
            style={{ backgroundColor: kindredDark.card, gap: 0, borderRadius: 0 }}
          >
            <SettingsRow
              label={t(locale, 'settings.glossary.row')}
              onPress={() => router.push('/(settings)/glossary')}
            />
            <RowDivider />
            <SettingsRow
              label={t(locale, 'settings.terms.row')}
              onPress={() => router.push('/(settings)/terms')}
            />
          </Card>
        </View>

        <View>
          <SectionLabel>{t(locale, 'settings.legal.section')}</SectionLabel>
          <Card
            variant='outlined'
            padding='none'
            style={{ backgroundColor: kindredDark.card, gap: 0, borderRadius: 0 }}
          >
            <SettingsRow
              label={t(locale, 'settings.legal.privacy')}
              onPress={() => openLegal('/privacy')}
            />
            <RowDivider />
            <SettingsRow
              label={t(locale, 'settings.legal.terms')}
              onPress={() => openLegal('/terms')}
            />
          </Card>
        </View>

        {hasLinkedSignIn ? (
          <View style={{ alignItems: 'center', gap: kindredSpacing.lg, marginTop: kindredSpacing.md }}>
            <Pressable
              onPress={handleDeleteAccount}
              hitSlop={12}
              disabled={deletingAccount}
              style={{ opacity: deletingAccount ? 0.5 : 1 }}
            >
              <Text
                style={[
                  kindredType.caption,
                  { color: kindredDark.textMuted, textDecorationLine: 'underline' },
                ]}
              >
                {deletingAccount
                  ? t(locale, 'settings.deleteAccount.working')
                  : t(locale, 'settings.deleteAccount')}
              </Text>
            </Pressable>
            <Pressable onPress={handleSignOut} hitSlop={12}>
              <Text
                style={[
                  kindredType.caption,
                  { color: kindredDark.textMuted, textDecorationLine: 'underline' },
                ]}
              >
                {t(locale, 'settings.signOut')}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {__DEV__ ? (
          <View
            style={{ alignItems: 'center', marginTop: kindredSpacing.lg, gap: kindredSpacing.md }}
          >
            <Pressable onPress={cycleDevPro} hitSlop={12}>
              <Text
                style={[
                  kindredType.caption,
                  { color: kindredDark.accent, textDecorationLine: 'underline' },
                ]}
              >
                {`DEV · Pro: ${devPro === null ? 'off · real' : devPro === 'pro' ? 'PRO' : 'FREE'}`}
              </Text>
            </Pressable>
            <Pressable onPress={cycleDevLocale} hitSlop={12}>
              <Text
                style={[
                  kindredType.caption,
                  { color: kindredDark.accent, textDecorationLine: 'underline' },
                ]}
              >
                {`DEV · Locale: ${devLocale ?? 'auto (device)'}`}
              </Text>
            </Pressable>
            <Text
              selectable
              style={[kindredType.caption, { color: kindredDark.textMuted, fontSize: 10 }]}
            >
              {`uid · ${userId ?? '—'}`}
            </Text>
            <Pressable
              onPress={() =>
                Alert.alert(
                  'DEV · 抹除用户',
                  '清除本机该用户的全部本地信息（userId / deviceSecret / onboarding / 报告缓存）后重载，重新走 intro。服务端旧账号不动，本机会换一个新 id。',
                  [
                    { text: '取消', style: 'cancel' },
                    {
                      text: '抹除并重启',
                      style: 'destructive',
                      onPress: () => void devWipeUserAndRestart(),
                    },
                  ]
                )
              }
              hitSlop={12}
            >
              <Text
                style={[
                  kindredType.caption,
                  { color: kindredDark.seal, textDecorationLine: 'underline' },
                ]}
              >
                DEV · 抹除用户 + 重开 intro
              </Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                const n = await devClearReportCache()
                Alert.alert(
                  'DEV · 清报告缓存',
                  `已清除 ${n} 个键（章节 + chart-ready）。重开报告会重新取数 + 生成。`
                )
              }}
              hitSlop={12}
            >
              <Text
                style={[
                  kindredType.caption,
                  { color: kindredDark.accent, textDecorationLine: 'underline' },
                ]}
              >
                DEV · 清报告缓存（强制重生成）
              </Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                await resetOnboarding()
                await clearDraft()
                router.replace('/')
              }}
              hitSlop={12}
            >
              <Text
                style={[
                  kindredType.caption,
                  { color: kindredDark.seal, textDecorationLine: 'underline' },
                ]}
              >
                DEV · replay intro + reset onboarding
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push('/chapter-preview')} hitSlop={12}>
              <Text
                style={[
                  kindredType.caption,
                  { color: kindredDark.accent, textDecorationLine: 'underline' },
                ]}
              >
                DEV · 报告预览 (chapter-preview) →
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push('/(onboarding)/pair-input')} hitSlop={12}>
              <Text
                style={[
                  kindredType.caption,
                  { color: kindredDark.textMuted, textDecorationLine: 'underline' },
                ]}
              >
                DEV · 配对表单 (pair-input) →
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push('/(onboarding)/intro')} hitSlop={12}>
              <Text
                style={[
                  kindredType.caption,
                  { color: kindredDark.accent, textDecorationLine: 'underline' },
                ]}
              >
                DEV · intro (星引力动画) →
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                devReplaySplash()
                router.replace('/')
              }}
              hitSlop={12}
            >
              <Text
                style={[
                  kindredType.caption,
                  { color: kindredDark.accent, textDecorationLine: 'underline' },
                ]}
              >
                DEV · 进场动画 (home splash) →
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push('/(reading)')} hitSlop={12}>
              <Text
                style={[
                  kindredType.caption,
                  { color: kindredDark.accent, textDecorationLine: 'underline' },
                ]}
              >
                DEV · 个人报告首页 (reading) →
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      {userId ? (
        <EmailVerifyModal
          visible={emailModalOpen}
          userId={userId}
          currentEmail={userEmail}
          onSuccess={onEmailVerified}
          onClose={() => setEmailModalOpen(false)}
        />
      ) : null}

      <SignInSheet
        visible={signInOpen}
        onClose={() => setSignInOpen(false)}
        onAuthed={() => {
          setStatus('linked')
          void refreshProfile()
        }}
      />
    </SafeAreaView>
  )
}
