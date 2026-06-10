/**
 * PrimaryButton — the Kindred primary CTA.
 *
 * Replaces the old gold-underline *text* CTA (kindredPresets.ctaText), which
 * read as half-finished. This is a filled, tactile button: a Pressable wrapped
 * in usePressScale (reanimated v4, critically-damped — no bounce) that also
 * fires a light expo-haptics tap, so every primary action has weight.
 *
 * Two tones, mapped to the Kindred palette philosophy (kindred.ts):
 *   - 'gold' (default) — ink.gold ground; for ordinary advance/continue.
 *   - 'seal'           — cinnabar ground; reserved for the emotional peak
 *                        (one per screen, max — e.g. "pair up" / "read story").
 *
 * Dark-only app, so label colour flips to the dark ground for contrast on the
 * gold fill, and ivory on the cinnabar fill.
 */

import { usePressScale } from '@zhop/core-ui/motion'
import { kindredDark, kindredRadius, kindredSpacing } from '@zhop/hexastral-tokens/kindred'
import * as Haptics from 'expo-haptics'
import { ActivityIndicator, Pressable, Text } from 'react-native'
import Animated from 'react-native-reanimated'

export interface PrimaryButtonProps {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  /** 'gold' (default) for ordinary advance; 'seal' (cinnabar) for the peak moment. */
  tone?: 'gold' | 'seal'
  /**
   * true (default) — full-width (stretch), for form/screen-bottom CTAs.
   * false — content-width, centered; for empty/error states + hero pills where
   * a full-bleed bar would look heavy.
   */
  block?: boolean
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  tone = 'gold',
  block = true,
}: PrimaryButtonProps) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale()
  const inactive = disabled || loading

  const bg = tone === 'seal' ? kindredDark.seal : kindredDark.accent
  // Gold fill → dark label (the app's void bg); cinnabar fill → ivory label.
  const fg = tone === 'seal' ? kindredDark.textOnDark : kindredDark.bg

  const handlePress = () => {
    if (inactive) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined)
    onPress()
  }

  return (
    <Animated.View style={[{ alignSelf: block ? 'stretch' : 'center' }, animatedStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={inactive}
        accessibilityRole='button'
        accessibilityState={{ disabled: inactive }}
        accessibilityLabel={label}
        style={{
          backgroundColor: bg,
          opacity: disabled ? 0.35 : 1,
          borderRadius: kindredRadius.md,
          paddingVertical: kindredSpacing.md,
          paddingHorizontal: kindredSpacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: kindredSpacing.sm,
        }}
      >
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          // Restrained type scale, matching ming-pan's filled CTA (the premium
          // "金标准" reference): small, wide-tracked, not a chunky app button.
          <Text style={{ color: fg, fontSize: 14, fontWeight: '600', letterSpacing: 2 }}>
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  )
}
