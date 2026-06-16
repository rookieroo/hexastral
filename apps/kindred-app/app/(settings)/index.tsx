/**
 * Settings — email binding, account sign-in (Apple/Google sheet), sign out,
 * legal links (privacy / terms) the App Store requires, and a daily-reading
 * push toggle.
 *
 * Sign-in moved out of an inline Apple-only card into the shared
 * `<SignInSheet>` (Apple + Google, bottom-drawer) — matches the ming-pan
 * pattern the user asked for.
 */

import { Card } from '@zhop/core-ui'
import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { EmailVerifyModal } from '@/components/EmailVerifyModal'
import { SignInSheet } from '@/components/SignInSheet'
import { useAuth } from '@/lib/auth'
import { devClearReportCache, devSetServerPro, devWipeUserAndRestart } from '@/lib/dev-tools'
import { getKindredDevLocale, type Locale, resolveLocale, setKindredDevLocale, t } from '@/lib/i18n'
import { getKindredDevPro, type KindredDevPro, setKindredDevPro } from '@/lib/iap'
import { fetchMemoryPreference, setCrossAppMemory } from '@/lib/memory-preference'
import { clearDraft } from '@/lib/onboardingDraft'
import { getDailyPushEnabled, setDailyPushEnabled } from '@/lib/push-preference'
import { devReplaySplash } from '@/lib/splash-control'
import { resetOnboarding } from '../index'

// Privacy + Terms URLs — Apple App Store requires both to be reachable from
// inside a signed-in surface. Hosted on the LLC corp site so the legal
// document lives under our company entity, independent of the app brand.
const LEGAL_BASE = 'https://hexastral.com'
function legalUrl(path: '/privacy' | '/terms', locale: string): string {
  // Locale prefix matches hexastral-web's [locale] segment. Default falls
  // through to the English version when the user's locale isn't published.
  const known = ['en', 'zh', 'tw', 'ja']
  const seg = known.includes(locale) ? locale : 'en'
  return `${LEGAL_BASE}/${seg}${path}`
}

type Status = 'idle' | 'pending' | 'linked' | 'recovered' | 'already_linked' | 'error'

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  if (local.length <= 2) return `${local[0]}***@${domain}`
  return `${local.slice(0, 2)}***@${domain}`
}

// Birth-info edit row — self-contained strings (the spam/quota policy is
// specific to this entry). Routes to the shared self form in edit mode.
const BIRTH_COPY: Record<Locale, { section: string; row: string; hint: string }> = {
  en: {
    section: 'Birth info',
    row: 'Edit birth info',
    hint: 'Date · time · place. Editing regenerates your personal reading — one free change, then unlock. Synastry reports you have already generated are unchanged (they keep the birth info used at the time).',
  },
  zh: {
    section: '出生信息',
    row: '修改出生信息',
    hint: '出生日期 · 时辰 · 地点。修改会重新生成个人报告（免费仅 1 次，之后需解锁）；已生成的合盘报告不受影响，仍基于当时录入的生辰。',
  },
  'zh-Hant': {
    section: '出生資訊',
    row: '修改出生資訊',
    hint: '出生日期 · 時辰 · 地點。修改會重新生成個人報告（免費僅 1 次，之後需解鎖）；已生成的合盤報告不受影響，仍基於當時錄入的生辰。',
  },
  ja: {
    section: '出生情報',
    row: '出生情報を編集',
    hint: '生年月日 · 時辰 · 場所。編集すると個人レポートが再生成されます（無料は1回まで、以降は解除が必要）。すでに生成した相性レポートは当時の出生情報のまま変わりません。',
  },
}

export default function SettingsScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const { userId, userEmail, signOut, refreshProfile, setUserEmail } = useAuth()
  const [signInOpen, setSignInOpen] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [crossAppMemory, setCrossAppMemoryState] = useState(false)
  const [crossAppBusy, setCrossAppBusy] = useState(false)
  const [dailyPush, setDailyPushState] = useState(false)
  const [dailyPushBusy, setDailyPushBusy] = useState(false)
  // DEV-only Pro override — cycles Off (real RC) → PRO → FREE. Sets the client
  // override AND (TEMPORARY, removed at launch) grants/expires the real
  // `universe_pro` in the DB via devSetServerPro, so SERVER-gated Pro (timeline /
  // what-if / chapter wall / daily synastry) actually unlocks. Flip then re-open
  // the report to see it change.
  const [devPro, setDevPro] = useState<KindredDevPro>(getKindredDevPro())
  // DEV-only locale preview — cycle auto → en → zh → zh-Hant → ja so the report's
  // en-vs-CJK rendering can be QA'd on one device. Reopen the screen/report to
  // apply (resolveLocale is read once per mount).
  const [devLocale, setDevLocale] = useState<Locale | null>(getKindredDevLocale())
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
    // TEMPORARY (remove at launch): also flip the real server entitlement.
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

  useEffect(() => {
    if (!userId) return
    fetchMemoryPreference(userId)
      .then((p) => setCrossAppMemoryState(p.crossAppEnabled))
      .catch(() => {})
  }, [userId])

  const handleCrossAppToggle = async (value: boolean) => {
    if (!userId || crossAppBusy) return
    setCrossAppBusy(true)
    setCrossAppMemoryState(value)
    try {
      await setCrossAppMemory(userId, value)
    } catch {
      setCrossAppMemoryState(!value)
    } finally {
      setCrossAppBusy(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.replace('/')
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
        // Settings is now long enough (email + account + notifications + privacy +
        // legal + sign-out + DEV tools) that it needs to scroll on smaller phones.
        contentContainerStyle={{
          paddingHorizontal: kindredSpacing.screenH,
          paddingTop: kindredSpacing.xl,
          paddingBottom: kindredSpacing.xxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={[
            kindredType.seal,
            { color: kindredDark.textSecondary, marginBottom: kindredSpacing.md },
          ]}
        >
          {t(locale, 'settings.email.section')}
        </Text>

        <Card
          variant='outlined'
          padding='lg'
          style={{
            backgroundColor: kindredDark.card,
            gap: kindredSpacing.sm,
            marginBottom: kindredSpacing.lg,
          }}
        >
          {userEmail ? (
            <Text style={[kindredType.body, { color: kindredDark.text }]}>
              {maskEmail(userEmail)}
            </Text>
          ) : (
            <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>
              {t(locale, 'settings.email.notLinked')}
            </Text>
          )}
          <Pressable onPress={() => setEmailModalOpen(true)} hitSlop={8}>
            <Text style={[kindredType.caption, { color: kindredDark.accent }]}>
              {userEmail ? t(locale, 'settings.email.change') : t(locale, 'settings.email.link')}
            </Text>
          </Pressable>
          <Text style={[kindredType.caption, { color: kindredDark.textMuted, lineHeight: 18 }]}>
            {t(locale, 'settings.email.hint')}
          </Text>
        </Card>

        <Text
          style={[
            kindredType.seal,
            { color: kindredDark.textSecondary, marginBottom: kindredSpacing.md },
          ]}
        >
          {t(locale, 'settings.account')}
        </Text>

        {/* Account — single Sign-in CTA that lifts the multi-provider drawer
            (Apple + Google). Replaces the Apple-only inline button so the
            UI matches ming-pan's sheet pattern the user asked for. The "✓
            linked / recovered" status text fades back in once SignInSheet's
            onAuthed callback fires and the profile email is refetched. */}
        <Card
          variant='outlined'
          padding='lg'
          style={{ backgroundColor: kindredDark.card, gap: kindredSpacing.sm }}
        >
          <Pressable
            onPress={() => setSignInOpen(true)}
            hitSlop={8}
            style={({ pressed }) => ({
              paddingVertical: kindredSpacing.md,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={[kindredType.body, { color: kindredDark.text }]}>
              {t(locale, 'signIn.title')}
            </Text>
            <Text
              style={[
                kindredType.caption,
                { color: kindredDark.textMuted, lineHeight: 18, marginTop: kindredSpacing.xs },
              ]}
            >
              {t(locale, 'settings.signInWithApple.hint')}
            </Text>
          </Pressable>

          {status === 'linked' || status === 'already_linked' ? (
            <Text style={[kindredType.caption, { color: kindredDark.accent }]}>
              ✓ {t(locale, 'settings.linked')}
            </Text>
          ) : null}
          {status === 'recovered' ? (
            <Text style={[kindredType.caption, { color: kindredDark.accent }]}>
              ✓ {t(locale, 'settings.recovered')}
            </Text>
          ) : null}
        </Card>

        <View style={{ height: kindredSpacing.lg }} />

        {/* Birth info — the only edit entry for an existing user. The shared
            self form (mode=edit) carries the regenerate + one-free-change
            warning; a free user's 2nd chart-altering edit 403s → paywall. */}
        <Text
          style={[
            kindredType.seal,
            { color: kindredDark.textSecondary, marginBottom: kindredSpacing.md },
          ]}
        >
          {BIRTH_COPY[locale].section}
        </Text>

        <Card variant='outlined' padding='lg' style={{ backgroundColor: kindredDark.card, gap: 0 }}>
          <Pressable
            onPress={() =>
              router.push({ pathname: '/(onboarding)/self', params: { mode: 'edit' } })
            }
            hitSlop={4}
            style={({ pressed }) => ({
              paddingVertical: kindredSpacing.md,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={[kindredType.body, { color: kindredDark.text }]}>
              {BIRTH_COPY[locale].row}
            </Text>
            <Text
              style={[
                kindredType.caption,
                { color: kindredDark.textMuted, lineHeight: 18, marginTop: kindredSpacing.xs },
              ]}
            >
              {BIRTH_COPY[locale].hint}
            </Text>
          </Pressable>
        </Card>

        <View style={{ height: kindredSpacing.lg }} />

        <Text
          style={[
            kindredType.seal,
            { color: kindredDark.textSecondary, marginBottom: kindredSpacing.md },
          ]}
        >
          {t(locale, 'settings.privacy.section')}
        </Text>

        <Card
          variant='outlined'
          padding='lg'
          style={{ backgroundColor: kindredDark.card, gap: kindredSpacing.sm }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: kindredSpacing.md,
            }}
          >
            <Text style={[kindredType.body, { color: kindredDark.text, flex: 1 }]}>
              {t(locale, 'settings.crossAppMemory.label')}
            </Text>
            <Switch
              value={crossAppMemory}
              onValueChange={handleCrossAppToggle}
              disabled={crossAppBusy || !userId}
              trackColor={{ false: kindredDark.border, true: kindredDark.seal }}
              ios_backgroundColor={kindredDark.border}
            />
          </View>
          <Text style={[kindredType.caption, { color: kindredDark.textMuted, lineHeight: 18 }]}>
            {t(locale, 'settings.crossAppMemory.hint')}
          </Text>
        </Card>

        <View style={{ height: kindredSpacing.lg }} />

        {/* Notifications — daily reading nudge. Delivery is server-driven
            (svc-notify cron), so the toggle persists the user's preference
            and the API reads it on profile sync. Off by default to avoid
            unsolicited push (App Store guideline). */}
        <Text
          style={[
            kindredType.seal,
            { color: kindredDark.textSecondary, marginBottom: kindredSpacing.md },
          ]}
        >
          {t(locale, 'settings.notifications.section')}
        </Text>

        <Card
          variant='outlined'
          padding='lg'
          style={{ backgroundColor: kindredDark.card, gap: kindredSpacing.sm }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: kindredSpacing.md,
            }}
          >
            <Text style={[kindredType.body, { color: kindredDark.text, flex: 1 }]}>
              {t(locale, 'settings.dailyPush.label')}
            </Text>
            <Switch
              value={dailyPush}
              onValueChange={handleDailyPushToggle}
              disabled={dailyPushBusy}
              trackColor={{ false: kindredDark.border, true: kindredDark.seal }}
              ios_backgroundColor={kindredDark.border}
            />
          </View>
          <Text style={[kindredType.caption, { color: kindredDark.textMuted, lineHeight: 18 }]}>
            {t(locale, 'settings.dailyPush.hint')}
          </Text>
        </Card>

        <View style={{ height: kindredSpacing.lg }} />

        {/* Reference — decodes the report's hand-built visual language (seals,
            朱批 severity, 五行 用神 keys, ancient numerals). The report cards
            label nothing inline, so this glossary is the one map-legend. */}
        <Text
          style={[
            kindredType.seal,
            { color: kindredDark.textSecondary, marginBottom: kindredSpacing.md },
          ]}
        >
          {t(locale, 'settings.reference.section')}
        </Text>

        <Card variant='outlined' padding='lg' style={{ backgroundColor: kindredDark.card, gap: 0 }}>
          <Pressable
            onPress={() => router.push('/(settings)/glossary')}
            hitSlop={4}
            style={({ pressed }) => ({
              paddingVertical: kindredSpacing.md,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={[kindredType.body, { color: kindredDark.text }]}>
              {t(locale, 'settings.glossary.row')}
            </Text>
            <Text
              style={[
                kindredType.caption,
                { color: kindredDark.textMuted, lineHeight: 18, marginTop: kindredSpacing.xs },
              ]}
            >
              {t(locale, 'settings.glossary.hint')}
            </Text>
          </Pressable>
        </Card>

        <View style={{ height: kindredSpacing.lg }} />

        {/* Legal — App Store requires Privacy + Terms to be reachable from
            the signed-in surface. We open the hosted versions on hexastral.com
            so the documents stay versioned in one place. */}
        <Text
          style={[
            kindredType.seal,
            { color: kindredDark.textSecondary, marginBottom: kindredSpacing.md },
          ]}
        >
          {t(locale, 'settings.legal.section')}
        </Text>

        <Card variant='outlined' padding='lg' style={{ backgroundColor: kindredDark.card, gap: 0 }}>
          <Pressable
            onPress={() => openLegal('/privacy')}
            hitSlop={4}
            style={({ pressed }) => ({
              paddingVertical: kindredSpacing.md,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={[kindredType.body, { color: kindredDark.text }]}>
              {t(locale, 'settings.legal.privacy')}
            </Text>
          </Pressable>
          <View style={{ height: 0.5, backgroundColor: kindredDark.border }} />
          <Pressable
            onPress={() => openLegal('/terms')}
            hitSlop={4}
            style={({ pressed }) => ({
              paddingVertical: kindredSpacing.md,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={[kindredType.body, { color: kindredDark.text }]}>
              {t(locale, 'settings.legal.terms')}
            </Text>
          </Pressable>
        </Card>

        <View style={{ height: kindredSpacing.xxl }} />

        <Pressable onPress={handleSignOut} hitSlop={12} style={{ alignSelf: 'center' }}>
          <Text
            style={[
              kindredType.caption,
              {
                color: kindredDark.textMuted,
                textDecorationLine: 'underline',
              },
            ]}
          >
            {t(locale, 'settings.signOut')}
          </Text>
        </Pressable>
        <Text
          style={[
            kindredType.caption,
            { color: kindredDark.textMuted, textAlign: 'center', marginTop: kindredSpacing.xs },
          ]}
        >
          {t(locale, 'settings.signOut.hint')}
        </Text>

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
            {/* DEV launchers — jump straight into a scene without resetting state,
                so intro / splash / report are quick to iterate on + repro. */}
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
        onAuthed={() => setStatus('linked')}
      />
    </SafeAreaView>
  )
}
