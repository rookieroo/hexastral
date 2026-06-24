/**
 * Ancient-script glyph vectors — hand-authored after attested 甲骨/金文 forms.
 *
 * These are ORIGINAL vector outlines (not extracted from any font); the ancient
 * forms themselves are public-domain. Used for the 碑拓 (stele-rubbing) chapter
 * seals and the 用神 (favourable-element) key. Pure data — no React/SVG import —
 * so it stays testable and reusable across react-native-svg and Skia.
 *
 * Coordinates live in each glyph's intrinsic `box` ([width, height]); the
 * renderer scales + centres them into a tile.
 */

export interface AncientGlyph {
  /** Intrinsic viewBox [width, height]. */
  box: [number, number]
  /** Stroked centreline paths (outline strokes). */
  strokes?: string[]
  /** Filled shapes. */
  fills?: string[]
  /** Filled dots [cx, cy, r]. */
  dots?: Array<[number, number, number]>
  /** Two-figure composites (e.g. 北 = 二人相背); each group is translated by dx. */
  twin?: Array<{ paths: string[]; dx: number }>
}

// 人 in profile — one sweeping stroke (head·back·leg) + one arm hanging in front.
const PL = ['M60,15 C63,40 59,64 50,87 C45,101 41,112 39,124', 'M57,41 C49,54 43,66 40,86']
const PR = ['M40,15 C37,40 41,64 50,87 C55,101 59,112 61,124', 'M43,41 C51,54 57,66 60,86']

/** Six chapter-essence seals + five 五行 用神 keys. */
export const GLYPHS = {
  // ── 六章之印 ──
  見: {
    // 甲骨文 見 — a big eye (目) over a kneeling figure who looks. The body is a
    // clear back-curve folding into a knee, not a thin squiggle, so the person
    // reads at chop scale.
    box: [100, 130],
    strokes: [
      'M22,33 C38,21 62,21 78,33 C62,45 38,45 22,33 Z', // 目 (eye)
      'M50,50 C49,66 47,82 44,96 C42,104 47,110 55,109', // back + kneel
      'M48,74 C57,82 64,90 70,100', // arm/knee forward
    ],
    dots: [[50, 33, 4.6]], // 瞳 (pupil)
  },
  言: {
    // 甲骨文 言 — a tongue (舌) rising from a mouth with a sound-bar. The 口 is a
    // rounded brush bowl (the old rigid rectangle read as machine-drawn); the
    // tongue forks at the tip, the way speech "issues" from the mouth.
    box: [100, 130],
    fills: ['M37,94 C37,108 63,108 63,94 C56,100 44,100 37,94 Z'], // 口 bowl
    strokes: [
      'M50,94 L50,52', // 舌 tongue stem
      'M30,66 C43,63 57,63 70,66', // sound bar (brushed)
      'M50,52 C46,46 43,42 41,38', // fork left
      'M50,52 C54,46 57,42 59,38', // fork right
    ],
  },
  北: {
    box: [160, 130],
    twin: [
      { paths: PL, dx: 16 },
      { paths: PR, dx: 58 },
    ],
  }, // 二人相背
  合: {
    // 甲骨文 合 — a lid (亼) seated on a vessel (口): two things that fit. The
    // vessel is a round-bottomed brush cup (was a box), so the "fit" reads.
    box: [100, 130],
    strokes: [
      'M27,57 C38,44 50,30 50,26 C50,30 62,44 73,57', // 亼 lid (peaked, brushed)
      'M37,70 L63,70 C61,90 58,98 50,100 C42,98 39,90 37,70 Z', // 口 vessel (cup)
    ],
  },
  月: {
    box: [100, 130],
    fills: [
      'M58,16 C36,28 30,60 41,92 C46,106 53,113 61,117 C49,103 44,80 46,58 C48,38 52,26 58,16 Z',
    ],
    strokes: ['M49,56 L57,60'],
  },
  永: {
    // 甲骨文 永 — flowing water: the origin of 泳 ("to swim"), borrowed for "long /
    // perpetual". A long meandering current (length = 永) springing from a source at
    // its head, with two tributaries peeling off and flowing downward — water in
    // motion, not the limbs-and-fork "swimmer" the older form read as at chop scale.
    box: [100, 130],
    strokes: [
      'M50,24 C44,42 57,57 49,73 C42,88 52,102 49,116', // main current (the long flow)
      'M49,50 C40,56 33,66 29,80', // tributary peeling down-left
      'M49,80 C59,85 67,95 71,109', // tributary peeling down-right
    ],
    dots: [[50, 16, 4.2]], // spring at the source
  },
  // ── 五行 (用神 keys) ──
  金: {
    box: [100, 130],
    strokes: [
      'M26,54 L50,22 L74,54',
      'M40,42 L60,42',
      'M50,54 L50,106',
      'M34,78 L66,78',
      'M30,106 L70,106',
    ],
    dots: [
      [38, 92, 3.8],
      [62, 92, 3.8],
    ],
  },
  木: {
    box: [100, 130],
    strokes: [
      'M50,16 L50,116',
      'M50,46 C42,38 34,32 26,26',
      'M50,46 C58,38 66,32 74,26',
      'M50,84 C42,92 34,100 26,110',
      'M50,84 C58,92 66,100 74,110',
    ],
  },
  水: {
    box: [100, 130],
    strokes: [
      'M50,12 C43,30 57,46 50,62 C43,78 57,96 50,118',
      'M33,40 C31,46 31,51 33,57',
      'M31,74 C29,80 29,85 31,91',
      'M67,46 C69,52 69,57 67,63',
      'M69,80 C71,86 71,91 69,97',
    ],
  },
  火: {
    // 甲骨文 火 — three rising flame tongues (a 篝火), the attested pictograph: a
    // tall central flame flanked by two shorter ones. Filled, so as a 朱文 chop it
    // reads unmistakably as fire (the old 4-stroke 丷+人 read as a sparse X).
    box: [100, 130],
    fills: [
      'M50,106 C41,90 44,58 50,26 C56,58 59,90 50,106 Z', // central flame
      'M33,106 C27,94 29,74 37,58 C40,76 39,94 33,106 Z', // left flame
      'M67,106 C73,94 71,74 63,58 C60,76 61,94 67,106 Z', // right flame
    ],
  },
  土: {
    box: [100, 130],
    strokes: ['M24,108 L76,108', 'M50,108 L50,62'],
    fills: ['M50,40 C61,46 64,55 62,64 L38,64 C36,55 39,46 50,40 Z'],
  },
} satisfies Record<string, AncientGlyph>

export type GlyphKey = keyof typeof GLYPHS

/** Chapter kind → its essence-seal glyph. */
export const CHAPTER_SEAL: Record<string, GlyphKey> = {
  first_impression: '見',
  communication: '言',
  conflict: '北',
  complement: '合',
  monthly_outlook: '月',
  long_term_advice: '永',
}

/** 五行 element char → glyph key (identity, but typed for the 用神 key). */
export const WUXING_GLYPH: Record<string, GlyphKey> = {
  金: '金',
  木: '木',
  水: '水',
  火: '火',
  土: '土',
}

/**
 * Ancient 积画 numerals 一二三亖𠄡六 = 1–6, as stroked brush paths in a 0 0 46 46
 * box. Used for the chapter layer indices + footer chapter number (one unified
 * numeral system — never Arabic/Roman). Hand-authored, not a font.
 */
export const NUMERALS: Record<number, string[]> = {
  1: ['M9,23 C19,21 27,21 37,23'],
  2: ['M9,18 C19,16 27,16 37,18', 'M9,28 C19,26 27,26 37,28'],
  3: ['M9,14 C19,12 27,12 37,14', 'M9,23 C19,21 27,21 37,23', 'M9,32 C19,30 27,30 37,32'],
  4: [
    'M9,12 C19,10 27,10 37,12',
    'M9,20 C19,18 27,18 37,20',
    'M9,28 C19,26 27,26 37,28',
    'M9,36 C19,34 27,34 37,36',
  ],
  5: ['M11,11 C19,9 27,9 35,11', 'M15,15 L31,31', 'M31,15 L15,31', 'M11,35 C19,33 27,33 35,35'],
  6: ['M16,13 L30,13', 'M23,13 L14,34', 'M23,13 L32,34'],
}
