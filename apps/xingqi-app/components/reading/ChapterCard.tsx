/**
 * One Xingqi report chapter — Yuel editorial layout (whitespace layers, no rules).
 * Numerals: 积画 AncientNumeral. Share = off-screen card capture (host onShare).
 */

import type { ReactNode } from 'react'
import { Dimensions, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { CHAPTER_GLYPH, locusTitleForLocale } from '@/lib/ancient-glyphs'
import { isCjkZh, isZhHant, pickZh } from '@/lib/locale-zh'
import { chapterTitle, type XingqiChapter } from '@/lib/report-chapters'
import { isNearEcho } from '@/lib/text-echo'

import { AncientNumeral } from './AncientNumeral'
import { AncientSeal } from './AncientSeal'
import { type NatalFacts, NatalFactsStrip } from './NatalFactsStrip'
import { TermAwareText } from './TermAwareText'

const LAYER_LABEL = {
  evidence: { zh: '形气依据', zhHant: '形氣依據', en: 'The Form' },
  dynamic: { zh: '气机动态', zhHant: '氣機動態', en: 'The Dynamic' },
  reef: { zh: '宜留意', zhHant: '宜留意', en: 'Worth noting' },
  remedy: { zh: '对照解法', zhHant: '對照解法', en: 'The Key' },
} as const

function layerLabel(key: keyof typeof LAYER_LABEL, locale: string): string {
  const row = LAYER_LABEL[key]
  if (isZhHant(locale)) return row.zhHant
  if (isCjkZh(locale)) return row.zh
  return row.en
}

/** Hide citation rows that are mostly CJK when the reading locale is non-zh (legacy rows). */
function citationOkForLocale(locale: string, locus: string, note: string): boolean {
  if (isCjkZh(locale)) return true
  const sample = `${locus}${note}`
  const cjk = sample.match(/[\u3040-\u30ff\u3400-\u9fff]/g)?.join('').length ?? 0
  const letters = sample.replace(/\s/g, '').length
  if (letters === 0) return false
  return cjk / letters < 0.45
}

/** First display sentence for goldenLine — drop CJK-leaked lines on EN/JA chrome. */
function displayGoldenLine(locale: string, golden: string, evidence: string): string {
  const g = golden.trim()
  if (!g) return ''
  // Hide headline when it merely restates evidence (common LLM failure).
  if (isNearEcho(g, evidence)) return ''
  if (isCjkZh(locale)) return g
  const cjk = g.match(/[\u3040-\u30ff\u3400-\u9fff]/g)?.join('').length ?? 0
  const letters = g.replace(/\s/g, '').length
  const leaked = letters > 0 && cjk / letters > 0.4
  if (!leaked) return g
  // Prefer first evidence sentence if it looks like the output language.
  const first = evidence.split(/(?<=[.!?。！？])\s+/)[0]?.trim() ?? ''
  if (first.length > 12) {
    const ec = first.match(/[\u3040-\u30ff\u3400-\u9fff]/g)?.join('').length ?? 0
    const el = first.replace(/\s/g, '').length
    if (el > 0 && ec / el < 0.4) return first
  }
  return ''
}

export function ChapterCard({
  chapter,
  index,
  total,
  locale,
  centerpiece,
  colors,
  onPickQuote,
  highlightedQuotes,
  natalFacts,
  onShare,
}: {
  chapter: XingqiChapter
  index: number
  total: number
  locale: string
  centerpiece?: ReactNode
  colors: {
    bg: string
    text: string
    secondary: string
    dim: string
    accent: string
    separator: string
  }
  onPickQuote?: (quote: string) => void
  highlightedQuotes?: readonly string[]
  natalFacts?: NatalFacts | null
  /** Host captures 9:16 share card — only when goldenLine is present. */
  onShare?: () => void
}) {
  const insets = useSafeAreaInsets()
  const width = Dimensions.get('window').width
  const title = chapterTitle(chapter.kind, locale)
  const s = (hans: string, hant: string, en: string) =>
    isCjkZh(locale) ? pickZh(locale, hans, hant) : en
  const termColors = {
    bg: colors.bg,
    ink: colors.text,
    muted: colors.dim,
    accent: colors.accent,
  }

  const layers: Array<{ key: keyof typeof LAYER_LABEL; body: string }> = []
  if (chapter.evidence) layers.push({ key: 'evidence', body: chapter.evidence })
  if (chapter.dynamic && !isNearEcho(chapter.dynamic, chapter.evidence)) {
    layers.push({ key: 'dynamic', body: chapter.dynamic })
  }
  if (
    chapter.reef &&
    !isNearEcho(chapter.reef, chapter.evidence) &&
    !isNearEcho(chapter.reef, chapter.dynamic)
  ) {
    layers.push({ key: 'reef', body: chapter.reef })
  }
  if (
    chapter.remedy &&
    !isNearEcho(chapter.remedy, chapter.evidence) &&
    !isNearEcho(chapter.remedy, chapter.dynamic) &&
    !isNearEcho(chapter.remedy, chapter.reef ?? '')
  ) {
    layers.push({ key: 'remedy', body: chapter.remedy })
  }

  const visibleCitations = chapter.citations.filter((c) =>
    citationOkForLocale(locale, c.locus, c.note)
  )

  const goldenDisplay = displayGoldenLine(locale, chapter.goldenLine, chapter.evidence)
  const canShare = Boolean(onShare && goldenDisplay.length > 0)

  return (
    <ScrollView
      style={{ width, flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingHorizontal: 28,
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 88,
        gap: 22,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <AncientSeal
          glyph={CHAPTER_GLYPH[chapter.kind]}
          size={44}
          tile={colors.text}
          ink={colors.bg}
          strokeWidth={7}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              fontFamily: 'CrimsonPro',
              color: colors.text,
              fontSize: 28,
              lineHeight: 34,
            }}
          >
            {title}
          </Text>
        </View>
      </View>

      {centerpiece}

      {goldenDisplay ? (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.accent,
              marginTop: 10,
            }}
          />
          <TermAwareText
            text={goldenDisplay}
            locale={locale}
            colors={termColors}
            onPickQuote={onPickQuote}
            highlightedQuotes={highlightedQuotes}
            style={{
              flex: 1,
              flexShrink: 1,
              fontFamily: 'CrimsonPro-Italic',
              color: colors.text,
              fontSize: 18,
              lineHeight: 28,
            }}
          />
        </View>
      ) : null}

      {layers.map((layer) => (
        <View key={layer.key} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 18, height: 0.5, backgroundColor: colors.accent }} />
            <View style={{ flex: 1, gap: 8 }}>
              <Text
                style={{
                  fontFamily: 'IBMPlexMono',
                  color: colors.accent,
                  fontSize: 11,
                  letterSpacing: 1.8,
                  textTransform: 'uppercase',
                }}
              >
                {layerLabel(layer.key, locale)}
              </Text>
            </View>
          </View>
          <TermAwareText
            text={layer.body}
            locale={locale}
            colors={termColors}
            onPickQuote={onPickQuote}
            highlightedQuotes={highlightedQuotes}
            style={{ flexShrink: 1, color: colors.text, fontSize: 16, lineHeight: 26 }}
          />
          {layer.key === 'evidence' && visibleCitations.length > 0 ? (
            <View style={{ gap: 8, marginTop: 6 }}>
              {visibleCitations.map((c, ci) => {
                const locusLabel =
                  c.locus === 'face' || c.locus === 'palm_l' || c.locus === 'palm_r'
                    ? locusTitleForLocale(c.featureKey ?? c.locus, locale)
                    : c.locus
                return (
                  <Text
                    key={`${ci}-${c.locus}-${c.note.slice(0, 24)}`}
                    style={{ color: colors.secondary, fontSize: 13, lineHeight: 20 }}
                  >
                    <Text style={{ color: colors.dim, fontFamily: 'IBMPlexMono', fontSize: 11 }}>
                      {locusLabel}
                    </Text>
                    {'  '}
                    {c.note}
                  </Text>
                )
              })}
            </View>
          ) : null}
        </View>
      ))}

      {chapter.kind === 'natal' && natalFacts ? (
        <NatalFactsStrip facts={natalFacts} locale={locale} colors={colors} />
      ) : null}

      {chapter.counterpoint ? (
        <TermAwareText
          text={chapter.counterpoint}
          locale={locale}
          colors={termColors}
          onPickQuote={onPickQuote}
          highlightedQuotes={highlightedQuotes}
          style={{
            fontFamily: 'CrimsonPro-Italic',
            color: colors.dim,
            fontSize: 14,
            lineHeight: 22,
            marginTop: 4,
          }}
        />
      ) : null}

      <View
        style={{
          marginTop: 12,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {canShare ? (
          <Pressable onPress={onShare} hitSlop={10} accessibilityRole='button'>
            <Text
              style={{
                fontFamily: 'IBMPlexMono',
                color: colors.dim,
                fontSize: 11,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              {s('分享 · Syel', '分享 · Syel', 'Share · Syel')}
            </Text>
          </Pressable>
        ) : (
          <View />
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <AncientNumeral n={index + 1} size={13} color={colors.dim} strokeWidth={3.4} />
          <Text style={{ color: colors.dim, fontSize: 11 }}>/</Text>
          <AncientNumeral n={total} size={13} color={colors.dim} strokeWidth={3.4} />
        </View>
      </View>
    </ScrollView>
  )
}
