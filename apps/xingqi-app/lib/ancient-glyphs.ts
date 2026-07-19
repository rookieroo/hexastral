/**
 * Xingqi ancient-script glyphs — hand-authored after attested 甲骨/金文 forms.
 * Pictographic seals for report chapters (NOT simplified 汉字 as text).
 */

export type AncientGlyph = {
  box: [number, number]
  strokes?: string[]
  fills?: string[]
  dots?: Array<[number, number, number]>
  twin?: Array<{ paths: string[]; dx: number }>
}

/**
 * Chapter seals (pictographs):
 *   象 — image/form (overview): kneeling figure looking at a mark of appearance
 *   面 — face: eye (目) over cheek bowl
 *   又 — hand/palm: five-finger palm pictograph (又/手 lineage)
 *   命 — natal charge: person under a heaven-mark (口/令 → 命)
 *   月 — period moon
 *   永 — lasting flow / counsel
 * Plus 五行 for optional essence keys.
 */
export const XINGQI_GLYPHS = {
  象: {
    // Form / image — a standing torso with an outward “appearance” arc (not 简体象).
    box: [100, 130],
    strokes: [
      'M50,22 C48,40 47,58 48,78 C49,96 46,110 42,118', // spine
      'M50,38 C36,42 28,54 30,68', // left shoulder→arm
      'M50,38 C64,42 72,54 70,68', // right
      'M32,72 C42,86 58,86 68,72', // belly arc = “form”
      'M38,108 C46,102 54,102 62,108', // stance
    ],
    dots: [[50, 18, 4]], // head
  },
  面: {
    // Face — 甲骨 目 over a soft cheek bowl (面).
    box: [100, 130],
    strokes: [
      'M28,40 C40,28 60,28 72,40 C60,52 40,52 28,40 Z', // 目 outline
      'M34,78 C40,96 60,96 66,78 C60,88 40,88 34,78 Z', // cheek / 面 lower
      'M42,62 L58,62', // brow bridge
    ],
    dots: [[50, 40, 4.2]], // pupil
  },
  又: {
    // Palm / hand — five-stroke 又: palm + fingers (象形手).
    box: [100, 130],
    strokes: [
      'M52,28 C48,48 46,68 48,92 C49,104 46,114 42,120', // arm
      'M52,36 C40,34 30,42 28,54', // thumb
      'M52,40 C62,32 74,34 78,46', // index
      'M52,48 C64,46 76,52 80,64', // middle
      'M52,58 C62,60 72,68 74,80', // ring
      'M48,68 C56,74 62,84 62,96', // little
    ],
  },
  命: {
    // Natal — person under a “charge” mark (令→命 feel): lid + kneeling figure.
    box: [100, 130],
    strokes: [
      'M30,36 C42,24 58,24 70,36', // heaven lid
      'M36,40 L64,40', // bar of decree
      'M50,48 C49,66 47,84 44,100 C42,108 48,114 56,112', // kneeling back
      'M48,72 C58,80 66,90 70,100', // forward knee
    ],
    dots: [[50, 28, 3.5]],
  },
  月: {
    box: [100, 130],
    fills: [
      'M58,16 C36,28 30,60 41,92 C46,106 53,113 61,117 C49,103 44,80 46,58 C48,38 52,26 58,16 Z',
    ],
    strokes: ['M49,56 L57,60'],
  },
  永: {
    // Flowing water — counsel / lasting (永).
    box: [100, 130],
    strokes: [
      'M50,24 C44,42 57,57 49,73 C42,88 52,102 49,116',
      'M49,50 C40,56 33,66 29,80',
      'M49,80 C59,85 67,95 71,109',
    ],
    dots: [[50, 16, 4.2]],
  },
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
    fills: [
      'M50,106 C41,90 44,58 50,26 C56,58 59,90 50,106 Z',
      'M33,106 C27,94 29,74 37,58 C40,76 39,94 33,106 Z',
      'M67,106 C73,94 71,74 63,58 C60,76 61,94 67,106 Z',
    ],
  },
  土: {
    box: [100, 130],
    strokes: ['M24,108 L76,108', 'M50,108 L50,62'],
    fills: ['M50,40 C61,46 64,55 62,64 L38,64 C36,55 39,46 50,40 Z'],
  },
} as const satisfies Record<string, AncientGlyph>

export type XingqiGlyphKey = keyof typeof XINGQI_GLYPHS

/** Chapter → pictographic seal (not modern 简体 labels). */
export const CHAPTER_GLYPH: Record<
  'overview' | 'face' | 'palms' | 'natal' | 'period' | 'advice',
  XingqiGlyphKey
> = {
  overview: '象',
  face: '面',
  palms: '又',
  natal: '命',
  period: '月',
  advice: '永',
}

export const CHAPTER_GLYPH_BLURB: Record<
  XingqiGlyphKey,
  { zh: string; en: string }
> = {
  象: {
    zh: '象 — 形气之象：人立而现外形，总览一章的“看见什么形”。',
    en: 'Form-image: a standing figure’s outline — what the reading “sees” overall.',
  },
  面: {
    zh: '面 — 目在上、颊在下：面部一章的象形，不是简体“面”字贴图。',
    en: 'Face: eye over cheek bowl — a face pictograph, not a modern character sticker.',
  },
  又: {
    zh: '又 — 手掌伸出五指：双手一章，取甲骨“手/又”系象形。',
    en: 'Palm: outstretched hand with fingers — oracle-bone hand lineage.',
  },
  命: {
    zh: '命 — 人跪承令：形气对照八字时的“禀命”意象。',
    en: 'Natal charge: figure under a decree mark — form × BaZi.',
  },
  月: {
    zh: '月 — 缺月之形：本期时间窗，与流月/阶段有关。',
    en: 'Moon crescent: the period window.',
  },
  永: {
    zh: '永 — 水长流：建议章的长久之象（泳之本字）。',
    en: 'Long flow of water: counsel that lasts (root of 泳).',
  },
  金: { zh: '金 — 金属之形', en: 'Metal' },
  木: { zh: '木 — 树木之形', en: 'Wood' },
  水: { zh: '水 — 水流之形', en: 'Water' },
  火: { zh: '火 — 火焰之形', en: 'Fire' },
  土: { zh: '土 — 土壤之形', en: 'Earth' },
}

/** How ink masses arrange behind the seal — derived from chapter role. */
export type InkRelation = 'gather' | 'pair' | 'contrast' | 'flow'

export function relationForChapter(
  kind: 'overview' | 'face' | 'palms' | 'natal' | 'period' | 'advice'
): InkRelation {
  if (kind === 'palms') return 'pair'
  if (kind === 'natal') return 'contrast'
  if (kind === 'period' || kind === 'advice') return 'flow'
  return 'gather'
}

const WUXING = ['金', '木', '水', '火', '土'] as const
export type WuxingChar = (typeof WUXING)[number]

/** Pull a 五行 cue from chapter / natal prose when the model names one. */
export function detectWuxing(...texts: string[]): WuxingChar | undefined {
  const blob = texts.join('\n')
  for (const el of WUXING) {
    if (blob.includes(el)) return el
  }
  // English fallbacks in model output
  const lower = blob.toLowerCase()
  if (/\bmetal\b|gold/.test(lower)) return '金'
  if (/\bwood\b/.test(lower)) return '木'
  if (/\bwater\b/.test(lower)) return '水'
  if (/\bfire\b/.test(lower)) return '火'
  if (/\bearth\b/.test(lower)) return '土'
  return undefined
}
