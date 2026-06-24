/**
 * ShareablePersonalCard — 9:16 portrait card for the personal 命书, captured as
 * PNG and shared to IG Story / 小红书 / X / WeChat.
 *
 * The single-person sibling of ShareableChapterCard, on the same 墨儀 system so
 * both reports share one visual identity:
 *
 *   Top      碑拓 essence seal (one of the six 章印, by chapter number) +
 *            chapter label + ancient chapter numeral
 *   Center   the lead line — a pulled line from the chapter, the star of the
 *            card (serif/cjk, a cinnabar seal-dot above it, never body text)
 *   Bottom   the identity line (日主 · 格局 — abstract, NEVER the birth date)
 *            + a cinnabar 永 signature seal + scannable install QR + brand url
 *
 * PRIVACY: this card must NEVER carry the birth date/time — only chart-derived,
 * non-identifying 命理 facts (日主/格局/用神). And, like the synastry card, it
 * must NEVER include body text; the lead line is the whole artefact, the link
 * drives the reader to the full report.
 *
 * Capture flow (caller responsibility): render off-screen → react-native-view-
 * shot captureRef → expo-sharing. See apps/kindred-app/lib/imageShare.ts.
 */

import { kindredDark, kindredPaper } from '@zhop/hexastral-tokens/kindred'
import { Text, View, type ViewProps } from 'react-native'
import type { GlyphKey } from '../glyphs'
import { isCjkLocale, kindredFonts } from '../kindredFonts'
import { spaceCjkLatin } from '../text'
import { AncientNumeral } from './AncientNumeral'
import { AncientSeal } from './AncientSeal'
import { QrCode } from './QrCode'

/** One of the six 章印 per chapter, so the share artefact varies like the report. */
const SEAL_BY_NUMBER: Record<number, GlyphKey> = {
  1: '見',
  2: '言',
  3: '北',
  4: '合',
  5: '月',
  6: '永',
}

export interface ShareablePersonalCardProps extends Omit<ViewProps, 'style'> {
  /** The pulled star line — a single sentence from the chapter, never body text. */
  leadLine: string
  /** Chapter label, e.g. 人格 / PERSONALITY. */
  chapterLabel: string
  /** 1-based chapter index — drives the ancient numeral + the essence seal. */
  chapterNumber?: number
  /** Abstract identity signature (日主 · 格局 · 用神). NEVER the birth date. */
  identityLine?: string
  /** Render size — default 1080x1920 for IG Story; reduce for inline preview. */
  width?: number
  height?: number
  /** Report locale — drives the title/quote fonts (Latin vs CJK serif). */
  locale?: string
  /** Brand URL shown at the footer (e.g. yuel.hexastral.com). */
  brandUrl?: string
  /** Full install URL (with scheme) baked into a SCANNABLE QR. */
  installUrl?: string
}

export function ShareablePersonalCard({
  leadLine,
  chapterLabel,
  chapterNumber = 1,
  identityLine,
  width = 1080,
  height = 1920,
  locale,
  brandUrl = 'yuel.hexastral.com',
  installUrl,
  ...rest
}: ShareablePersonalCardProps) {
  // Aspect-ratio scaler — design is authored against 1080x1920.
  const scale = width / 1080
  const s = (n: number) => Math.round(n * scale)

  const cjk = isCjkLocale(locale)
  // Non-CJK guard: un-glue any 命理 term embedded in Latin prose (no-op for CJK).
  const space = (str: string) => (cjk ? str : spaceCjkLatin(str))
  const titleFont = cjk ? kindredFonts.cjk : kindredFonts.display
  const quoteFont = cjk ? kindredFonts.cjk : kindredFonts.serifItalic
  const labelFont = cjk ? kindredFonts.cjk : kindredFonts.mono

  const numeral = chapterNumber >= 1 && chapterNumber <= 6 ? chapterNumber : undefined
  const seal = SEAL_BY_NUMBER[numeral ?? 1]

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
      {/* Top — 碑拓 essence seal + chapter label + chapter numeral */}
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
          {space(chapterLabel)}
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
      </View>

      {/* Center — the lead line, the star of the card. Cinnabar seal-dot above. */}
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
          {space(leadLine)}
        </Text>
      </View>

      {/* Bottom — identity signature + cinnabar 永 seal + install QR + brand */}
      <View style={{ alignItems: 'center', gap: s(40) }}>
        {identityLine ? (
          <Text
            style={{
              fontFamily: labelFont,
              fontSize: s(30),
              letterSpacing: s(4),
              color: kindredPaper.inkSoft,
              textAlign: 'center',
            }}
          >
            {space(identityLine)}
          </Text>
        ) : null}

        <AncientSeal
          glyph='永'
          size={s(132)}
          tile={kindredPaper.cinnabar}
          ink={kindredPaper.cinnabar}
          outline
          inset={0.78}
          strokeWidth={9}
        />

        {/* Scannable install QR — ink-on-paper so it blends into the card; the
            quiet zone is the paper ground. The mechanical path from a flat
            social image → App Store. Falls back to the text URL alone if no
            installUrl (or if the URL exceeds the encoder's version range). */}
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
