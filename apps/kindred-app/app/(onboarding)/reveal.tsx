/**
 * Onboarding · Screen 8 — Reveal moment
 *
 * Plays the 2.7s RevealMoment animation while POST /api/bonds/solo runs in
 * background. The animation masks API latency; when both complete, the user
 * taps "Read your story →" and lands on /(bonds)/[id].
 *
 * Three terminal states:
 *  - ready    → CTA navigates to the new bond detail
 *  - paywall  → CTA replaced with upgrade prompt + Edit details fallback
 *  - error    → retry button + Edit details fallback
 *
 * Solo POST runs only when the user came through the "fill" path (otherMode);
 * for invite mode the bond already exists server-side, reveal just plays
 * + routes home.
 */

import {
  kindredDark,
  kindredPresets,
  kindredSpacing,
  kindredType,
} from '@zhop/hexastral-tokens/kindred'
import { RevealMoment, type TimeIndex, useSoloBond } from '@zhop/scenario-kindred'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { resolveLocale, t } from '@/lib/i18n'
import { clearDraft, useDraft } from '@/lib/onboardingDraft'
import { suppressNextSplash } from '@/lib/splash-control'
import { markOnboardingComplete } from '../index'

const NOON_SHICHEN: TimeIndex = 6

type Status = 'generating' | 'ready' | 'error'

function localeToBackendLang(loc: string): string {
  if (loc === 'en') return 'en-US'
  if (loc === 'ja') return 'ja-JP'
  if (loc === 'zh-Hant') return 'zh-TW'
  return 'zh-CN'
}

export default function RevealScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const draft = useDraft()
  const { create } = useSoloBond()
  const [status, setStatus] = useState<Status>('generating')
  const [bondId, setBondId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Solo POST runs only when fill-path produced enough data. Invite path
  // creates the bond on /invite send, so reveal just plays + routes home.
  const isSoloMode =
    draft.otherMode === 'fill' &&
    draft.otherName.length > 0 &&
    draft.otherSolarDate.length === 10 &&
    draft.otherGender !== null

  const runCreate = useCallback(async () => {
    if (!isSoloMode) {
      setStatus('ready')
      return
    }
    setStatus('generating')
    setErrorMsg(null)
    try {
      const gender = draft.otherGender
      if (gender == null) throw new Error('Missing gender')
      const result = await create({
        targetName: draft.otherName,
        relationshipLabel: draft.relationshipLabel || 'other',
        targetBirth: {
          solarDate: draft.otherSolarDate,
          timeIndex: (draft.otherTimeIndex ?? NOON_SHICHEN) as TimeIndex,
          gender,
          city: draft.otherBirthCity || undefined,
        },
        language: localeToBackendLang(locale),
      })
      setBondId(result.bondId)
      setStatus('ready')
    } catch (err) {
      const code = (err as Error & { code?: string }).code
      if (code === 'paywall_required' || code === 'subscription_required') {
        // Detour to the modal paywall. Keep status at 'generating' so the
        // RevealMoment animation isn't disrupted; the modal sits on top.
        router.push({
          pathname: '/(commerce)/paywall',
          params: { reason: err instanceof Error ? err.message : '' },
        })
        return
      }
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : String(err))
    }
  }, [isSoloMode, draft, locale, create, router])

  useEffect(() => {
    void runCreate()
  }, [runCreate])

  const handleContinue = useCallback(async () => {
    if (status !== 'ready') return
    await markOnboardingComplete()
    await clearDraft()
    suppressNextSplash()
    if (bondId) {
      router.replace({ pathname: '/(bonds)/[id]', params: { id: bondId } })
    } else {
      // No bond detail to land on → home (its Threads section shows the state).
      router.replace('/(reading)')
    }
  }, [status, bondId, router])

  if (status === 'error') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <View
          style={{
            flex: 1,
            paddingHorizontal: kindredSpacing.screenH,
            alignItems: 'center',
            justifyContent: 'center',
            gap: kindredSpacing.lg,
          }}
        >
          <Text style={[kindredType.title, { color: kindredDark.text, textAlign: 'center' }]}>
            {t(locale, 'reveal.error')}
          </Text>
          {errorMsg ? (
            <Text
              style={[kindredType.caption, { color: kindredDark.textMuted, textAlign: 'center' }]}
            >
              {errorMsg}
            </Text>
          ) : null}
          <Pressable onPress={() => void runCreate()} hitSlop={12}>
            <Text style={kindredPresets.ctaText}>{t(locale, 'reveal.retry')}</Text>
          </Pressable>
          <Pressable onPress={() => router.replace('/(onboarding)/self')} hitSlop={12}>
            <Text
              style={[
                kindredType.caption,
                { color: kindredDark.textMuted, textDecorationLine: 'underline' },
              ]}
            >
              {t(locale, 'reveal.back')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <RevealMoment
      selfGlyph='甲'
      otherGlyph='乙'
      playAnimation
      copy={{
        line1: t(locale, 'reveal.line1'),
        line2: t(locale, 'reveal.line2'),
        cta: status === 'generating' ? t(locale, 'reveal.generating') : t(locale, 'reveal.cta'),
      }}
      onContinue={handleContinue}
    />
  )
}
