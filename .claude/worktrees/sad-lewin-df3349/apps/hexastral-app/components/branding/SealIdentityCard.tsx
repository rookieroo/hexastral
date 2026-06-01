/**
 * SealIdentityCard — 篆刻印章 + 碑拓风格 hook identity card
 *
 * Renders the Day Master wuxing element as a cinnabar seal stamp
 * floating on a rubbing-textured card, with a faint trigram watermark.
 */

import {
  SEAL_FRAME_PATH,
  SEAL_INNER_PATH,
  TRIGRAMS,
  trigramToPath,
} from '@zhop/hexastral-tokens/paths'
import { Text, View } from 'react-native'
import Svg, { Path, Text as SvgText } from 'react-native-svg'
import { useTheme } from '@/lib/theme'

// ── Mappings ──────────────────────────────────────────────────────────────────

/** Day Master stem → wuxing character for the seal */
const STEM_TO_WUXING: Record<string, string> = {
  甲: '木',
  乙: '木',
  丙: '火',
  丁: '火',
  戊: '土',
  己: '土',
  庚: '金',
  辛: '金',
  壬: '水',
  癸: '水',
}

/** Wuxing element → trigram index in TRIGRAMS array */
const WUXING_TRIGRAM_INDEX: Record<string, number> = {
  金: 0, // 乾 (qian)
  木: 4, // 巽 (xun)
  水: 5, // 坎 (kan)
  火: 2, // 離 (li)
  土: 7, // 坤 (kun)
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface SealIdentityCardProps {
  hookDisplay: { oneLiner: string; tag: string; starTag: string | null }
  /** Day Master heavenly stem, e.g. '甲' */
  stem: string
}

export function SealIdentityCard({ hookDisplay, stem }: SealIdentityCardProps) {
  const { colors, isDark } = useTheme()

  const wuxing = STEM_TO_WUXING[stem] ?? '土'
  const trigramIdx = WUXING_TRIGRAM_INDEX[wuxing] ?? 7
  const trigram = TRIGRAMS[trigramIdx]!
  const trigramPath = trigramToPath(trigram.lines)

  const cardBg = colors.surface
  const cardBorder = colors.border
  const sealStroke = colors.accent
  const sealChar = colors.accent
  const tagBg = colors.surfaceSecondary

  return (
    <View
      style={{
        backgroundColor: cardBg,
        borderWidth: 0.5,
        borderColor: cardBorder,
        paddingHorizontal: 20,
        paddingVertical: 24,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Trigram watermark ── */}
      <View style={{ position: 'absolute', left: 16, top: 16, opacity: isDark ? 0.08 : 0.06 }}>
        <Svg width={72} height={72} viewBox='0 0 24 24'>
          <Path
            d={trigramPath}
            stroke={colors.text}
            strokeWidth={2.5}
            fill='none'
            strokeLinecap='round'
          />
        </Svg>
      </View>

      {/* ── Seal stamp outline (top-right) — stroke only, no solid fill ── */}
      <View style={{ position: 'absolute', right: 14, top: 14 }}>
        <Svg width={52} height={52} viewBox='0 0 100 100'>
          <Path
            d={SEAL_FRAME_PATH}
            fill='none'
            stroke={sealStroke}
            strokeWidth={2.5}
            opacity={0.5}
          />
          <Path
            d={SEAL_INNER_PATH}
            fill='none'
            stroke={sealStroke}
            strokeWidth={1.2}
            opacity={0.25}
          />
          <SvgText
            x={50}
            y={60}
            textAnchor='middle'
            fontSize={34}
            fontWeight='700'
            fill={sealChar}
            opacity={0.75}
          >
            {wuxing}
          </SvgText>
        </Svg>
      </View>

      {/* ── Content ── */}
      <View style={{ paddingRight: 60, gap: 12 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '300',
            color: colors.text,
            lineHeight: 26,
          }}
        >
          {hookDisplay.oneLiner}
        </Text>

        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <View style={{ backgroundColor: tagBg, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text
              style={{ fontSize: 11, fontWeight: '500', color: colors.accent, letterSpacing: 1 }}
            >
              {hookDisplay.tag}
            </Text>
          </View>
          {hookDisplay.starTag ? (
            <View style={{ backgroundColor: tagBg, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '300',
                  color: colors.textSecondary,
                  letterSpacing: 1,
                }}
              >
                {hookDisplay.starTag}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  )
}
