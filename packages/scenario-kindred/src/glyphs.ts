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
    box: [100, 130],
    strokes: [
      'M22,33 C38,21 62,21 78,33 C62,45 38,45 22,33 Z', // 目 (eye)
      'M48,50 C46,72 44,92 40,113', // 人 body
      'M49,66 C56,80 61,95 66,113', // 人 leg/arm
    ],
    dots: [[50, 33, 4.6]], // 瞳 (pupil)
  },
  言: {
    box: [100, 130],
    strokes: [
      'M40,100 L60,100 L60,115 L40,115 Z', // 口 (mouth)
      'M50,100 L50,50', // 舌 stem
      'M29,66 L71,66', // bar
      'M50,50 L43,38',
      'M50,50 L57,38', // forked tongue tip
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
    box: [100, 130],
    strokes: ['M28,58 L50,25 L72,58', 'M38,70 L62,70 L62,98 L38,98 Z'], // 亼 lid + 口 vessel
  },
  月: {
    box: [100, 130],
    fills: [
      'M58,16 C36,28 30,60 41,92 C46,106 53,113 61,117 C49,103 44,80 46,58 C48,38 52,26 58,16 Z',
    ],
    strokes: ['M49,56 L57,60'],
  },
  永: {
    box: [100, 130],
    strokes: [
      'M30,33 C45,29 58,31 64,40 C61,52 57,72 57,92 C57,103 51,109 43,107',
      'M53,57 C45,66 37,77 27,92',
      'M55,59 C63,71 71,86 79,101',
    ],
    dots: [[47, 17, 4.2]],
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
    box: [100, 130],
    strokes: [
      'M50,120 C49,98 51,80 50,56 C49,47 50,40 51,33',
      'M44,112 C41,93 35,80 31,62 C29,55 30,50 32,45',
      'M56,112 C59,93 65,80 69,62 C71,55 70,50 68,45',
      'M46,86 L43,75',
      'M54,86 L57,75',
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
 * Ancient 积画 numerals 一二三亖㐅六 = 1–6, as stroked brush paths in a 0 0 46 46
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
  5: ['M12,12 L34,34', 'M34,12 L12,34'],
  6: ['M16,13 L30,13', 'M23,13 L14,34', 'M23,13 L32,34'],
}
