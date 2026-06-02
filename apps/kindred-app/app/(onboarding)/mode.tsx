/**
 * Onboarding · Now for them (intent picker).
 *
 * Reached after self birth-info is complete. Three paths:
 *   - know   → /(onboarding)/other-meta  (name + relationship, then their birth)
 *   - invite → /(onboarding)/invite      (mailto invite)
 *   - skip   → /(bonds)                  (finish self-only; can add TA later)
 *
 * Skip is the "relax the begin gate" affordance — once self is filled the
 * user can proceed without TA's data. V15Moon at the top keeps the brand
 * anchor consistent with self / home.
 */

import { V15Moon } from '@zhop/core-ui/motion'
import {
  kindredDark,
  kindredPresets,
  kindredSpacing,
  kindredType,
} from '@zhop/hexastral-tokens/kindred'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { type Locale, resolveLocale, type TranslationKey, t } from '@/lib/i18n'
import { clearDraft, updateDraft } from '@/lib/onboardingDraft'
import { suppressNextSplash } from '@/lib/splash-control'
import { markOnboardingComplete } from '../index'

type Intent = 'know' | 'invite' | 'skip'

const OPTS: { key: Intent; label: TranslationKey; subtitle: TranslationKey }[] = [
  { key: 'know', label: 'pair.other.intent.know', subtitle: 'mode.know.hint' },
  { key: 'invite', label: 'pair.other.intent.invite', subtitle: 'mode.invite.hint' },
  { key: 'skip', label: 'pair.other.intent.skip', subtitle: 'mode.skip.hint' },
]

export default function ModeScreen() {
  const router = useRouter()
  const locale = useMemo<Locale>(() => resolveLocale(), [])
  const [intent, setIntent] = useState<Intent>('know')

  const handleNext = async () => {
    if (intent === 'know') {
      updateDraft({ otherMode: 'fill' })
      router.push('/(onboarding)/other-meta')
      return
    }
    if (intent === 'invite') {
      updateDraft({ otherMode: 'invite' })
      router.push('/(onboarding)/invite')
      return
    }
    // skip → solo reading home (ADR-0021: A's own report needs no partner)
    updateDraft({ otherMode: null })
    await markOnboardingComplete()
    await clearDraft()
    suppressNextSplash()
    router.replace('/(reading)')
  }

  const ctaKey: TranslationKey = intent === 'skip' ? 'pair.cta.start' : 'common.next'

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
          <V15Moon size={56} />
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
        <Pressable onPress={() => void handleNext()} hitSlop={12} style={{ alignSelf: 'flex-end' }}>
          <Text style={kindredPresets.ctaText}>{t(locale, ctaKey)}</Text>
        </Pressable>
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
