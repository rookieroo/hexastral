/**
 * ReadingPrimer — the one-time "how to read this" overlay.
 *
 * Founder note (2026-06): a first-time reader meets 甲/乙, a 水墨 picture and a
 * long-press gesture with no scaffolding. Shown ONCE on the first report open
 * (gated by lib/primer-seen.ts), it teaches the three things needed to read
 * confidently — who 甲/乙 are, that the ink is an essence not a score, and the
 * 划词 long-press — then gets out of the way. The full legend stays one tap
 * away (Symbol Glossary) for anyone who wants the rest.
 *
 * Dark to match the report it sits over; pure presentation (host owns the
 * seen-flag + navigation).
 */

import { kindredDark, kindredSpacing } from '@zhop/hexastral-tokens/kindred'
import { isCjkLocale, kindredFonts } from '@zhop/scenario-kindred'
import { Pressable, Text, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { type Locale, t } from '@/lib/i18n'

export interface ReadingPrimerProps {
  locale: Locale
  /** Dismiss + mark seen. */
  onStart: () => void
  /** Open the full Symbol Glossary. */
  onOpenGlossary: () => void
}

export function ReadingPrimer({ locale, onStart, onOpenGlossary }: ReadingPrimerProps) {
  const cjk = isCjkLocale(locale)
  const serif = cjk ? kindredFonts.cjk : kindredFonts.serif
  const points: { mark: string; text: string }[] = [
    { mark: '甲乙', text: t(locale, 'primer.roles') },
    { mark: '水墨', text: t(locale, 'primer.essence') },
    { mark: '划词', text: t(locale, 'primer.gesture') },
  ]

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      style={{
        ...StyleSheetAbsoluteFill,
        backgroundColor: 'rgba(12,10,9,0.92)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: kindredSpacing.xl,
      }}
    >
      <View style={{ width: '100%', maxWidth: 420, gap: kindredSpacing.xl }}>
        <Text
          style={{
            fontFamily: cjk ? kindredFonts.cjk : kindredFonts.display,
            fontSize: 26,
            letterSpacing: cjk ? 2 : 0,
            color: kindredDark.text,
            textAlign: 'center',
          }}
        >
          {t(locale, 'primer.title')}
        </Text>

        <View style={{ gap: kindredSpacing.lg }}>
          {points.map((p) => (
            <View
              key={p.mark}
              style={{ flexDirection: 'row', gap: kindredSpacing.md, alignItems: 'flex-start' }}
            >
              <Text
                style={{
                  fontFamily: serif,
                  fontSize: 17,
                  letterSpacing: 2,
                  color: kindredDark.accent,
                  width: 44,
                  marginTop: 1,
                }}
              >
                {p.mark}
              </Text>
              <Text
                style={{
                  flex: 1,
                  fontFamily: serif,
                  fontSize: 15,
                  lineHeight: 23,
                  color: kindredDark.textSecondary,
                }}
              >
                {p.text}
              </Text>
            </View>
          ))}
        </View>

        <View
          style={{ gap: kindredSpacing.md, alignItems: 'center', marginTop: kindredSpacing.sm }}
        >
          <Pressable
            onPress={onStart}
            accessibilityRole='button'
            style={{
              borderBottomWidth: 1,
              borderBottomColor: kindredDark.accent,
              paddingBottom: 3,
            }}
          >
            <Text
              style={{
                fontFamily: serif,
                fontSize: 18,
                color: kindredDark.text,
                letterSpacing: cjk ? 1 : 0,
              }}
            >
              {t(locale, 'primer.cta')}
            </Text>
          </Pressable>
          <Pressable onPress={onOpenGlossary} accessibilityRole='button' hitSlop={8}>
            <Text
              style={{
                fontFamily: kindredFonts.mono,
                fontSize: 11,
                letterSpacing: 1.5,
                color: kindredDark.textMuted,
                textTransform: 'uppercase',
              }}
            >
              {t(locale, 'primer.more')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  )
}

const StyleSheetAbsoluteFill = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 50,
}
