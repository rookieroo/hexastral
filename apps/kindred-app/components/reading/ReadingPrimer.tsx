/**
 * ReadingPrimer — the one-time "how to read this" overlay.
 *
 * Shown ONCE on the first report open (gated by lib/primer-seen.ts) and
 * re-openable from the Symbol Glossary (the "replay" entry). It teaches the
 * three things needed to read confidently — who the two people are, that the ink
 * is an essence not a score, and the 划词 long-press — then gets out of the way.
 *
 * 2026-06 device QA: each point is now an icon + a localized title + body
 * (was a column of raw CJK marks 甲乙/水墨/划词, which read as cryptic for
 * non-Chinese users). The icon carries the meaning cross-culturally; CJK keeps
 * its characters in the title, non-CJK gets plain words. The English copy no
 * longer leans on 甲/乙 or 生/克/比和 at all. Paper (宣纸), to match the cream
 * report document it sits over — a dark scrim clashed once the report went paper.
 */

import { kindredPaper, kindredSpacing } from '@zhop/hexastral-tokens/kindred'
import { isCjkLocale, kindredFonts } from '@zhop/scenario-kindred'
import { type LucideIcon, Pointer, Sparkles, Users } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { type Locale, t } from '@/lib/i18n'

export interface ReadingPrimerProps {
  locale: Locale
  /** Dismiss (+ mark seen, when shown as the first-open primer). */
  onStart: () => void
  /** Open the full Symbol Glossary. */
  onOpenGlossary: () => void
}

export function ReadingPrimer({ locale, onStart, onOpenGlossary }: ReadingPrimerProps) {
  const cjk = isCjkLocale(locale)
  const serif = cjk ? kindredFonts.cjk : kindredFonts.serif
  const titleFont = cjk ? kindredFonts.cjk : kindredFonts.display

  const points: { Icon: LucideIcon; title: string; body: string }[] = [
    { Icon: Users, title: t(locale, 'primer.rolesTitle'), body: t(locale, 'primer.roles') },
    { Icon: Sparkles, title: t(locale, 'primer.essenceTitle'), body: t(locale, 'primer.essence') },
    { Icon: Pointer, title: t(locale, 'primer.gestureTitle'), body: t(locale, 'primer.gesture') },
  ]

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        // 宣纸 scrim — near-opaque cream so the report rests faintly behind.
        backgroundColor: 'rgba(244,243,239,0.97)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: kindredSpacing.xl,
      }}
    >
      <View style={{ width: '100%', maxWidth: 420, gap: kindredSpacing.xl }}>
        <Text
          style={{
            fontFamily: titleFont,
            fontSize: 26,
            letterSpacing: cjk ? 2 : 0,
            color: kindredPaper.ink,
            textAlign: 'center',
          }}
        >
          {t(locale, 'primer.title')}
        </Text>

        <View style={{ gap: kindredSpacing.lg }}>
          {points.map((p) => (
            <View
              key={p.title}
              style={{ flexDirection: 'row', gap: kindredSpacing.md, alignItems: 'flex-start' }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  borderWidth: 0.5,
                  borderColor: kindredPaper.bronze,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 1,
                }}
              >
                <p.Icon size={17} color={kindredPaper.bronze} strokeWidth={1.6} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text
                  style={{
                    fontFamily: serif,
                    fontSize: 16,
                    letterSpacing: cjk ? 1 : 0,
                    color: kindredPaper.ink,
                  }}
                >
                  {p.title}
                </Text>
                <Text
                  style={{
                    fontFamily: serif,
                    fontSize: 14,
                    lineHeight: 21,
                    color: kindredPaper.inkSoft,
                  }}
                >
                  {p.body}
                </Text>
              </View>
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
              borderBottomColor: kindredPaper.cinnabar,
              paddingBottom: 3,
            }}
          >
            <Text
              style={{
                fontFamily: serif,
                fontSize: 18,
                color: kindredPaper.ink,
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
                color: kindredPaper.muted,
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
