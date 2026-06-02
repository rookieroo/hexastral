/**
 * Onboarding — the dual-tab 合盘 (pair) input screen.
 *
 * Collapses the former 5-screen flow (welcome → name → birth-info → mode →
 * invite-email | fill-other) into ONE screen with two tabs whose icons are
 * the intro stick figures: "you" and "them". Reduces friction for a two-person
 * product — A fills both sides if known, or invites TA, or skips for now.
 *
 * Three "them" paths:
 *   know   → route to /reveal (solo bond create runs there, masks latency)
 *   invite → POST /api/bonds/invite (mailto, deliveryMode 'user') → bonds waiting
 *   skip   → complete onboarding, land on the empty bonds list
 *
 * Entry from the intro animation passes `?intro=1` and plays a one-shot
 * "settle" entrance (the seated figures settle into the tab bar). All motion
 * is reanimated v4 + expo-haptics and degrades under reduced motion.
 *
 * The broader yuan v2 restructure (PairChartView, pager home, ReadingOverlay
 * reveal, move to (tabs)/) is deferred — see the sprint plan Part 2.
 */

import { yuanDark, yuanPresets, yuanSpacing, yuanType } from '@zhop/hexastral-tokens/yuan'
import {
  type RelationshipType,
  RelationshipTypeSelector,
  useBondInvitation,
} from '@zhop/scenario-yuan'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { type PairTab, PairTabBar } from '@/components/PairTabBar'
import { PersonFields } from '@/components/PersonFields'
import { type Locale, resolveLocale, type TranslationKey, t } from '@/lib/i18n'
import { deliverInviteMailto, isPaywall, isValidEmail, relationshipLabel } from '@/lib/inviteSubmit'
import { clearDraft, updateDraft, useDraft } from '@/lib/onboardingDraft'
import { markOnboardingComplete } from '../index'

type OtherIntent = 'know' | 'invite' | 'skip'

const INTENT_OPTIONS: { key: OtherIntent; label: TranslationKey }[] = [
  { key: 'know', label: 'pair.other.intent.know' },
  { key: 'invite', label: 'pair.other.intent.invite' },
  { key: 'skip', label: 'pair.other.intent.skip' },
]

export default function PairInputScreen() {
  const router = useRouter()
  const locale = useMemo<Locale>(() => resolveLocale(), [])
  const draft = useDraft()
  const reduced = useReducedMotion()
  const { intro } = useLocalSearchParams<{ intro?: string }>()
  const { create: createInvite } = useBondInvitation()

  const [activeTab, setActiveTab] = useState<PairTab>('self')
  const [intent, setIntent] = useState<OtherIntent>(
    draft.otherMode === 'invite' ? 'invite' : 'know'
  )
  const [inviteEmail, setInviteEmail] = useState<string>(draft.otherEmail)
  const [inviteRelType, setInviteRelType] = useState<RelationshipType>('romantic')
  const [sending, setSending] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // ── Completeness predicates (drive CTA + tab-bar hug) ──────────────────────
  const selfComplete =
    draft.selfSolarDate.length === 10 &&
    draft.selfBirthCity.trim().length > 0 &&
    draft.selfGender !== null
  const otherKnowComplete =
    draft.otherName.trim().length > 0 &&
    draft.otherSolarDate.length === 10 &&
    draft.otherBirthCity.trim().length > 0 &&
    draft.otherGender !== null &&
    draft.relationshipLabel.trim().length > 0
  const inviteComplete = isValidEmail(inviteEmail)
  const bothComplete = selfComplete && intent === 'know' && otherKnowComplete

  // ── One-shot "settle" entrance from intro ──────────────────────────────────
  const playSettle = intro === '1' && !reduced
  const settle = useSharedValue(playSettle ? 0 : 1)
  const contentIn = useSharedValue(playSettle ? 0 : 1)
  const didMount = useRef(false)
  useEffect(() => {
    if (didMount.current) return
    didMount.current = true
    if (!playSettle) {
      settle.value = 1
      contentIn.value = 1
      return
    }
    settle.value = withTiming(1, { duration: 580, easing: Easing.bezier(0.4, 0, 0.2, 1) })
    contentIn.value = withDelay(120, withTiming(1, { duration: 400 }))
  }, [playSettle, settle, contentIn])

  const tabBarStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + settle.value * 0.5,
    transform: [{ translateY: (1 - settle.value) * 60 }, { scale: 1 + (1 - settle.value) * 0.3 }],
  }))
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentIn.value,
    transform: [{ translateY: (1 - contentIn.value) * 12 }],
  }))

  // ── Submit paths ───────────────────────────────────────────────────────────
  const submitKnow = () => {
    // relationshipLabel + other* already in draft (PersonFields wrote them).
    updateDraft({ otherMode: 'fill' })
    router.push('/(onboarding)/reveal')
  }

  const submitInvite = async () => {
    setSending(true)
    setError(null)
    try {
      const label = relationshipLabel(inviteRelType, locale)
      const recipient = inviteEmail.trim()
      // deliveryMode defaults to 'user' server-side; targetEmail is intentionally
      // omitted so B's address never reaches our database.
      const result = await createInvite({
        targetName: recipient.split('@')[0] ?? '',
        relationshipLabel: label,
      })
      await deliverInviteMailto(recipient, result.mailto)
      updateDraft({ otherMode: 'invite', otherEmail: recipient, relationshipLabel: label })
      await markOnboardingComplete()
      await clearDraft()
      router.replace('/(bonds)')
    } catch (err) {
      if (isPaywall(err)) {
        setSending(false)
        router.push({
          pathname: '/(commerce)/paywall',
          params: { reason: err instanceof Error ? err.message : '' },
        })
        return
      }
      setError(err instanceof Error ? err.message : 'Failed')
      setSending(false)
    }
  }

  const submitSkip = async () => {
    // Self-only for now; TA can be added later from the bonds list.
    updateDraft({ otherMode: null })
    await markOnboardingComplete()
    await clearDraft()
    router.replace('/(bonds)')
  }

  // ── CTA shape by intent ─────────────────────────────────────────────────────
  const cta: { label: TranslationKey; enabled: boolean; onPress: () => void } =
    intent === 'invite'
      ? {
          label: 'pair.cta.invite',
          enabled: selfComplete && inviteComplete && !sending,
          onPress: () => void submitInvite(),
        }
      : intent === 'skip'
        ? { label: 'pair.cta.start', enabled: selfComplete, onPress: () => void submitSkip() }
        : {
            label: 'pair.cta.read',
            enabled: selfComplete && otherKnowComplete,
            onPress: submitKnow,
          }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: yuanDark.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={{ flex: 1, paddingHorizontal: yuanSpacing.screenH, paddingTop: yuanSpacing.lg }}
        >
          {/* Header — the folded welcome couplet */}
          <View style={{ alignItems: 'center', marginBottom: yuanSpacing.md }}>
            <Text style={[yuanType.heading, { color: yuanDark.text, textAlign: 'center' }]}>
              {t(locale, 'welcome.line1')}
            </Text>
            <Text
              style={[
                yuanType.body,
                { color: yuanDark.textSecondary, textAlign: 'center', marginTop: 2 },
              ]}
            >
              {t(locale, 'welcome.line2')}
            </Text>
          </View>

          {/* Stick-figure tab bar */}
          <Animated.View style={tabBarStyle}>
            <PairTabBar
              active={activeTab}
              onChange={setActiveTab}
              selfLabel={t(locale, 'pair.tab.self')}
              otherLabel={t(locale, 'pair.tab.other')}
              bothComplete={bothComplete}
            />
          </Animated.View>

          {/* Active tab body */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingTop: yuanSpacing.lg, paddingBottom: yuanSpacing.xl }}
            keyboardShouldPersistTaps='handled'
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={contentStyle}>
              {activeTab === 'self' ? (
                <>
                  <Text
                    style={[
                      yuanType.title,
                      { color: yuanDark.text, marginBottom: yuanSpacing.lg },
                    ]}
                  >
                    {t(locale, 'pair.self.title')}
                  </Text>
                  <PersonFields person='self' locale={locale} />
                </>
              ) : (
                <>
                  <Text
                    style={[
                      yuanType.title,
                      { color: yuanDark.text, marginBottom: yuanSpacing.lg },
                    ]}
                  >
                    {t(locale, 'pair.other.title')}
                  </Text>

                  {/* 3-way intent selector */}
                  <View style={{ gap: yuanSpacing.sm, marginBottom: yuanSpacing.lg }}>
                    {INTENT_OPTIONS.map((opt) => (
                      <IntentRow
                        key={opt.key}
                        label={t(locale, opt.label)}
                        selected={intent === opt.key}
                        onPress={() => setIntent(opt.key)}
                      />
                    ))}
                  </View>

                  {intent === 'know' && (
                    <PersonFields person='other' locale={locale} showRelationship />
                  )}

                  {intent === 'invite' && (
                    <View>
                      <TextInput
                        value={inviteEmail}
                        onChangeText={(v) => {
                          setInviteEmail(v)
                          updateDraft({ otherEmail: v })
                        }}
                        autoCapitalize='none'
                        autoComplete='email'
                        keyboardType='email-address'
                        placeholder='email@example.com'
                        placeholderTextColor={yuanDark.textMuted}
                        style={{
                          fontSize: yuanType.heading.fontSize,
                          color: yuanDark.text,
                          borderBottomWidth: 0.5,
                          borderBottomColor: yuanDark.border,
                          paddingVertical: yuanSpacing.md,
                        }}
                      />
                      <View style={{ height: yuanSpacing.lg }} />
                      <Text style={[yuanType.caption, { color: yuanDark.textSecondary }]}>
                        {t(locale, 'invite.subtitle')}
                      </Text>
                      <View style={{ height: yuanSpacing.sm }} />
                      <RelationshipTypeSelector value={inviteRelType} onChange={setInviteRelType} />
                      <View style={{ height: yuanSpacing.lg }} />
                      <Text style={[yuanType.caption, { color: yuanDark.textMuted }]}>
                        {t(locale, 'invite.hint')}
                      </Text>
                    </View>
                  )}

                  {intent === 'skip' && (
                    <Text style={[yuanType.body, { color: yuanDark.textSecondary }]}>
                      {t(locale, 'waiting.hint')}
                    </Text>
                  )}
                </>
              )}
            </Animated.View>
          </ScrollView>

          {/* CTA */}
          {error && (
            <Text
              style={[yuanType.caption, { color: yuanDark.seal, marginBottom: yuanSpacing.sm }]}
            >
              {error}
            </Text>
          )}
          <Pressable
            onPress={cta.onPress}
            disabled={!cta.enabled}
            hitSlop={12}
            style={{ alignSelf: 'flex-end', opacity: cta.enabled ? 1 : 0.3 }}
          >
            {sending ? (
              <ActivityIndicator color={yuanDark.accent} />
            ) : (
              <Text style={yuanPresets.ctaText}>{t(locale, cta.label)}</Text>
            )}
          </Pressable>
          <View style={{ height: yuanSpacing.lg }} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

interface IntentRowProps {
  label: string
  selected: boolean
  onPress: () => void
}

function IntentRow({ label, selected, onPress }: IntentRowProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole='radio'
      accessibilityState={{ selected }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: yuanSpacing.md,
        paddingVertical: yuanSpacing.md,
        paddingHorizontal: yuanSpacing.md,
        borderWidth: 0.5,
        borderColor: selected ? yuanDark.accent : yuanDark.border,
        backgroundColor: selected ? `${yuanDark.accent}10` : 'transparent',
      }}
    >
      <View
        style={{
          width: 16,
          height: 16,
          borderRadius: 999,
          borderWidth: 1.5,
          borderColor: selected ? yuanDark.accent : yuanDark.borderStrong,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected && (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              backgroundColor: yuanDark.accent,
            }}
          />
        )}
      </View>
      <Text style={[yuanType.body, { color: selected ? yuanDark.text : yuanDark.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  )
}
