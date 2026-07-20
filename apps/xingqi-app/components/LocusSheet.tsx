/**
 * Locus detail sheet — content-height bottom sheet, no dim overlay.
 * Teaching blurb + reading note (no duplicate when note is empty).
 */

import { Modal, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

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

export function LocusSheet({
  visible,
  star,
  openReportLabel,
  teachingLabel,
  readingLabel,
  noReadingHint,
  colors,
  onClose,
  onOpenReport,
}: {
  visible: boolean
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
}) {
  const insets = useSafeAreaInsets()
  if (!star) return null

  const glyph = locusGlyphKey(star.featureKey)
  const blurb = star.blurb.trim()
  const note = star.note.trim()
  const hasBlurb = blurb.length > 0
  const hasNote = note.length > 0
  // Skip reading block when it only repeats the teaching line.
  const showNote = hasNote && !(hasBlurb && nearDup(note, blurb))

  return (
    <Modal visible={visible} transparent animationType='slide' onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Transparent hit target — no gray dim overlay */}
        <Pressable
          style={{ flex: 1 }}
          onPress={onClose}
          accessibilityRole='button'
          accessibilityLabel='Close'
        />
        <View
          style={{
            backgroundColor: colors.bg,
            borderTopWidth: 0.5,
            borderTopColor: colors.separator,
            paddingTop: 14,
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 16,
            gap: 12,
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.separator,
            }}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <AncientSeal
              glyph={glyph}
              size={48}
              tile={colors.separator}
              ink={colors.accent}
              outline
            />
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{
                  fontFamily: 'CrimsonPro',
                  color: colors.text,
                  fontSize: 22,
                  lineHeight: 28,
                }}
              >
                {star.locus}
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
                {star.featureKey}
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
            // Teaching-only locus (not cited in the reading) — point to the report,
            // never fabricate a per-locus reading.
            <Text style={{ color: colors.dim, fontSize: 13, lineHeight: 20, fontStyle: 'italic' }}>
              {noReadingHint}
            </Text>
          ) : null}

          {!hasBlurb && !showNote ? (
            <Text style={{ color: colors.dim, fontSize: 14, lineHeight: 21 }}>
              {star.featureKey}
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
      </View>
    </Modal>
  )
}
