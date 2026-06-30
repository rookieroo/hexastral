/**
 * FengProse — report body text with the term layer + 划词 selection baked in.
 *
 * Splits prose into paragraphs → sentences. Each sentence is long-pressable
 * (→ onPickQuote, drives the 划词 SelectionActionBar) and renders recognized
 * 风水 terms as dotted tap targets (→ onTapTerm, drives FengTermBubble).
 * Highlighted sentences get a 朱砂 wash. Pure RN Text (no Skia); mirrors Yuel's
 * sentence-scoped reading model on the 宣纸 surface.
 */

import { useMemo } from 'react'
import { Text } from 'react-native'
import { segmentFengText } from '@/lib/feng-terms'
import { FENG_PAPER } from '@/lib/theme'

interface FengProseProps {
  body: string
  /** Trimmed sentences currently highlighted (划重点). */
  highlights: string[]
  onPickQuote: (sentence: string) => void
  onTapTerm: (termId: string) => void
  color?: string
  fontSize?: number
  lineHeight?: number
}

/** Split a paragraph into sentences, keeping trailing CJK/Latin terminators. */
function splitSentences(paragraph: string): string[] {
  return paragraph.match(/[^。！？!?]+[。！？!?]?/g)?.filter((s) => s.trim().length > 0) ?? []
}

export function FengProse({
  body,
  highlights,
  onPickQuote,
  onTapTerm,
  color = FENG_PAPER.ink,
  fontSize = 16,
  lineHeight = 27,
}: FengProseProps) {
  const paragraphs = useMemo(() => body.split(/\n{2,}/).filter((p) => p.trim().length > 0), [body])
  const highlightSet = useMemo(() => new Set(highlights), [highlights])

  return (
    <>
      {paragraphs.map((para, pi) => (
        <Text
          // biome-ignore lint/suspicious/noArrayIndexKey: paragraphs are stable for a given report
          key={pi}
          style={{ color, fontSize, lineHeight, marginBottom: 14 }}
        >
          {splitSentences(para).map((sentence, si) => {
            const trimmed = sentence.trim()
            const highlighted = highlightSet.has(trimmed)
            const segments = segmentFengText(sentence)
            return (
              <Text
                // biome-ignore lint/suspicious/noArrayIndexKey: sentence order is stable
                key={si}
                onLongPress={() => onPickQuote(trimmed)}
                style={highlighted ? { backgroundColor: 'rgba(155,34,38,0.14)' } : undefined}
              >
                {segments.map((seg, gi) =>
                  seg.termId ? (
                    <Text
                      // biome-ignore lint/suspicious/noArrayIndexKey: segment order is stable
                      key={gi}
                      onPress={() => onTapTerm(seg.termId as string)}
                      style={{
                        color: FENG_PAPER.bronze,
                        textDecorationLine: 'underline',
                        textDecorationStyle: 'dotted',
                      }}
                    >
                      {seg.text}
                    </Text>
                  ) : (
                    // biome-ignore lint/suspicious/noArrayIndexKey: segment order is stable
                    <Text key={gi}>{seg.text}</Text>
                  )
                )}
              </Text>
            )
          })}
        </Text>
      ))}
    </>
  )
}
