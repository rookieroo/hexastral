/**
 * /accept/[token] — B-user entry from the shared invite link / DDL claim.
 *
 * The invite is channel-agnostic (ADR-0021 §3): A shares a web URL through any
 * app (Messages / WhatsApp / WeChat / Mail / AirDrop), so nothing here assumes
 * email or SMS.
 *
 * Flow (corrected 2026-06):
 *   1. B opens the shared link → web /resonate/[token] (form-LESS by design)
 *      → "Open in Kindred" → App Store → install.
 *   2. The app's DDL handshake (via @zhop/ddl-client) resolves the pending
 *      claim and navigates here; if already installed the token comes straight
 *      through the URL.
 *   3. We load /api/bonds/invite/:token/info for context, THEN collect B's OWN
 *      birth on THIS screen. The web is form-less by design and DELEGATES the
 *      birth form to the app (see resonate/[token]/page.tsx) — it never ran
 *      here before, so /respond fired with no birthData and the server replied
 *      "Birth data required to accept". The BirthForm below closes that gap.
 *   4. On "Open the thread" → POST /respond { action:'accept', birthData } →
 *      navigate to /(bonds)/[bondId] (RevealMoment + report). B's birth is also
 *      saved as their own self-chart so B can read solo / invite others later.
 *
 * Presented as a modal; "Later" returns to the bonds list where the still
 * pending bond stays accessible.
 */

import {
  type BirthDateFieldValue,
  birthDateFieldLabelsForLocale,
  birthInputToSolar,
} from '@zhop/core-ui'
import { AutoMoonPhaseLoader } from '@zhop/core-ui/motion'
import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import { SKIN_CINNABAR } from '@zhop/hexastral-tokens/moon'
import {
  type PersonBirth,
  type RelationshipType,
  type TimeIndex,
  useBondInvitation,
} from '@zhop/scenario-kindred'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Linking, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BirthForm } from '@/components/BirthForm'
import { PrimaryButton } from '@/components/PrimaryButton'
import { GeneratingStages } from '@/components/reading/GeneratingStages'
import { YuelMark } from '@/components/YuelMark'
import { useAuth } from '@/lib/auth'
import { searchCity as searchCityApi } from '@/lib/geocode'
import { privacyPolicyUrl, type TranslationKey, useI18n } from '@/lib/i18n'
import { isPaywall } from '@/lib/inviteSubmit'
import { updateDraft, useDraft } from '@/lib/onboardingDraft'
import { setPendingOpenBond } from '@/lib/pending-open'
import {
  loadSelfBirth,
  type SelfBirth,
  saveSelfBirth,
  syncSelfBirthToServer,
} from '@/lib/selfBirth'
import { suppressNextSplash } from '@/lib/splash-control'
import { markOnboardingComplete } from '../index'

const RELATIONSHIP_I18N: Record<RelationshipType, TranslationKey> = {
  romantic: 'common.relationship.romantic',
  family: 'common.relationship.family',
  parent: 'common.relationship.parent',
  child: 'common.relationship.child',
  sibling: 'common.relationship.sibling',
  friend: 'common.relationship.friend',
  boss: 'common.relationship.boss',
  colleague: 'common.relationship.colleague',
  partner: 'common.relationship.partner',
  other: 'invite.accept.relationship.other',
}

/**
 * Map free-text relationshipLabel from API → enum used for the label lookup.
 * Loose match — falls back to 'other' if no synonym hits.
 */
function inferRelationshipType(label: string): RelationshipType {
  const lower = label.toLowerCase()
  if (/恋人|伴侣|partner|romantic/.test(lower)) return 'romantic'
  if (/朋友|friend/.test(lower)) return 'friend'
  if (/父母|长辈|長輩|目上|parent|elder/.test(lower)) return 'parent'
  if (/子女|晚辈|晚輩|目下|child|junior/.test(lower)) return 'child'
  if (/兄弟|姐妹|姊妹|兄弟姉妹|平辈|sibling|peer/.test(lower)) return 'sibling'
  if (/上司|老板|领导|boss|manager/.test(lower)) return 'boss'
  if (/家人|family/.test(lower)) return 'family' // legacy coarse label
  if (/合伙|business|cofounder/.test(lower)) return 'partner'
  if (/同事|同僚|colleague|coworker/.test(lower)) return 'colleague'
  return 'other'
}

function localeToLang(loc: string): string {
  if (loc === 'en') return 'en-US'
  if (loc === 'ja') return 'ja-JP'
  if (loc === 'zh-Hant') return 'zh-TW'
  return 'zh-CN'
}

/** Seed a BirthDateFieldValue from a draft's (solar) date string. */
function dateValueFromDraft(solar: string): BirthDateFieldValue {
  return {
    input: solar,
    calendar: 'solar',
    isLeap: false,
    solarDate: birthInputToSolar(solar, 'solar'),
  }
}

export default function AcceptTokenScreen() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const router = useRouter()
  const { locale, t } = useI18n()
  const { userId } = useAuth()
  const draft = useDraft()
  const { invitation, isLoading, error, respond } = useBondInvitation(token)
  const [accepting, setAccepting] = useState(false)
  const [respondError, setRespondError] = useState<string | null>(null)

  // Reset the stack to the home so Back can't return to onboarding/accept. This screen
  // is a MODAL pushed over the launch gate's screen — which is (onboarding) for a fresh
  // B — so a plain replace('/(reading)') only swapped the modal and left onboarding
  // underneath (2026-06: "走完合盘邀请流程后能从首页返回到 onboarding"). Dismiss the modal
  // first, then replace whatever's beneath (onboarding / home) with the home.
  const resetToHome = () => {
    try {
      router.dismissAll()
    } catch {}
    router.replace('/(reading)')
  }

  const lang = useMemo(() => localeToLang(locale), [locale])
  const privacyUrl = useMemo(() => privacyPolicyUrl(locale), [locale])
  const relationshipType = useMemo(
    () => (invitation ? inferRelationshipType(invitation.relationshipLabel) : 'other'),
    [invitation]
  )

  // B fills their OWN birth here (the web stays form-less by design and
  // delegates the form to the app). Reuses the self.* draft slots so it shares
  // the exact BirthForm + persistence path as onboarding self.
  const [selfDate, setSelfDate] = useState<BirthDateFieldValue>(() =>
    dateValueFromDraft(draft.selfSolarDate)
  )
  const scrollRef = useRef<ScrollView>(null)
  const searchCity = (query: string) => searchCityApi(query, lang, 7)

  // If B already has a saved self-birth (onboarded, or used the app before), skip the
  // birth form entirely and accept with it — re-entering birth on every invite is
  // pointless. `undefined` = still reading AsyncStorage; `null` = none on file.
  const [savedBirth, setSavedBirth] = useState<SelfBirth | null | undefined>(undefined)
  useEffect(() => {
    void loadSelfBirth().then(setSavedBirth)
  }, [])
  const hasSavedBirth =
    savedBirth != null &&
    !!savedBirth.solarDate &&
    savedBirth.timeIndex != null &&
    !!savedBirth.gender

  const selfSolar = selfDate.solarDate
  const birthFilled =
    hasSavedBirth ||
    (selfSolar !== null && draft.selfGender !== null && typeof draft.selfTimeIndex === 'number')

  // A's display name. The server sends the literal 'Someone' sentinel when A
  // gave no name (bonds.ts) — render a name-less phrasing in that case rather
  // than "Someone invited you".
  const inviterName = invitation?.inviterName ?? ''
  const hasName = inviterName.length > 0 && inviterName !== 'Someone'

  // Auto-fail safe if we somehow land here without a token
  useEffect(() => {
    if (!token) router.replace('/(reading)')
  }, [token, router])

  // Already-accepted (B re-opens the link, or the web already POSTed /respond) →
  // the bond is DONE and sits in their Threads. Don't strand them on the error
  // screen ("Invitation already accepted" with no way out): mark onboarded + send
  // them home so they can open the finished 合盘. Mirrors the handleOpen catch.
  const alreadyAccepted =
    error != null && (/already.?accepted/i.test(error.message) || /\b410\b/.test(error.message))
  useEffect(() => {
    if (alreadyAccepted) {
      void markOnboardingComplete()
      try {
        router.dismissAll()
      } catch {}
      router.replace('/(reading)')
    }
  }, [alreadyAccepted, router])

  const commitDate = (next: BirthDateFieldValue) => {
    setSelfDate(next)
    updateDraft({ selfSolarDate: next.solarDate ?? '' })
  }

  const handleOpen = async () => {
    if (!token) return
    // Prefer the saved self-birth (skip-form path); else the form-filled draft.
    const birth: SelfBirth | null =
      savedBirth?.solarDate && savedBirth.timeIndex != null && savedBirth.gender
        ? savedBirth
        : selfSolar !== null && draft.selfGender !== null && typeof draft.selfTimeIndex === 'number'
          ? {
              solarDate: selfSolar,
              timeIndex: draft.selfTimeIndex,
              gender: draft.selfGender,
              city: draft.selfBirthCity || undefined,
              lat: draft.selfBirthLat ?? undefined,
              lng: draft.selfBirthLng ?? undefined,
              timezone: draft.selfBirthTimezone ?? undefined,
              clockMinutes: draft.selfClockMinutes ?? undefined,
              calibrate: draft.selfCalibrate ?? undefined,
            }
          : null
    if (!birth || birth.timeIndex == null) return
    setAccepting(true)
    setRespondError(null)
    const birthData: PersonBirth = {
      solarDate: birth.solarDate,
      timeIndex: birth.timeIndex as TimeIndex,
      gender: birth.gender,
      city: birth.city || undefined,
      // Precise time + place → B's half of the chart gets 真太阳时 calibration too.
      clockMinutes: birth.clockMinutes ?? undefined,
      calibrate: birth.calibrate ?? undefined,
      longitude: birth.lng != null ? String(birth.lng) : undefined,
      timezoneId: birth.timezone ?? undefined,
    }
    try {
      // Persist B's birth as their own self-chart first, so even if they bail
      // after responding they keep a solo reading + can invite others.
      await saveSelfBirth(birth)
      const result = await respond(token, { action: 'accept', birthData, language: lang })
      if (userId) void syncSelfBirthToServer(userId, birth)
      // B is now a real user — has a chart + an active bond. Mark onboarding
      // done so the launch gate routes future opens to the home, NOT back into
      // the onboarding birth form (the trap that left B "stuck on the form").
      await markOnboardingComplete()
      // Hand the new bond to the home, which blooms its report in as the in-place
      // 水墨 overlay (the same smooth transition a thread tap uses) — no second
      // `/(bonds)/[id]` route pushed on top of the just-reset home (2026-06: "很容易
      // 产生多余的路由栈…没法丝滑的跳到报告页"). Suppress the cold-launch splash so the
      // hand-off into the report is one continuous motion.
      suppressNextSplash()
      setPendingOpenBond(result.bondId)
      resetToHome()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      // Already accepted (web POSTed respond, or a retry) → 410; treat as done.
      // Still mark onboarded + send home — the bond is already in their Threads.
      if (/already accepted/i.test(msg) || /410/.test(msg)) {
        await markOnboardingComplete()
        resetToHome()
        return
      }
      if (isPaywall(err)) {
        setAccepting(false)
        router.push({ pathname: '/(commerce)/paywall', params: { reason: msg } })
        return
      }
      // Any other failure: don't strand B on the accept screen — return to the
      // home, which auto-refreshes the thread list on focus, so the bond (created
      // server-side even if the report lagged) surfaces there (2026-06 feedback:
      // "如果中间有任何问题应该回到首页自动刷新列表").
      if (__DEV__) console.warn('[Yuel accept] open failed', err)
      suppressNextSplash()
      resetToHome()
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <YuelMark vertical size={72} color={kindredDark.seal} />
        </View>
      </SafeAreaView>
    )
  }

  // Accepting (B tapped Open) → the 合盘 is computing + the report generating. Show the
  // staged moon loader (对齐天干地支 → 八字 → 合盘 → 生成报告) at the moment B starts the
  // reading — not a bare button spinner. Same loader + stages the report uses, so the
  // wait reads as one continuous transition into the report.
  if (accepting) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: kindredSpacing.lg,
          }}
        >
          <AutoMoonPhaseLoader size={96} skin={SKIN_CINNABAR} />
          <GeneratingStages
            color={kindredDark.textSecondary}
            stages={[
              t('bond.stage.align'),
              t('bond.stage.bazi'),
              t('bond.stage.synastry'),
              t('bond.stage.report'),
            ]}
          />
        </View>
      </SafeAreaView>
    )
  }

  if (error || !invitation) {
    // Already-accepted is being auto-redirected by the effect above — show a calm
    // hold, not the red dead-end, while that happens.
    if (alreadyAccepted) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <YuelMark vertical size={72} color={kindredDark.seal} />
          </View>
        </SafeAreaView>
      )
    }
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <View
          style={{
            flex: 1,
            padding: kindredSpacing.lg,
            justifyContent: 'center',
            alignItems: 'center',
            gap: kindredSpacing.xl,
          }}
        >
          <Text style={[kindredType.body, { color: kindredDark.seal, textAlign: 'center' }]}>
            {error?.message ?? 'Invitation not found'}
          </Text>
          {/* Never a hard dead-end — always a way to the home (any finished bond
              is in Threads). */}
          <PrimaryButton
            label={t('invite.accept.later')}
            onPress={() => {
              void markOnboardingComplete()
              resetToHome()
            }}
            block={false}
          />
        </View>
      </SafeAreaView>
    )
  }

  // Date labels — core-ui defaults plus the app's calendar copy. Cheap to build
  // each render; no memo so there's no hook-dep bookkeeping for the bound `t`.
  const dateLabels = {
    ...birthDateFieldLabelsForLocale(lang),
    solar: t('pairInput.calendar.solar'),
    lunar: t('pairInput.calendar.lunar'),
    lunarHint: t('pairInput.calendar.lunarHint'),
  }
  const relationshipLabel = t(RELATIONSHIP_I18N[relationshipType])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }} edges={['top', 'bottom']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingHorizontal: kindredSpacing.screenH,
          paddingTop: kindredSpacing.xl,
          paddingBottom: kindredSpacing.xxl,
          gap: kindredSpacing.xl,
        }}
        keyboardShouldPersistTaps='handled'
        automaticallyAdjustKeyboardInsets
      >
        {/* Invite context — moon + who + relationship + optional note. */}
        <View style={{ alignItems: 'center', gap: kindredSpacing.md }}>
          <YuelMark vertical size={72} color={kindredDark.seal} />
          <Text style={[kindredType.heading, { color: kindredDark.text, textAlign: 'center' }]}>
            {hasName ? (
              <>
                {t('invite.accept.prefix')}
                <Text style={{ color: kindredDark.accent }}>{inviterName}</Text>
                {t('invite.accept.suffix')}
              </>
            ) : (
              t('invite.accept.anonTitle')
            )}
          </Text>
          {/* The relationship A declared, from B's side. relationshipLabel is the
              counterpart's role relative to the inviter (same direction as the bond
              list / solo / report), so it reads "你是 TA 的父母" — B is A's parent. The
              'other' catch-all isn't a role noun, so it stands alone instead of taking
              the possessive frame ("你们因缘相系"). */}
          <Text style={[kindredType.caption, { color: kindredDark.textSecondary }]}>
            {relationshipType === 'other'
              ? relationshipLabel
              : `${t('invite.accept.relationshipPrefix')}${relationshipLabel}`}
          </Text>
        </View>

        {invitation.message ? (
          <View
            style={{
              padding: kindredSpacing.lg,
              backgroundColor: kindredDark.card,
              borderLeftWidth: 2,
              borderLeftColor: kindredDark.accent,
            }}
          >
            <Text style={[kindredType.body, { color: kindredDark.text, fontStyle: 'italic' }]}>
              "{invitation.message}"
            </Text>
          </View>
        ) : null}

        {/* B's own birth — the form the web delegates here. Skipped entirely when B
            already has a saved birth (Open in Yuel shouldn't re-ask): we accept with
            the saved chart. Without a birth at all, /respond fails "Birth data
            required to accept", so the form fills that gap. */}
        {hasSavedBirth ? (
          <Text
            style={[
              kindredType.caption,
              { color: kindredDark.textMuted, lineHeight: 18, textAlign: 'center' },
            ]}
          >
            {t('invite.accept.usingSavedBirth')}
          </Text>
        ) : (
          <View style={{ gap: kindredSpacing.md }}>
            <Text style={[kindredType.title, { color: kindredDark.text }]}>
              {t('invite.accept.birthHeading')}
            </Text>
            <Text style={[kindredType.caption, { color: kindredDark.textMuted, lineHeight: 18 }]}>
              {t('invite.accept.birthHint')}
            </Text>
            <BirthForm
              locale={locale}
              lang={lang}
              date={selfDate}
              onDate={commitDate}
              dateLabels={dateLabels}
              timeIndex={draft.selfTimeIndex}
              onTime={(idx) => updateDraft({ selfTimeIndex: idx })}
              gender={draft.selfGender}
              onGender={(g) => updateDraft({ selfGender: g })}
              city={draft.selfBirthCity}
              lat={draft.selfBirthLat}
              lng={draft.selfBirthLng}
              timezone={draft.selfBirthTimezone}
              onCity={(patch) => updateDraft(patch)}
              searchCity={searchCity}
              fieldPrefix='self'
              allowPreciseTime
              clockMinutes={draft.selfClockMinutes}
              onClock={(min) => updateDraft({ selfClockMinutes: min })}
              calibrate={draft.selfCalibrate}
              onCalibrate={(on) => updateDraft({ selfCalibrate: on })}
              scrollRef={scrollRef}
            />
          </View>
        )}

        {/* Action-based consent — tapping "Open" IS the affirmative agreement. */}
        <Text
          style={[
            kindredType.caption,
            { color: kindredDark.textMuted, textAlign: 'center', lineHeight: 18 },
          ]}
        >
          {hasName ? (
            <>
              {t('invite.accept.consent.lead')}
              {inviterName}
              {t('invite.accept.consent.trail')}
            </>
          ) : (
            t('invite.accept.consent.anon')
          )}
          <Text
            style={{ color: kindredDark.accent, textDecorationLine: 'underline' }}
            onPress={() => Linking.openURL(privacyUrl)}
          >
            {t('invite.accept.consent.privacyPolicy')}
          </Text>
        </Text>

        {respondError ? (
          <Text style={[kindredType.caption, { color: kindredDark.seal, textAlign: 'center' }]}>
            {respondError}
          </Text>
        ) : null}

        <View style={{ gap: kindredSpacing.md, alignItems: 'center' }}>
          <View style={{ alignSelf: 'stretch' }}>
            <PrimaryButton
              label={t('invite.accept.open')}
              onPress={() => void handleOpen()}
              disabled={!birthFilled}
              loading={accepting}
            />
          </View>
          <Pressable
            onPress={() => {
              // Always leave a clean exit to the home — mark onboarded so the launch
              // gate doesn't bounce B back into onboarding next open, and reset the stack
              // so Back from home can't return to onboarding either.
              void markOnboardingComplete()
              resetToHome()
            }}
            hitSlop={12}
          >
            <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>
              {t('invite.accept.later')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
