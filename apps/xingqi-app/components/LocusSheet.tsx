/**
 * Locus detail body — rendered inside @gorhom/bottom-sheet.
 * Stable content: star swaps only rewrite text (no remount animation).
 */

import { useEffect, useRef } from 'react'
import { Pressable, Text, View } from 'react-native'

import { AncientSeal } from '@/components/reading/AncientSeal'
import { locusGlyphKey } from '@/lib/ancient-glyphs'
import type { LocusStar } from '@/lib/locus-data'

function nearDup(a: string, b: string): boolean {
  const na = a.replace(/\s+/g, '').trim()
  const nb = b.replace(/\s+/g, '').trim()
  if (!na || !nb) return false
  if (na === nb) return true
  const shorter = na.length <= nb.length ? na : nb
  const longer = na.length <= nb.length ? nb : na
  if (shorter.length < 12) return false
  return longer.includes(shorter) && shorter.length / longer.length >= 0.8
}

export function LocusSheetContent({
  star,
  openReportLabel,
  teachingLabel,
  readingLabel,
  noReadingHint,
  colors,
  onClose,
  onOpenReport,
  visible: _visible = true,
}: {
  star: LocusStar | null
  openReportLabel: string
  teachingLabel: string
  readingLabel: string
  noReadingHint: string
  colors: {
    bg: string
    text: string
    dim: string
    secondary: string
    accent: string
    separator: string
  }
  onClose: () => void
  onOpenReport: () => void
  /** @deprecated Parent controls mount; kept for call-site compat */
  visible?: boolean
}) {
  const held = useRef<LocusStar | null>(null)
  useEffect(() => {
    if (star) held.current = star
  }, [star])

  const display = star ?? held.current
  if (!display) return null

  const glyph = locusGlyphKey(display.featureKey)
  const blurb = display.blurb.trim()
  const note = display.note.trim()
  const hasBlurb = blurb.length > 0
  const hasNote = note.length > 0
  const showNote = hasNote && !(hasBlurb && nearDup(note, blurb))

  return (
    <View style={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: 28, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <AncientSeal glyph={glyph} size={48} tile={colors.separator} ink={colors.accent} outline />
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              fontFamily: 'CrimsonPro',
              color: colors.text,
              fontSize: 22,
              lineHeight: 28,
            }}
          >
            {display.locus}
          </Text>
          <Text
            style={{
              fontFamily: 'IBMPlexMono',
              color: colors.dim,
              fontSize: 10,
              letterSpacing: 1.1,
              textTransform: 'uppercase',
            }}
          >
            {display.featureKey}
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole='button'>
          <Text style={{ color: colors.dim, fontSize: 22, lineHeight: 24 }}>×</Text>
        </Pressable>
      </View>

      {hasBlurb ? (
        <View style={{ gap: 4 }}>
          <Text
            style={{
              fontFamily: 'IBMPlexMono',
              color: colors.accent,
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            {teachingLabel}
          </Text>
          <Text style={{ color: colors.secondary, fontSize: 14, lineHeight: 21 }}>{blurb}</Text>
        </View>
      ) : null}

      {showNote ? (
        <View style={{ gap: 4 }}>
          <Text
            style={{
              fontFamily: 'IBMPlexMono',
              color: colors.accent,
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            {readingLabel}
          </Text>
          <Text style={{ color: colors.text, fontSize: 15, lineHeight: 23 }}>{note}</Text>
        </View>
      ) : hasBlurb ? (
        <Text style={{ color: colors.dim, fontSize: 13, lineHeight: 20, fontStyle: 'italic' }}>
          {noReadingHint}
        </Text>
      ) : null}

      {!hasBlurb && !showNote ? (
        <Text style={{ color: colors.dim, fontSize: 14, lineHeight: 21 }}>
          {display.featureKey}
        </Text>
      ) : null}

      <Pressable
        onPress={onOpenReport}
        accessibilityRole='button'
        style={{
          marginTop: 2,
          paddingVertical: 14,
          borderWidth: 0.5,
          borderColor: colors.accent,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: 'IBMPlexMono',
            color: colors.accent,
            fontSize: 12,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
          }}
        >
          {openReportLabel}
        </Text>
      </Pressable>
    </View>
  )
}

/** @deprecated Prefer LocusSheetContent inside BottomSheet */
export const LocusSheet = LocusSheetContent
