import { Text, TouchableOpacity, View } from 'react-native'
import { theme, useTheme } from '@/lib/theme'
import { C } from './constants'
import { onboardingStyles as ob } from './styles'
import type { OnboardingStep } from './types'
import { ONBOARDING_STEP_ORDER } from './types'

export function StepProgress({ step, dark }: { step: OnboardingStep; dark: boolean }) {
  const { colors } = useTheme()
  const T = dark ? theme.dark : colors
  const idx = ONBOARDING_STEP_ORDER.indexOf(step)
  const pct = idx / (ONBOARDING_STEP_ORDER.length - 1)
  return (
    <View style={[ob.progressTrack, { backgroundColor: T.border }]}>
      <View
        style={[
          ob.progressFill,
          { width: `${Math.round(pct * 100)}%`, backgroundColor: T.primary },
        ]}
      />
    </View>
  )
}

// ─── Brutalist CTA button ─────────────────────────────────────────────────────

/**
 * dark=true  → thin border + accent-coloured text (dark steps)
 * dark=false → solid #0F0F0F fill + cream text (light steps, Co-Star style)
 */
export function CTAButton({
  label,
  onPress,
  disabled,
  accent,
  dark = true,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  accent?: string
  dark?: boolean
}) {
  if (!dark) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        style={[ob.ctaLight, disabled && { opacity: 0.35 }]}
      >
        <Text style={ob.ctaLightLabel}>{label}</Text>
      </TouchableOpacity>
    )
  }
  const borderColor = accent ?? C.primary
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.65}
      style={[ob.cta, { borderColor }, disabled && ob.ctaDisabled]}
    >
      <Text style={[ob.ctaLabel, { color: disabled ? C.muted : borderColor }]}>{label}</Text>
    </TouchableOpacity>
  )
}

// ─── Skip / ghost link ───────────────────────────────────────────────────────

export function SkipLink({
  onPress,
  label = 'SKIP',
  dark = true,
}: {
  onPress: () => void
  label?: string
  dark?: boolean
}) {
  return (
    <TouchableOpacity onPress={onPress} style={ob.skipLink} hitSlop={10}>
      <Text style={[ob.skipText, !dark && ob.skipTextLight]}>{label}</Text>
    </TouchableOpacity>
  )
}
