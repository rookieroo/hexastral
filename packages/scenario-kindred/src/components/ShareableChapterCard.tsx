/**
 * ShareableChapterCard — 9:16 portrait card meant to be captured as PNG and
 * shared to IG Story / 小红书 / X / WeChat.
 *
 * Brought onto the 墨儀 system (the same visual identity as ChapterCard) so the
 * share artefact matches the report it came from:
 *
 *   Top      碑拓 essence seal + chapter title + ancient chapter numeral
 *            + 五行 element subtitle
 *   Center   the goldenLine — the star of the card (serif/cjk, a cinnabar
 *            seal-dot above it, never any body text)
 *   Bottom   the two bond names + a cinnabar 朱文 Kindred seal (合) + brand url
 *
 * No web widgets: no rounded-rect "logo bubble", no gradients. Pure 宣纸
 * (kindredPaper) ground, hand-authored glyphs, unified ancient numerals.
 *
 * Capture flow (caller responsibility):
 *   1. Render this in an off-screen `View` ref
 *   2. `react-native-view-shot` → captureRef → PNG
 *   3. `expo-sharing` or system share sheet
 *
 * IMPORTANT: this component must NEVER include the body text. Only the golden
 * line is the share artefact. Body text is what the post link drives users to.
 */

import { kindredDark, kindredPaper } from '@zhop/hexastral-tokens/kindred'
import { Text, View, type ViewProps } from 'react-native'
import { CHAPTER_SEAL } from '../glyphs'
import { isCjkLocale, kindredFonts } from '../kindredFonts'
import { spaceCjkLatin } from '../text'
import type { SynastryChapter } from '../types'
import { AncientNumeral } from './AncientNumeral'
import { AncientSeal } from './AncientSeal'
import { QrCode } from './QrCode'

const CHAPTER_TITLES: Record<SynastryChapter['kind'], string> = {
  first_impression: '第一印象',
  communication: '沟通方式',
  conflict: '冲突源头',
  complement: '互补之处',
  monthly_outlook: '本月运势',
  long_term_advice: '长期建议',
}

export interface ShareableChapterCardProps extends Omit<ViewProps, 'style'> {
  chapter: SynastryChapter
  selfName: string
  otherName: string
  /** Render size — default 1080x1920 for IG Story; reduce for inline preview */
  width?: number
  height?: number
  /** Report locale — drives the title/quote fonts (Latin vs CJK serif). */
  locale?: string
  /** Day-master 五行 — shown as the element subtitle under the title. */
  aElement?: string
  bElement?: string
  /** 1-based chapter index for the ancient numeral; defaults to 1. */
  chapterNumber?: number
  /** Optional brand URL shown at footer (e.g., yuel.hexastral.com) */
  brandUrl?: string
  /**
   * Full install/share URL (with scheme) baked into a SCANNABLE QR — the
   * mechanical path from a flat social image → App Store. When omitted, the
   * card falls back to the text brandUrl only.
   */
  installUrl?: string
}

export function ShareableChapterCard({
  chapter,
  selfName,
  otherName,
  width = 1080,
  height = 1920,
  locale,
  aElement,
  bElement,
  chapterNumber = 1,
  brandUrl = 'yuel.hexastral.com',
  installUrl,
  ...rest
}: ShareableChapterCardProps) {
  // Aspect-ratio scaler — design is authored against 1080x1920.
  const scale = width / 1080
  const s = (n: number) => Math.round(n * scale)

  const cjk = isCjkLocale(locale)
  // Non-CJK guard: un-glue any 命理 term embedded in Latin prose (no-op for CJK).
  const space = (s: string) => (cjk ? s : spaceCjkLatin(s))
  const titleFont = cjk ? kindredFonts.cjk : kindredFonts.display
  const quoteFont = cjk ? kindredFonts.cjk : kindredFonts.serifItalic
  const labelFont = cjk ? kindredFonts.cjk : kindredFonts.mono

  const seal = CHAPTER_SEAL[chapter.kind]
  const title = chapter.title || CHAPTER_TITLES[chapter.kind]
  const subtitle = aElement && bElement ? `${aElement}${cjk ? ' · ' : ' × '}${bElement}` : undefined
  // Ancient numerals only span 1-6; the report has exactly 6 chapters, but guard.
  const numeral = chapterNumber >= 1 && chapterNumber <= 6 ? chapterNumber : undefined

  return (
    <View
      {...rest}
      style={{
        width,
        height,
        backgroundColor: kindredPaper.bg,
        paddingHorizontal: s(96),
        paddingVertical: s(150),
        justifyContent: 'space-between',
      }}
    >
      {/* Top — 碑拓 essence seal + title + chapter numeral + element subtitle */}
      <View style={{ alignItems: 'center', gap: s(40) }}>
        {seal ? (
          <AncientSeal
            glyph={seal}
            size={s(184)}
            tile={kindredDark.bg}
            ink={kindredPaper.bg}
            inset={0.84}
          />
        ) : null}
        <Text
          style={{
            fontFamily: titleFont,
            fontSize: cjk ? s(88) : s(74),
            lineHeight: cjk ? s(96) : s(82),
            color: kindredPaper.ink,
            letterSpacing: cjk ? s(4) : 0,
            textAlign: 'center',
          }}
        >
          {space(title)}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(10) }}>
          <Text
            style={{
              fontFamily: labelFont,
              fontSize: s(26),
              letterSpacing: s(4),
              color: kindredPaper.muted,
              textTransform: cjk ? 'none' : 'uppercase',
            }}
          >
            {cjk ? '第' : 'Chapter'}
          </Text>
          {numeral ? (
            <AncientNumeral n={numeral} size={s(30)} color={kindredPaper.muted} strokeWidth={3.4} />
          ) : null}
        </View>
        {subtitle ? (
          <Text
            style={{
              fontFamily: labelFont,
              fontSize: s(28),
              letterSpacing: s(6),
              color: kindredPaper.muted,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Center — the golden line, the star of the card. Cinnabar seal-dot above. */}
      <View style={{ alignItems: 'center', gap: s(48) }}>
        <View
          style={{
            width: s(14),
            height: s(14),
            borderRadius: s(7),
            backgroundColor: kindredPaper.cinnabar,
          }}
        />
        <Text
          style={{
            fontFamily: quoteFont,
            fontStyle: cjk ? 'normal' : 'italic',
            fontSize: cjk ? s(60) : s(64),
            lineHeight: cjk ? s(96) : s(88),
            color: kindredPaper.ink,
            textAlign: 'center',
          }}
        >
          {space(chapter.goldenLine)}
        </Text>
      </View>

      {/* Bottom — names + cinnabar 朱文 Kindred seal (合) + brand */}
      <View style={{ alignItems: 'center', gap: s(40) }}>
        <Text
          style={{
            fontFamily: labelFont,
            fontSize: s(34),
            letterSpacing: s(6),
            color: kindredPaper.inkSoft,
          }}
        >
          {selfName} · {otherName}
        </Text>

        <AncientSeal
          glyph='合'
          size={s(132)}
          tile={kindredPaper.cinnabar}
          ink={kindredPaper.cinnabar}
          outline
          inset={0.78}
          strokeWidth={9}
        />

        {/* Scannable install QR — ink-on-paper so it blends into the card; the
            quiet zone is the paper ground. This is the mechanical path from a
            flat social image → App Store. Falls back to the text URL alone if
            no installUrl (or if the URL exceeds the encoder's version range). */}
        {installUrl ? (
          <QrCode
            value={installUrl}
            size={s(190)}
            color={kindredPaper.ink}
            background={kindredPaper.bg}
          />
        ) : null}

        <Text
          style={{
            fontFamily: labelFont,
            fontSize: s(26),
            letterSpacing: s(4),
            color: kindredPaper.muted,
          }}
        >
          {brandUrl}
        </Text>
      </View>
    </View>
  )
}
