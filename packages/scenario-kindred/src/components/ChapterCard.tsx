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

import { kindredDark, kindredPaper } from '@zhop/hexastral-tokens/kindred'
import type { ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { CHAPTER_SEAL } from '../glyphs'
import { isCjkLocale, kindredFonts } from '../kindredFonts'
import type { SynastryChapter } from '../types'
import { AncientNumeral } from './AncientNumeral'
import { AncientSeal } from './AncientSeal'
import { YongshenKey } from './ChapterMeta'
import { RiskMark } from './RiskMark'

const CHAPTER_TITLES: Record<SynastryChapter['kind'], string> = {
  first_impression: '第一印象',
  communication: '沟通方式',
  conflict: '冲突源头',
  complement: '互补之处',
  monthly_outlook: '本月运势',
  long_term_advice: '长期建议',
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
  /** The centerpiece ink image (水墨粒子, Skia) — rendered in a grey well. */
  centerpiece?: ReactNode
  /** 划词 — long-press a body paragraph to "pick" it as a quote, which drives
   *  the report's selection action bar (copy / chat / highlight / make-if). */
  onPickQuote?: (quote: string) => void
  /** Paragraph texts the user has highlighted — rendered with a cinnabar wash. */
  highlightedQuotes?: string[]
}

export function ChapterCard({
  chapter,
  index,
  total,
  aElement,
  bElement,
  locale,
  centerpiece,
  onPickQuote,
  highlightedQuotes,
}: ChapterCardProps) {
  const cjk = isCjkLocale(locale)
  const L = labels(cjk)
  const titleFont = cjk ? kindredFonts.cjk : kindredFonts.display
  const bodyFont = cjk ? kindredFonts.cjk : kindredFonts.serif
  const quoteFont = cjk ? kindredFonts.cjk : kindredFonts.serifItalic
  const labelFont = cjk ? kindredFonts.cjk : kindredFonts.mono

  const seal = CHAPTER_SEAL[chapter.kind]
  const title = chapter.title || CHAPTER_TITLES[chapter.kind]
  const subtitle = aElement && bElement ? `${aElement}${cjk ? ' · ' : ' × '}${bElement}` : undefined

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
      style={{ flex: 1, backgroundColor: kindredPaper.bg }}
      contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 54, paddingBottom: 44 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header — 碑拓 essence seal + dominant title */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
        {seal && (
          <AncientSeal
            glyph={seal}
            size={62}
            tile={kindredDark.bg}
            ink={kindredPaper.bg}
            inset={0.84}
          />
        )}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: titleFont,
              fontSize: cjk ? 44 : 34,
              lineHeight: cjk ? 48 : 38,
              color: kindredPaper.ink,
              letterSpacing: cjk ? 2 : 0,
            }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={{
                marginTop: 11,
                fontFamily: cjk ? kindredFonts.cjk : kindredFonts.mono,
                fontSize: cjk ? 14 : 12,
                letterSpacing: cjk ? 3 : 2,
                color: kindredPaper.muted,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Centerpiece (水墨粒子) — grey ink well */}
      {centerpiece ? (
        <View
          style={{ marginTop: 28, borderRadius: 4, overflow: 'hidden', backgroundColor: '#c4c3bf' }}
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
              backgroundColor: kindredPaper.cinnabar,
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
              color: kindredPaper.ink,
            }}
          >
            {chapter.goldenLine}
          </Text>
        </View>
      ) : null}

      {/* Four layers — hanging numeral gutter + prose, no rules */}
      {hasStructured ? (
        layers.map((l) =>
          l.text ? (
            <View key={l.n} style={{ flexDirection: 'row', gap: 17, marginBottom: 27 }}>
              <View style={{ width: 40, alignItems: 'center', paddingTop: 3 }}>
                <AncientNumeral n={l.n} size={26} color={kindredPaper.inkSoft} strokeWidth={3} />
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
                    color: kindredPaper.cinnabar,
                    marginBottom: 7,
                  }}
                >
                  {l.label}
                </Text>
                <Pressable
                  onLongPress={() => l.text && onPickQuote?.(l.text)}
                  delayLongPress={300}
                  disabled={!onPickQuote}
                  style={
                    l.text && highlightedQuotes?.includes(l.text)
                      ? {
                          backgroundColor: `${kindredPaper.cinnabar}1F`,
                          borderRadius: 4,
                          marginHorizontal: -4,
                          paddingHorizontal: 4,
                        }
                      : undefined
                  }
                >
                  <Text
                    style={{
                      fontFamily: bodyFont,
                      fontSize: cjk ? 16.5 : 18,
                      lineHeight: cjk ? 30 : 27,
                      color: kindredPaper.inkSoft,
                    }}
                  >
                    {l.text}
                  </Text>
                </Pressable>
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
            color: kindredPaper.ink,
          }}
        >
          {chapter.body}
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
              color: kindredPaper.muted,
            }}
          >
            {chapter.counterpoint}
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
            color: kindredPaper.muted,
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
              color: kindredPaper.muted,
              textTransform: 'uppercase',
            }}
          >
            {L.chapter}
          </Text>
          <AncientNumeral n={index + 1} size={13} color={kindredPaper.muted} strokeWidth={3.4} />
          <Text style={{ color: kindredPaper.muted, fontSize: 11 }}>/</Text>
          <AncientNumeral n={total} size={13} color={kindredPaper.muted} strokeWidth={3.4} />
        </View>
      </View>
    </ScrollView>
  )
}
