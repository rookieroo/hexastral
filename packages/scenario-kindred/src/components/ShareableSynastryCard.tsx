/**
 * ShareableSynastryCard — the WHOLE-report 合盘 share card (the cover), the
 * sibling of ShareableChapterCard (which shares one chapter's golden line).
 *
 * Captured off-screen as a 1080x1920 PNG and handed to the native share sheet
 * (see apps/kindred-app (bonds)/[id].tsx). The per-chapter card sells ONE
 * insight; this one sells the relationship at a glance — the archetype is the
 * star, the way the golden line is the star of the chapter card.
 *
 *   Top      缘 brand eyebrow · the two day-master elements as cinnabar/bronze
 *            seals joined by a 红线 (you · TA), with the pair's names
 *   Center   the archetype name (the hero) + its one-line tagline, a cinnabar
 *            seal-dot above — never the raw score (ADR: a couple shouldn't wear
 *            a public "number"; the category WORD carries the verdict instead)
 *   Bottom   the category word (相生 / In harmony) · 合 seal · scannable install
 *            QR · brand url
 *
 * Same 墨儀 system as ShareableChapterCard: pure 宣纸 (kindredPaper) ground,
 * hand-set glyphs, cinnabar reserved for the seal + thread. No gradients, no
 * rounded-rect "logo bubble". Branding + the url are baked in so an image that
 * loses its caption still markets itself.
 */

import { kindredPaper } from '@zhop/hexastral-tokens/kindred'
import { Text, View, type ViewProps } from 'react-native'
import { isCjkLocale, kindredFonts } from '../kindredFonts'
import { spaceCjkLatin } from '../text'
import { AncientSeal } from './AncientSeal'
import { QrCode } from './QrCode'

/** 合盘 archetype category → the WORD shown in place of the numeric score
 *  ("换成词语"): a couple reads a verdict, not a grade. */
const CATEGORY_WORD: Record<string, { zh: string; zhHant: string; en: string }> = {
  harmony: { zh: '相生', zhHant: '相生', en: 'In harmony' },
  tension: { zh: '相激', zhHant: '相激', en: 'In tension' },
  growth: { zh: '相成', zhHant: '相成', en: 'In growth' },
  karmic: { zh: '宿缘', zhHant: '宿緣', en: 'Karmic tie' },
  volatile: { zh: '相荡', zhHant: '相盪', en: 'Volatile' },
}

/** English 五行 word → single glyph, so a "Fire"/"Metal" element renders as one
 *  seal char. A value that's already a single CJK glyph passes through. */
const ELEMENT_GLYPH: Record<string, string> = {
  Wood: '木',
  Fire: '火',
  Earth: '土',
  Metal: '金',
  Water: '水',
}

function elementGlyph(el?: string): string | null {
  if (!el) return null
  if (ELEMENT_GLYPH[el]) return ELEMENT_GLYPH[el]
  // Already a glyph (木火土金水) or a localized short label — take the first char.
  return [...el][0] ?? null
}

function categoryWord(category: string | undefined, locale: string | undefined): string | null {
  if (!category) return null
  const row = CATEGORY_WORD[category]
  if (!row) return null
  if (locale === 'zh-Hant' || locale === 'zh-TW' || locale === 'zh-HK') return row.zhHant
  if (locale?.startsWith('zh')) return row.zh
  return row.en
}

export interface ShareableSynastryCardProps extends Omit<ViewProps, 'style'> {
  /** Archetype name — the hero of the card (e.g. 木火通明). */
  archetypeName: string
  /** One-line tagline under the archetype (e.g. 他给你燃料，你给他光). */
  tagline?: string
  /** harmony | tension | growth | karmic | volatile — drives the verdict word. */
  archetypeCategory?: string
  /** The reader ("you") and the counterpart, in reading order. */
  youName: string
  taName: string
  /** Day-master 五行 of each side — rendered as the two joined seals. */
  youElement?: string
  taElement?: string
  /** Render size — default 1080x1920 for IG Story; reduce for inline preview. */
  width?: number
  height?: number
  /** Report locale — drives fonts (Latin vs CJK serif) + the verdict word. */
  locale?: string
  /** Brand url shown at the footer. */
  brandUrl?: string
  /** Full install url baked into a scannable QR (flat image → App Store). */
  installUrl?: string
}

export function ShareableSynastryCard({
  archetypeName,
  tagline,
  archetypeCategory,
  youName,
  taName,
  youElement,
  taElement,
  width = 1080,
  height = 1920,
  locale,
  brandUrl = 'kindred.hexastral.com',
  installUrl,
  ...rest
}: ShareableSynastryCardProps) {
  const scale = width / 1080
  const s = (n: number) => Math.round(n * scale)

  const cjk = isCjkLocale(locale)
  const space = (str: string) => (cjk ? str : spaceCjkLatin(str))
  const titleFont = cjk ? kindredFonts.cjk : kindredFonts.display
  const quoteFont = cjk ? kindredFonts.cjk : kindredFonts.serifItalic
  const labelFont = cjk ? kindredFonts.cjk : kindredFonts.mono

  const youEl = elementGlyph(youElement)
  const taEl = elementGlyph(taElement)
  const verdict = categoryWord(archetypeCategory, locale)
  const brandEyebrow = cjk ? '缘 · YUEL' : 'YUEL · KINDRED'

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
      {/* Top — brand eyebrow + the two element seals joined by a 红线 + names */}
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

        {youEl && taEl ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ElementSeal glyph={youEl} color={kindredPaper.cinnabar} size={s(132)} font={titleFont} />
            <Thread width={s(120)} color={kindredPaper.cinnabar} />
            <ElementSeal glyph={taEl} color={kindredPaper.bronze} size={s(132)} font={titleFont} />
          </View>
        ) : null}

        <Text
          style={{
            fontFamily: labelFont,
            fontSize: s(30),
            letterSpacing: s(6),
            color: kindredPaper.muted,
          }}
        >
          {youName} · {taName}
        </Text>
      </View>

      {/* Center — the archetype is the star. Cinnabar seal-dot above; tagline below. */}
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
          {space(archetypeName)}
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

      {/* Bottom — verdict WORD (never the number) · 合 seal · install QR · brand */}
      <View style={{ alignItems: 'center', gap: s(40) }}>
        {verdict ? (
          <Text
            style={{
              fontFamily: labelFont,
              fontSize: s(34),
              letterSpacing: s(10),
              color: kindredPaper.bronze,
              textTransform: cjk ? 'none' : 'uppercase',
            }}
          >
            {verdict}
          </Text>
        ) : null}

        <AncientSeal
          glyph='合'
          size={s(124)}
          tile={kindredPaper.cinnabar}
          ink={kindredPaper.cinnabar}
          outline
          inset={0.78}
          strokeWidth={9}
        />

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

/** One day-master element as a thin ring holding its 五行 glyph. */
function ElementSeal({
  glyph,
  color,
  size,
  font,
}: {
  glyph: string
  color: string
  size: number
  font: string
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: Math.max(2, Math.round(size * 0.028)),
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: font, fontSize: size * 0.46, color }}>{glyph}</Text>
    </View>
  )
}

/** The 红线 between the two seals — a hairline with a knot at its middle. */
function Thread({ width, color }: { width: number; color: string }) {
  const knot = Math.max(8, Math.round(width * 0.075))
  return (
    <View style={{ width, height: knot, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: color }} />
      <View
        style={{ width: knot, height: knot, borderRadius: knot / 2, backgroundColor: color }}
      />
    </View>
  )
}
