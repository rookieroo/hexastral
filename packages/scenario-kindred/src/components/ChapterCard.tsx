/**
 * ChapterCard — one synastry chapter, in the LOCKED report design (chapter-en).
 *
 *   Header   碑拓 essence seal + dominant title + element subtitle
 *   [slot]   centerpiece (水墨粒子 ink image — Skia, passed in)
 *   Golden   a cinnabar seal-dot + the quotable lead (serif)
 *   Layers   命盤依據 / 關係動態 / 暗礁(+朱批) / 解法(+用神朱文), each led by a
 *            hanging ancient numeral; structure by whitespace, NO rules
 *   Counter  a quiet 注脚
 *   Footer   colophon + chapter number in ancient numerals
 *
 * No web widgets: no left bars, no rating dots, no dividers, no button-chips.
 * One seal per card (the essence). Numerals are unified (ancient, never Arabic).
 * Bilingual: Latin serif/mono for en, Noto serif for CJK. Falls back to the
 * assembled `body` for legacy/partial chapters.
 */

import {
  getTermByZh,
  type ResolvedTerm,
  segmentTextByTerms,
  type Locale as TermLocale,
} from '@zhop/astro-i18n'
import { kindredDark, kindredPaper } from '@zhop/hexastral-tokens/kindred'
import { type ReactNode, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { CHAPTER_SEAL } from '../glyphs'
import { isCjkLocale, kindredFonts } from '../kindredFonts'
import { spaceCjkLatin } from '../text'
import type { SynastryChapter } from '../types'
import { AncientNumeral } from './AncientNumeral'
import { AncientSeal } from './AncientSeal'
import { YongshenKey } from './ChapterMeta'
import { RiskMark } from './RiskMark'
import { TermBubble } from './TermBubble'

/** Narrow the free-form `locale` string to the astro-i18n term locale. */
function termLocale(locale?: string): TermLocale {
  if (locale === 'zh-Hant' || locale === 'zh-TW' || locale === 'zh-HK') return 'zh-Hant'
  if (locale?.startsWith('zh')) return 'zh'
  if (locale?.startsWith('ja')) return 'ja'
  return 'en'
}

const CHAPTER_TITLES: Record<SynastryChapter['kind'], string> = {
  first_impression: '第一印象',
  communication: '沟通方式',
  conflict: '冲突源头',
  complement: '互补之处',
  monthly_outlook: '本月运势',
  long_term_advice: '长期建议',
}

/** 五行 → English element name. The subtitle renders raw 五行 chars (木 × 土), which
 *  read as opaque to a non-CJK reader — localize to "Wood × Earth" on en/ja-Latin. */
const WUXING_EN: Record<string, string> = {
  木: 'Wood',
  火: 'Fire',
  土: 'Earth',
  金: 'Metal',
  水: 'Water',
}
function elName(el: string, cjk: boolean): string {
  return cjk ? el : (WUXING_EN[el] ?? el)
}

function labels(cjk: boolean) {
  return cjk
    ? { chart: '命盤依據', dynamic: '關係動態', reef: '暗礁', key: '解法', chapter: '第' }
    : {
        chart: 'The Chart',
        dynamic: 'The Dynamic',
        reef: 'The Reef',
        key: 'The Key',
        chapter: 'Chapter',
      }
}

/** 用神 element char → English name for the label (the glyph key stays 金木水火土). */
const ELEMENT_EN: Record<string, string> = {
  土: 'Earth',
  火: 'Fire',
  金: 'Metal',
  水: 'Water',
  木: 'Wood',
}

/**
 * Pair signature for the essence seal. The 六章之印 (見言北合月永) mark chapter
 * TYPE, so they're identical across every report — leaving the imagery feeling
 * templated, the same stark 北 (二人相背) in each ("意象重复"). We can't vary the
 * glyph (it IS the chapter type), so we vary its INK by the couple's own 五行
 * relation: a 生 pair's seals read sage, a 克 pair's cinnabar, a 比和 pair's gold.
 * Every report now carries a colour identity, and the conflict seal is no longer
 * the same red-stone 北 for everyone. CJK + english element forms both accepted.
 */
const ELEMENT_KEY: Record<string, 'wood' | 'fire' | 'earth' | 'metal' | 'water'> = {
  木: 'wood',
  wood: 'wood',
  火: 'fire',
  fire: 'fire',
  土: 'earth',
  earth: 'earth',
  金: 'metal',
  metal: 'metal',
  水: 'water',
  water: 'water',
}
const GEN: Record<string, string> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
}
const OVR: Record<string, string> = {
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood',
}
function pairRelation(a?: string, b?: string): 'generate' | 'overcome' | 'peer' | null {
  const ak = a ? ELEMENT_KEY[a.trim().toLowerCase()] : undefined
  const bk = b ? ELEMENT_KEY[b.trim().toLowerCase()] : undefined
  if (!ak || !bk) return null
  if (ak === bk) return 'peer'
  if (GEN[ak] === bk || GEN[bk] === ak) return 'generate'
  if (OVR[ak] === bk || OVR[bk] === ak) return 'overcome'
  return 'peer'
}
/** Relation → seal-glyph ink. `overcome` borrows the surface cinnabar; the other
 *  two are muted earth tones that sit inside the 碑拓 aesthetic. */
function sealInkFor(rel: 'generate' | 'overcome' | 'peer' | null, cinnabar: string): string | null {
  if (rel === 'generate') return '#6e8f63' // 生 — sage jade (mutual nourishment)
  if (rel === 'peer') return '#b18f5a' // 比和 — antique gold (resonance)
  if (rel === 'overcome') return cinnabar // 克 — cinnabar (tension)
  return null
}

/**
 * Surface theme. The shareable PNG card + any other consumer stay on the
 * default 宣纸 (paper); the in-app report passes 'dark' so it blooms into
 * 水墨黑 from the tap (2026-06: "报告的背景逐步从宣纸变成水墨黑色"). The
 * centerpiece ink-image plate stays a light mount on BOTH — a framed painting
 * on the dark scroll — since the 水墨粒子 draw dark ink.
 */
export type ChapterCardTheme = 'paper' | 'dark'

function cardPalette(theme: ChapterCardTheme) {
  if (theme === 'dark') {
    return {
      bg: kindredDark.bg,
      ink: kindredDark.text,
      inkSoft: kindredDark.textSecondary,
      muted: kindredDark.textMuted,
      cinnabar: kindredDark.seal,
      // Essence seal — a raised weathered-stone tile (the void tile would vanish
      // on the ink ground) with the ivory rubbing glyph.
      sealTile: kindredDark.card,
      sealInk: kindredPaper.bg,
      well: '#c4c3bf',
    }
  }
  return {
    bg: kindredPaper.bg,
    ink: kindredPaper.ink,
    inkSoft: kindredPaper.inkSoft,
    muted: kindredPaper.muted,
    cinnabar: kindredPaper.cinnabar,
    sealTile: kindredDark.bg,
    sealInk: kindredPaper.bg,
    well: '#c4c3bf',
  }
}

/**
 * Split prose into sentences for 划词 selection — keeps terminal punctuation +
 * trailing whitespace so the paragraph still flows naturally. CJK 。！？；and
 * Latin .!? (and hard newlines) end a sentence; commas (，,) do NOT. Falls back
 * to the whole text when there's nothing to split.
 */
function splitSentences(text: string): string[] {
  const parts = text.match(/[^。！？.!?；;\n]+[。！？.!?；;]?[\s\n]*/g)
  return parts && parts.length > 0 ? parts : [text]
}

export interface ChapterCardProps {
  chapter: SynastryChapter
  index: number
  total: number
  /** Reserved for a future share gesture; no in-card button (locked design). */
  onShare?: () => void
  /** Day-master elements — shown in the subtitle. */
  aElement?: string
  bElement?: string
  /** Report locale; drives fonts + static labels. */
  locale?: string
  /** UI/device locale — the language to show a tapped term's EXPLANATION in (the
   *  reader's own language, even when the report content is Chinese). Falls back to
   *  `locale`. The term tokens themselves are always Chinese. */
  glossaryLocale?: string
  /** The centerpiece ink image (水墨粒子, Skia) — rendered in a grey well. */
  centerpiece?: ReactNode
  /** 划词 — long-press a body paragraph to "pick" it as a quote, which drives
   *  the report's selection action bar (copy / chat / highlight / make-if). */
  onPickQuote?: (quote: string) => void
  /** Paragraph texts the user has highlighted — rendered with a cinnabar wash. */
  highlightedQuotes?: string[]
  /** Surface theme — 'paper' (default, share card) or 'dark' (in-app report). */
  theme?: ChapterCardTheme
}

export function ChapterCard({
  chapter,
  index,
  total,
  aElement,
  bElement,
  locale,
  glossaryLocale,
  centerpiece,
  onPickQuote,
  highlightedQuotes,
  theme = 'paper',
}: ChapterCardProps) {
  const C = cardPalette(theme)
  const cjk = isCjkLocale(locale)
  // Non-CJK render guard: un-glue any 命理 term the model embedded directly in
  // Latin prose ("clash of卯酉" → "clash of 卯酉"). No-op for CJK locales.
  const space = (s: string) => (cjk ? s : spaceCjkLatin(s))
  const L = labels(cjk)
  const titleFont = cjk ? kindredFonts.cjk : kindredFonts.display
  const bodyFont = cjk ? kindredFonts.cjk : kindredFonts.serif
  const quoteFont = cjk ? kindredFonts.cjk : kindredFonts.serifItalic
  const labelFont = cjk ? kindredFonts.cjk : kindredFonts.mono

  // Tap-to-explain: terms in the prose (用神 / 命宫 / 化忌 / 七杀…) open a meaning
  // bubble. Only the interactive in-app report wires this (gated on onPickQuote, the
  // same signal the 划词 long-press uses) — the off-screen share-capture card stays
  // plain. For non-CJK prose the matcher finds nothing, so it renders verbatim.
  // Explanations resolve in the READER's language (device), not the report's content
  // language — so an English reader tapping 用神 in a Chinese report gets English.
  const tLocale = termLocale(glossaryLocale ?? locale)
  const [activeTerm, setActiveTerm] = useState<ResolvedTerm | null>(null)
  const interactive = onPickQuote != null
  const renderProse = (s: string): ReactNode => {
    if (!interactive) return s
    const segs = segmentTextByTerms(s)
    if (segs.length === 1 && !segs[0]?.termZh) return s
    return segs.map((seg, j) =>
      seg.termZh ? (
        <Text
          key={`${j}-${seg.termZh}`}
          onPress={() => {
            const term = getTermByZh(seg.termZh as string, tLocale)
            if (term) setActiveTerm(term)
          }}
          // A soft cinnabar dotted underline — RN can't offset the line off the
          // baseline (it crowds CJK glyphs), so muting the colour keeps the "this is
          // a defined term" hint without a harsh rule pressed against the characters.
          style={{
            textDecorationLine: 'underline',
            textDecorationStyle: 'dotted',
            textDecorationColor: C.muted,
          }}
        >
          {seg.text}
        </Text>
      ) : (
        seg.text
      )
    )
  }

  const seal = CHAPTER_SEAL[chapter.kind]
  const title = chapter.title || CHAPTER_TITLES[chapter.kind]
  const subtitle =
    aElement && bElement
      ? `${elName(aElement, cjk)}${cjk ? ' · ' : ' × '}${elName(bElement, cjk)}`
      : undefined
  // Seal ink takes the couple's 五行 relation, so the report has a colour identity
  // and the chapter seals aren't the same stone glyph for every pair.
  const sealInk = sealInkFor(pairRelation(aElement, bElement), C.cinnabar) ?? C.sealInk

  const layers = [
    { n: 1, label: L.chart, text: chapter.evidence },
    { n: 2, label: L.dynamic, text: chapter.dynamic },
    { n: 3, label: L.reef, text: chapter.reef, reef: true },
    {
      n: 4,
      label: chapter.yongshen
        ? `${L.key} · ${cjk ? chapter.yongshen : (ELEMENT_EN[chapter.yongshen] ?? chapter.yongshen)}`
        : L.key,
      text: chapter.remedy,
      key: true,
    },
  ]
  const hasStructured = layers.some((l) => l.text)

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 54, paddingBottom: 44 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header — 碑拓 essence seal + dominant title */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
        {seal && (
          <AncientSeal glyph={seal} size={62} tile={C.sealTile} ink={sealInk} inset={0.84} />
        )}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: titleFont,
              // en titles are LLM-generated + can run long; 34 wrapped to 3 lines
              // ("First Impressions: Fire's Mediation"). 28 keeps the hero weight but
              // fits in ≤2 lines for the typical title. (cjk titles are short — 44 ok.)
              fontSize: cjk ? 44 : 28,
              lineHeight: cjk ? 48 : 33,
              color: C.ink,
              letterSpacing: cjk ? 2 : 0,
            }}
          >
            {space(title)}
          </Text>
          {subtitle ? (
            <Text
              style={{
                marginTop: 11,
                fontFamily: cjk ? kindredFonts.cjk : kindredFonts.mono,
                fontSize: cjk ? 14 : 12,
                letterSpacing: cjk ? 3 : 2,
                color: C.muted,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Centerpiece (水墨粒子) — a light ink-image plate (a mounted painting,
          kept light on the dark scroll so the dark 粒子 read). */}
      {centerpiece ? (
        <View
          style={{ marginTop: 28, borderRadius: 4, overflow: 'hidden', backgroundColor: C.well }}
        >
          {centerpiece}
        </View>
      ) : null}

      {/* Golden line — cinnabar seal-dot + pulled quote, no bar */}
      {chapter.goldenLine ? (
        <View style={{ flexDirection: 'row', marginTop: 34, marginBottom: 34, paddingRight: 6 }}>
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: C.cinnabar,
              marginTop: 11,
              marginRight: 9,
            }}
          />
          <Text
            style={{
              flex: 1,
              fontFamily: quoteFont,
              fontStyle: cjk ? 'normal' : 'italic',
              fontSize: cjk ? 23 : 23,
              lineHeight: cjk ? 38 : 35,
              color: C.ink,
            }}
          >
            {space(chapter.goldenLine)}
          </Text>
        </View>
      ) : null}

      {/* Four layers — hanging numeral gutter + prose, no rules */}
      {hasStructured ? (
        layers.map((l) =>
          l.text ? (
            <View key={l.n} style={{ flexDirection: 'row', gap: 17, marginBottom: 27 }}>
              <View style={{ width: 40, alignItems: 'center', paddingTop: 3 }}>
                <AncientNumeral n={l.n} size={26} color={C.inkSoft} strokeWidth={3} />
                {l.reef ? <RiskMark severity={chapter.severity} /> : null}
                {l.key ? <YongshenKey element={chapter.yongshen} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: labelFont,
                    fontSize: cjk ? 13 : 11,
                    letterSpacing: cjk ? 2 : 2.4,
                    textTransform: cjk ? 'none' : 'uppercase',
                    color: C.cinnabar,
                    marginBottom: 7,
                  }}
                >
                  {l.label}
                </Text>
                {/* 划词 — the paragraph flows as one Text, but each SENTENCE is
                    its own long-pressable span, so a long-press picks the
                    sentence under the finger (not the whole paragraph) and that
                    sentence gets the cinnabar marker. (Word/arbitrary-range needs
                    a native selectable-text view — see kindred-status.md.) */}
                <Text
                  style={{
                    fontFamily: bodyFont,
                    fontSize: cjk ? 16.5 : 18,
                    lineHeight: cjk ? 30 : 27,
                    color: C.inkSoft,
                  }}
                >
                  {l.text
                    ? splitSentences(space(l.text)).map((s, i) => (
                        <Text
                          key={`${l.n}-${i}`}
                          onLongPress={onPickQuote ? () => onPickQuote(s) : undefined}
                          style={
                            highlightedQuotes?.includes(s)
                              ? { backgroundColor: `${C.cinnabar}2E` }
                              : undefined
                          }
                        >
                          {renderProse(s)}
                        </Text>
                      ))
                    : null}
                </Text>
              </View>
            </View>
          ) : null
        )
      ) : (
        <Text
          style={{
            fontFamily: bodyFont,
            fontSize: cjk ? 16.5 : 18,
            lineHeight: cjk ? 30 : 27,
            color: C.ink,
          }}
        >
          {space(chapter.body)}
        </Text>
      )}

      {/* Counterpoint 注脚 */}
      {chapter.counterpoint ? (
        <View style={{ marginTop: 6, paddingLeft: 57 }}>
          <Text
            style={{
              fontFamily: quoteFont,
              fontStyle: cjk ? 'normal' : 'italic',
              fontSize: cjk ? 15 : 17,
              lineHeight: cjk ? 26 : 26,
              color: C.muted,
            }}
          >
            {space(chapter.counterpoint)}
          </Text>
        </View>
      ) : null}

      {/* Footer — colophon + chapter number in ancient numerals */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 38,
        }}
      >
        <Text
          style={{
            fontFamily: kindredFonts.mono,
            fontSize: 11,
            letterSpacing: 2,
            color: C.muted,
            textTransform: 'uppercase',
          }}
        >
          Kindred · Synastry
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text
            style={{
              fontFamily: kindredFonts.mono,
              fontSize: 11,
              letterSpacing: 2,
              color: C.muted,
              textTransform: 'uppercase',
            }}
          >
            {L.chapter}
          </Text>
          <AncientNumeral n={index + 1} size={13} color={C.muted} strokeWidth={3.4} />
          <Text style={{ color: C.muted, fontSize: 11 }}>/</Text>
          <AncientNumeral n={total} size={13} color={C.muted} strokeWidth={3.4} />
        </View>
      </View>

      <TermBubble
        term={activeTerm}
        onClose={() => setActiveTerm(null)}
        cjk={cjk}
        colors={{
          bg: C.bg,
          ink: C.ink,
          inkSoft: C.inkSoft,
          muted: C.muted,
          cinnabar: C.cinnabar,
        }}
      />
    </ScrollView>
  )
}
