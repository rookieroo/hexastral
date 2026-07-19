/**
 * Prose with tappable terms — Xingqi curated vocabulary only.
 * Optional sentence long-press for 划词 (host owns SelectionActionBar).
 */

import type { Locale as TermLocale, ResolvedTerm } from '@zhop/astro-i18n'
import { useMemo, useState, type ReactNode } from 'react'
import { Text, type TextStyle } from 'react-native'

import { resolveXingqiTerm, segmentXingqiTerms } from '@/lib/xingqi-terms'

import { TermBubble } from './TermBubble'

function toTermLocale(locale: string): TermLocale {
  if (locale === 'zh-Hant' || locale === 'zh-TW' || locale === 'zh-HK') return 'zh-Hant'
  if (locale.startsWith('zh')) return 'zh'
  if (locale.startsWith('ja')) return 'ja'
  return 'en'
}

export function splitSentences(text: string): string[] {
  const parts = text.match(/[^。！？.!?；;\n]+[。！？.!?；;]?[\s\n]*/g)
  return parts && parts.length > 0 ? parts : [text]
}

function TermSegments({
  text,
  locale,
  style,
  colors,
  onActivate,
}: {
  text: string
  locale: string
  style?: TextStyle
  colors: { accent: string }
  onActivate: (term: ResolvedTerm) => void
}): ReactNode {
  const termLocale = toTermLocale(locale)
  const segments = useMemo(() => segmentXingqiTerms(text), [text])
  return (
    <Text style={style}>
      {segments.map((seg, i) => {
        if (!seg.termZh) {
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: stable segment order
            <Text key={`p-${i}`}>{seg.text}</Text>
          )
        }
        return (
          <Text
            // biome-ignore lint/suspicious/noArrayIndexKey: stable segment order
            key={`t-${i}`}
            onPress={() => {
              const resolved = resolveXingqiTerm(seg.termZh!, termLocale)
              if (resolved) onActivate(resolved)
            }}
            style={{
              textDecorationLine: 'underline',
              textDecorationStyle: 'dotted',
              textDecorationColor: colors.accent,
            }}
          >
            {seg.text}
          </Text>
        )
      })}
    </Text>
  )
}

export function TermAwareText({
  text,
  locale,
  style,
  colors,
  onPickQuote,
  highlightedQuotes,
}: {
  text: string
  locale: string
  style?: TextStyle
  colors: { bg: string; ink: string; muted: string; accent: string }
  /** When set, prose is split into long-pressable sentences (Yuel 划词). */
  onPickQuote?: (quote: string) => void
  highlightedQuotes?: readonly string[]
}) {
  const [term, setTerm] = useState<ResolvedTerm | null>(null)
  const cjk = locale.startsWith('zh') || locale.startsWith('ja')
  const sentences = useMemo(
    () => (onPickQuote ? splitSentences(text) : [text]),
    [text, onPickQuote]
  )

  return (
    <>
      {onPickQuote
        ? sentences.map((sentence, i) => (
            <Text
              // biome-ignore lint/suspicious/noArrayIndexKey: sentence order stable for chapter body
              key={`s-${i}`}
              onLongPress={() => onPickQuote(sentence.trim())}
              style={
                highlightedQuotes?.includes(sentence.trim()) ||
                highlightedQuotes?.includes(sentence)
                  ? { backgroundColor: `${colors.accent}2E` }
                  : undefined
              }
            >
              <TermSegments
                text={sentence}
                locale={locale}
                style={style}
                colors={colors}
                onActivate={setTerm}
              />
            </Text>
          ))
        : (
            <TermSegments
              text={text}
              locale={locale}
              style={style}
              colors={colors}
              onActivate={setTerm}
            />
          )}
      <TermBubble term={term} onClose={() => setTerm(null)} cjk={cjk} colors={colors} />
    </>
  )
}
