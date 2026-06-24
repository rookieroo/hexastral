/**
 * ShareableReadingCard — the WHOLE personal 命书 share card (the cover), the solo
 * sibling of ShareableSynastryCard. Captured off-screen as a 1080x1920 PNG and
 * handed to the native share sheet (see apps/kindred-app (reading)/full.tsx).
 *
 *   Top      命 brand eyebrow · the 日主 五行 as a 朱文 印章 (the self at its core
 *            — 五行 is the root of the 八字) · the reader's name
 *   Center   the 日主 essence (the hero, e.g. 甲木) + a one-line human hook drawn
 *            from the reading itself, a cinnabar seal-dot above
 *   Bottom   the 格局 word (the life pattern) · scannable install QR · brand url
 *
 * Same 墨儀 system as the chapter / synastry cards: pure 宣纸 (kindredPaper)
 * ground, hand-set glyphs, cinnabar reserved for the seal. Branding + the url are
 * baked in so an image stripped of its caption still markets itself.
 */

import { kindredPaper } from '@zhop/hexastral-tokens/kindred'
import { Text, View, type ViewProps } from 'react-native'
import type { GlyphKey } from '../glyphs'
import { isCjkLocale, kindredFonts } from '../kindredFonts'
import { spaceCjkLatin } from '../text'
import { AncientSeal } from './AncientSeal'
import { QrCode } from './QrCode'

/** 日主 五行 (Chinese or English) → the seal glyph carved into the 印章. */
const ELEMENT_SEAL: Record<string, GlyphKey> = {
  Wood: '木',
  Fire: '火',
  Earth: '土',
  Metal: '金',
  Water: '水',
  木: '木',
  火: '火',
  土: '土',
  金: '金',
  水: '水',
}

export interface ShareableReadingCardProps extends Omit<ViewProps, 'style'> {
  /** 日主 五行 (e.g. 木 / Wood) — carved into the 朱文 印章. */
  element?: string
  /** The hero line — the 日主 essence (e.g. 甲木 / Yang Wood). */
  essence: string
  /** 格局 word — the life pattern, shown as the bottom verdict (e.g. 食神格). */
  pattern?: string
  /** A one-line human hook (a sentence drawn from the reading). */
  tagline?: string
  /** The reader's name (or 你). */
  name?: string
  /** Render size — default 1080x1920 for IG Story; reduce for inline preview. */
  width?: number
  height?: number
  /** Report locale — drives fonts (Latin vs CJK serif). */
  locale?: string
  /** Brand url shown at the footer. */
  brandUrl?: string
  /** Full install url baked into a scannable QR (flat image → App Store). */
  installUrl?: string
}

export function ShareableReadingCard({
  element,
  essence,
  pattern,
  tagline,
  name,
  width = 1080,
  height = 1920,
  locale,
  brandUrl = 'kindred.hexastral.com',
  installUrl,
  ...rest
}: ShareableReadingCardProps) {
  const scale = width / 1080
  const s = (n: number) => Math.round(n * scale)

  const cjk = isCjkLocale(locale)
  const space = (str: string) => (cjk ? str : spaceCjkLatin(str))
  const titleFont = cjk ? kindredFonts.cjk : kindredFonts.display
  const quoteFont = cjk ? kindredFonts.cjk : kindredFonts.serifItalic
  const labelFont = cjk ? kindredFonts.cjk : kindredFonts.mono

  const sealGlyph = element ? ELEMENT_SEAL[element] : undefined
  const brandEyebrow = cjk ? '命 · YUEL' : 'YUEL · KINDRED'

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
      {/* Top — brand eyebrow + the 日主 五行 印章 + name */}
      <View style={{ alignItems: 'center', gap: s(48) }}>
        <Text
          style={{
            fontFamily: labelFont,
            fontSize: s(26),
            letterSpacing: s(8),
            color: kindredPaper.cinnabar,
            textTransform: cjk ? 'none' : 'uppercase',
          }}
        >
          {brandEyebrow}
        </Text>

        {/* 朱文 印章 — cinnabar tile with the 五行 glyph carved in paper white. */}
        {sealGlyph ? (
          <AncientSeal
            glyph={sealGlyph}
            size={s(184)}
            tile={kindredPaper.cinnabar}
            ink={kindredPaper.bg}
            inset={0.82}
          />
        ) : null}

        {name ? (
          <Text
            style={{
              fontFamily: labelFont,
              fontSize: s(30),
              letterSpacing: s(6),
              color: kindredPaper.muted,
            }}
          >
            {name}
          </Text>
        ) : null}
      </View>

      {/* Center — the 日主 essence is the star. Cinnabar seal-dot above; hook below. */}
      <View style={{ alignItems: 'center', gap: s(44) }}>
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
            fontFamily: titleFont,
            fontSize: cjk ? s(108) : s(82),
            lineHeight: cjk ? s(120) : s(90),
            color: kindredPaper.ink,
            letterSpacing: cjk ? s(8) : 0,
            textAlign: 'center',
          }}
        >
          {space(essence)}
        </Text>
        {tagline ? (
          <Text
            style={{
              fontFamily: quoteFont,
              fontStyle: cjk ? 'normal' : 'italic',
              fontSize: cjk ? s(48) : s(52),
              lineHeight: cjk ? s(78) : s(74),
              color: kindredPaper.inkSoft,
              textAlign: 'center',
            }}
          >
            {space(tagline)}
          </Text>
        ) : null}
      </View>

      {/* Bottom — 格局 word · install QR · brand */}
      <View style={{ alignItems: 'center', gap: s(40) }}>
        {pattern ? (
          <Text
            style={{
              fontFamily: labelFont,
              fontSize: s(34),
              letterSpacing: s(10),
              color: kindredPaper.bronze,
              textTransform: cjk ? 'none' : 'uppercase',
            }}
          >
            {pattern}
          </Text>
        ) : null}

        {installUrl ? (
          <QrCode
            value={installUrl}
            size={s(180)}
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
