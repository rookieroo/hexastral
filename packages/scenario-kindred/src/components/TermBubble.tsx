/**
 * TermBubble — the tap-to-explain popover for a 命理 term inside report prose.
 *
 * The synastry report is read against two systems (八字 + 紫微斗数), and the prose
 * names load-bearing terms — 用神, 命宫, 化忌, 七杀… A single tap on one opens this
 * calm centered card with its plain-language meaning (short gist + one-sentence
 * long form), so a reader never has to leave the page for the Settings glossary.
 *
 * Pure presentation: the caller resolves the term (getTermByZh) and owns the
 * open/close state. Themed to match the card it floats over (paper / dark).
 */

import type { ResolvedTerm } from '@zhop/astro-i18n'
import { Modal, Pressable, Text, View } from 'react-native'
import { kindredFonts } from '../kindredFonts'

export interface TermBubbleColors {
  bg: string
  ink: string
  inkSoft: string
  muted: string
  cinnabar: string
}

export interface TermBubbleProps {
  term: ResolvedTerm | null
  onClose: () => void
  colors: TermBubbleColors
  cjk: boolean
}

export function TermBubble({ term, onClose, colors, cjk }: TermBubbleProps) {
  const bodyFont = cjk ? kindredFonts.cjk : kindredFonts.serif
  const labelFont = cjk ? kindredFonts.cjk : kindredFonts.mono
  return (
    <Modal visible={term != null} transparent animationType='fade' onRequestClose={onClose}>
      {/* Tap the scrim to dismiss; the card swallows its own taps. */}
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: '#1a14108c',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
        }}
      >
        {term ? (
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              maxWidth: 380,
              width: '100%',
              backgroundColor: colors.bg,
              borderRadius: 14,
              paddingVertical: 22,
              paddingHorizontal: 24,
              gap: 10,
              shadowColor: '#3c2415',
              shadowOpacity: 0.28,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: 10 },
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
              <Text style={{ fontFamily: bodyFont, fontSize: 22, color: colors.ink }}>
                {term.zh}
              </Text>
              {!cjk && term.pinyin ? (
                <Text style={{ fontFamily: labelFont, fontSize: 12, color: colors.muted }}>
                  {term.pinyin}
                </Text>
              ) : null}
            </View>
            <Text
              style={{
                fontFamily: labelFont,
                fontSize: cjk ? 13 : 12,
                letterSpacing: cjk ? 1 : 1.6,
                color: colors.cinnabar,
              }}
            >
              {term.short}
            </Text>
            <Text
              style={{
                fontFamily: bodyFont,
                fontSize: cjk ? 15.5 : 16,
                lineHeight: cjk ? 26 : 24,
                color: colors.inkSoft,
              }}
            >
              {term.long}
            </Text>
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  )
}
