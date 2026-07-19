/**
 * One Xingqi report chapter — Yuel editorial layout (whitespace layers, no rules).
 * Numerals: 积画 AncientNumeral (locale-independent). Footer: brand + chapter index only.
 */

import type { ReactNode } from 'react'
import { Dimensions, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { CHAPTER_GLYPH } from '@/lib/ancient-glyphs'
import { CHAPTER_TITLE, type XingqiChapter } from '@/lib/report-chapters'

import { AncientNumeral } from './AncientNumeral'
import { AncientSeal } from './AncientSeal'
import { TermAwareText } from './TermAwareText'

const LAYER_LABEL = {
  evidence: { zh: '形气依据', en: 'The Form' },
  dynamic: { zh: '气机动态', en: 'The Dynamic' },
  reef: { zh: '宜留意', en: 'Worth noting' },
  remedy: { zh: '对照解法', en: 'The Key' },
} as const

export function ChapterCard({
  chapter,
  index,
  total,
  locale,
  centerpiece,
  colors,
  onPickQuote,
  highlightedQuotes,
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
}) {
  const insets = useSafeAreaInsets()
  const width = Dimensions.get('window').width
  const zh = locale.startsWith('zh')
  const title = zh ? CHAPTER_TITLE[chapter.kind].zh : CHAPTER_TITLE[chapter.kind].en
  const termColors = {
    bg: colors.bg,
    ink: colors.text,
    muted: colors.dim,
    accent: colors.accent,
  }

  const layers: Array<{ key: keyof typeof LAYER_LABEL; body: string }> = []
  if (chapter.evidence) layers.push({ key: 'evidence', body: chapter.evidence })
  if (chapter.dynamic) layers.push({ key: 'dynamic', body: chapter.dynamic })
  if (chapter.reef) layers.push({ key: 'reef', body: chapter.reef })
  if (chapter.remedy) layers.push({ key: 'remedy', body: chapter.remedy })

  return (
    <ScrollView
      style={{ width, flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingHorizontal: 28,
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 56,
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
        <View style={{ flex: 1, gap: 4 }}>
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
          <Text
            style={{
              fontFamily: 'IBMPlexMono',
              color: colors.dim,
              fontSize: 11,
              letterSpacing: 1.6,
              textTransform: 'uppercase',
            }}
          >
            Xingqi · Form
          </Text>
        </View>
      </View>

      {centerpiece}

      {chapter.goldenLine ? (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <View
            style={{
              width: 8,
              height: 8,
              marginTop: 10,
              borderRadius: 4,
              backgroundColor: colors.accent,
            }}
          />
          <View style={{ flex: 1 }}>
            <TermAwareText
              text={chapter.goldenLine}
              locale={locale}
              colors={termColors}
              onPickQuote={onPickQuote}
              highlightedQuotes={highlightedQuotes}
              style={{
                fontFamily: 'CrimsonPro-Italic',
                color: colors.text,
                fontSize: 20,
                lineHeight: 30,
              }}
            />
          </View>
        </View>
      ) : null}

      {layers.map((layer, i) => (
        <View key={layer.key} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <View style={{ width: 26, marginTop: 2, alignItems: 'center' }}>
            <AncientNumeral n={i + 1} size={22} color={colors.dim} strokeWidth={3} />
          </View>
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
              {zh ? LAYER_LABEL[layer.key].zh : LAYER_LABEL[layer.key].en}
            </Text>
            <TermAwareText
              text={layer.body}
              locale={locale}
              colors={termColors}
              onPickQuote={onPickQuote}
              highlightedQuotes={highlightedQuotes}
              style={{ color: colors.text, fontSize: 16, lineHeight: 26 }}
            />
          </View>
        </View>
      ))}

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
        <Text
          style={{
            fontFamily: 'IBMPlexMono',
            color: colors.dim,
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          Xingqi · Form
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <AncientNumeral n={index + 1} size={13} color={colors.dim} strokeWidth={3.4} />
          <Text style={{ color: colors.dim, fontSize: 11 }}>/</Text>
          <AncientNumeral n={total} size={13} color={colors.dim} strokeWidth={3.4} />
        </View>
      </View>
    </ScrollView>
  )
}
