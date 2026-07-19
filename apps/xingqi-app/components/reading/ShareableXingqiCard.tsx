/**
 * ShareableXingqiCard — 9:16 portrait card for chapter share (Yuel parity).
 *
 * Top: chapter seal + title + ancient numeral
 * Center: goldenLine only (never body / citations / photos)
 * Bottom: abstract identity + cinnabar seal + install QR + brand URL
 *
 * PRIVACY: never birth date/time, photos, or full chapter prose.
 */

import { Text, View, type ViewProps } from 'react-native'

import { CHAPTER_GLYPH } from '@/lib/ancient-glyphs'
import { isCjkZh } from '@/lib/locale-zh'
import type { XingqiChapterKind } from '@/lib/report-chapters'
import { XINGQI_BRAND_URL, XINGQI_INSTALL_URL } from '@/lib/xingqiShare'

import { AncientNumeral } from './AncientNumeral'
import { AncientSeal } from './AncientSeal'
import { QrCode } from './QrCode'

/** Warm 宣纸 — match InkCenterpiece paper for social readability. */
const PAPER = '#EDE6D8'
const INK = '#1C1914'
const INK_SOFT = '#4A453C'
const INK_MUTED = '#7A7368'
const CINNABAR = '#8B3A2F'

export interface ShareableXingqiCardProps extends Omit<ViewProps, 'style'> {
  leadLine: string
  chapterLabel: string
  chapterKind: XingqiChapterKind
  /** 1-based chapter index. */
  chapterNumber?: number
  /** Abstract 日主 · 大运 — NEVER birth date. */
  identityLine?: string
  width?: number
  height?: number
  locale?: string
  brandUrl?: string
  installUrl?: string
}

export function ShareableXingqiCard({
  leadLine,
  chapterLabel,
  chapterKind,
  chapterNumber = 1,
  identityLine,
  width = 1080,
  height = 1920,
  locale,
  brandUrl = XINGQI_BRAND_URL,
  installUrl = XINGQI_INSTALL_URL,
  ...rest
}: ShareableXingqiCardProps) {
  const scale = width / 1080
  const s = (n: number) => Math.round(n * scale)
  const cjk = isCjkZh(locale ?? '')
  const titleFont = 'CrimsonPro'
  const quoteFont = cjk ? 'CrimsonPro' : 'CrimsonPro-Italic'
  const labelFont = 'IBMPlexMono'
  const numeral = chapterNumber >= 1 && chapterNumber <= 6 ? chapterNumber : undefined
  const seal = CHAPTER_GLYPH[chapterKind]

  return (
    <View
      {...rest}
      style={{
        width,
        height,
        backgroundColor: PAPER,
        paddingHorizontal: s(96),
        paddingVertical: s(150),
        justifyContent: 'space-between',
      }}
    >
      <View style={{ alignItems: 'center', gap: s(40) }}>
        <AncientSeal
          glyph={seal}
          size={s(184)}
          tile={INK}
          ink={PAPER}
          inset={0.84}
          strokeWidth={7}
        />
        <Text
          style={{
            fontFamily: titleFont,
            fontSize: cjk ? s(88) : s(74),
            lineHeight: cjk ? s(96) : s(82),
            color: INK,
            letterSpacing: cjk ? s(4) : 0,
            textAlign: 'center',
          }}
        >
          {chapterLabel}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(10) }}>
          <Text
            style={{
              fontFamily: labelFont,
              fontSize: s(26),
              letterSpacing: s(4),
              color: INK_MUTED,
              textTransform: cjk ? 'none' : 'uppercase',
            }}
          >
            {cjk ? '第' : 'Chapter'}
          </Text>
          {numeral ? (
            <AncientNumeral n={numeral} size={s(30)} color={INK_MUTED} strokeWidth={3.4} />
          ) : null}
        </View>
      </View>

      <View style={{ alignItems: 'center' }}>
        <Text
          style={{
            fontFamily: quoteFont,
            fontStyle: cjk ? 'normal' : 'italic',
            fontSize: cjk ? s(56) : s(60),
            lineHeight: cjk ? s(88) : s(84),
            color: INK,
            textAlign: 'center',
          }}
        >
          {leadLine}
        </Text>
      </View>

      <View style={{ alignItems: 'center', gap: s(40) }}>
        {identityLine ? (
          <Text
            style={{
              fontFamily: labelFont,
              fontSize: s(30),
              letterSpacing: s(4),
              color: INK_SOFT,
              textAlign: 'center',
            }}
          >
            {identityLine}
          </Text>
        ) : null}

        <AncientSeal
          glyph='永'
          size={s(132)}
          tile={CINNABAR}
          ink={CINNABAR}
          outline
          inset={0.78}
          strokeWidth={9}
        />

        {installUrl ? (
          <QrCode value={installUrl} size={s(190)} color={INK} background={PAPER} />
        ) : null}

        <Text
          style={{
            fontFamily: labelFont,
            fontSize: s(26),
            letterSpacing: s(4),
            color: INK_MUTED,
          }}
        >
          {brandUrl}
        </Text>
      </View>
    </View>
  )
}
