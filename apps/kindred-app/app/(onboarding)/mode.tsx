/**
 * Threads · New thread (intent picker).
 *
 * Reached from the (reading) home "+" — the user already has their own solo
 * reading (ADR-0021 solo-first); this picks how to bring the other person in:
 *   - know   → /(onboarding)/other-meta  (name + relationship, then their birth)
 *   - invite → /(onboarding)/invite      (channel-agnostic share invite)
 *
 * The pre-K2 "skip" option is gone: there is nothing to skip to — the solo
 * reading already exists without a partner.
 *
 * On mount, fire ensureSelfBirthSynced() so the server has person A's birth
 * by the time the partner flow finishes (bond creation requires it).
 */

import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { KindredMoon } from '@/components/KindredMoon'
import { PrimaryButton } from '@/components/PrimaryButton'
import { useAuth } from '@/lib/auth'
import { type Locale, resolveLocale, type TranslationKey, t } from '@/lib/i18n'
import { updateDraft } from '@/lib/onboardingDraft'
import { ensureSelfBirthSynced } from '@/lib/selfBirth'

type Intent = 'know' | 'invite'

const OPTS: { key: Intent; label: TranslationKey; subtitle: TranslationKey }[] = [
  { key: 'know', label: 'pair.other.intent.know', subtitle: 'mode.know.hint' },
  { key: 'invite', label: 'pair.other.intent.invite', subtitle: 'mode.invite.hint' },
]

export default function ModeScreen() {
  const router = useRouter()
  const locale = useMemo<Locale>(() => resolveLocale(), [])
  const { userId } = useAuth()
  const [intent, setIntent] = useState<Intent>('know')

  // Pre-sync person A's birth to the server (no-op when already synced) so
  // the bond-creation calls at the end of either path never 400.
  useEffect(() => {
    if (userId) void ensureSelfBirthSynced(userId)
  }, [userId])

  const handleNext = () => {
    if (intent === 'know') {
      updateDraft({ otherMode: 'fill' })
      router.push('/(onboarding)/other-meta')
      return
    }
    updateDraft({ otherMode: 'invite' })
    router.push('/(onboarding)/invite')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: kindredSpacing.screenH,
          paddingTop: kindredSpacing.xl,
        }}
      >
        <View style={{ alignItems: 'center', marginBottom: kindredSpacing.xl }}>
          <KindredMoon size={56} />
        </View>
        <Text style={[kindredType.title, { color: kindredDark.text }]}>
          {t(locale, 'pair.other.title')}
        </Text>
        <Text
          style={[
            kindredType.body,
            { color: kindredDark.textSecondary, marginTop: kindredSpacing.sm },
          ]}
        >
          {t(locale, 'mode.subtitle')}
        </Text>
        <View style={{ height: kindredSpacing.xl }} />
        <View style={{ gap: kindredSpacing.sm }}>
          {OPTS.map((o) => (
            <IntentRow
              key={o.key}
              label={t(locale, o.label)}
              subtitle={t(locale, o.subtitle)}
              selected={intent === o.key}
              onPress={() => setIntent(o.key)}
            />
          ))}
        </View>
        <View style={{ flex: 1 }} />
        <PrimaryButton label={t(locale, 'common.next')} onPress={handleNext} />
        <View style={{ height: kindredSpacing.xl }} />
      </View>
    </SafeAreaView>
  )
}

function IntentRow({
  label,
  subtitle,
  selected,
  onPress,
}: {
  label: string
  subtitle: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole='radio'
      accessibilityState={{ selected }}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: kindredSpacing.md,
        paddingVertical: kindredSpacing.md,
        paddingHorizontal: kindredSpacing.md,
        borderWidth: 0.5,
        borderColor: selected ? kindredDark.accent : kindredDark.border,
        backgroundColor: selected ? `${kindredDark.accent}10` : 'transparent',
      }}
    >
      <View
        style={{
          width: 16,
          height: 16,
          borderRadius: 999,
          borderWidth: 1.5,
          borderColor: selected ? kindredDark.accent : kindredDark.borderStrong,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 4,
        }}
      >
        {selected && (
          <View
            style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: kindredDark.accent }}
          />
        )}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={[
            kindredType.body,
            { color: selected ? kindredDark.text : kindredDark.textSecondary },
          ]}
        >
          {label}
        </Text>
        <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>{subtitle}</Text>
      </View>
    </Pressable>
  )
}
