/**
 * Xingqi ancient-script glyphs — hand-authored after attested 甲骨/金文 forms.
 * Pictographic seals for report chapters (NOT simplified 汉字 as text).
 */

import { isZhHant } from '@/lib/locale-zh'

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
  /** Locus seals — sheet header pictographs (featureKey → glyph). */
  loc_tianTing: {
    box: [100, 130],
    strokes: ['M22,48 C38,28 62,28 78,48', 'M28,52 L72,52'],
    dots: [[50, 38, 3]],
  },
  loc_yinTang: {
    box: [100, 130],
    strokes: ['M34,58 L66,58', 'M42,48 L58,48'],
    dots: [[50, 54, 5]],
  },
  loc_shanGen: {
    box: [100, 130],
    strokes: ['M50,28 L50,88', 'M38,52 L62,52', 'M44,72 L56,72'],
  },
  loc_foreheadWidth: {
    box: [100, 130],
    strokes: ['M20,42 L80,42', 'M24,56 L76,56'],
  },
  loc_eyebrowType: {
    box: [100, 130],
    strokes: ['M28,52 C38,44 48,44 58,52', 'M42,52 C52,44 62,44 72,52'],
  },
  loc_eyeType: {
    box: [100, 130],
    strokes: ['M30,58 C42,48 58,48 70,58 C58,68 42,68 30,58 Z'],
    dots: [[50, 58, 4]],
  },
  loc_noseShape: {
    box: [100, 130],
    strokes: ['M50,32 L50,96', 'M42,72 C46,84 54,84 58,72'],
  },
  loc_cheekBones: {
    box: [100, 130],
    strokes: ['M28,64 L42,80', 'M72,64 L58,80', 'M50,48 L50,92'],
  },
  loc_nasolabialFolds: {
    box: [100, 130],
    strokes: ['M38,72 C42,88 48,92 50,92', 'M62,72 C58,88 52,92 50,92'],
  },
  loc_mouthType: {
    box: [100, 130],
    strokes: ['M36,78 C44,88 56,88 64,78'],
  },
  loc_chin: {
    box: [100, 130],
    strokes: ['M32,72 C40,96 60,96 68,72', 'M50,72 L50,108'],
  },
  loc_earLobes: {
    box: [100, 130],
    strokes: ['M68,48 C78,56 78,76 68,84', 'M32,48 C22,56 22,76 32,84'],
  },
  loc_handShape: {
    box: [100, 130],
    strokes: [
      'M52,28 C48,48 46,68 48,92',
      'M52,36 C40,34 28,42 28,54',
      'M52,40 C62,32 74,34 78,46',
    ],
  },
  loc_lifeLine: {
    box: [100, 130],
    strokes: ['M62,28 C48,48 44,72 48,108'],
  },
  loc_headLine: {
    box: [100, 130],
    strokes: ['M28,56 C48,52 68,58 78,72'],
  },
  loc_heartLine: {
    box: [100, 130],
    strokes: ['M24,68 C44,58 68,62 76,78'],
  },
  loc_fateLine: {
    box: [100, 130],
    strokes: ['M50,32 L50,108', 'M50,48 C56,64 54,84 50,96'],
  },
  loc_mounts: {
    box: [100, 130],
    fills: ['M50,52 C62,58 64,72 58,82 L42,82 C36,72 38,58 50,52 Z'],
  },
  loc_specialMarks: {
    box: [100, 130],
    strokes: ['M42,48 L58,72', 'M58,48 L42,72'],
    dots: [[50, 60, 4]],
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
  loc_tianTing: { zh: '天庭 — 上停额域', en: 'Upper forehead' },
  loc_yinTang: { zh: '印堂 — 眉间神采', en: 'Glabella' },
  loc_shanGen: { zh: '山根 — 鼻梁根', en: 'Bridge root' },
  loc_foreheadWidth: { zh: '额宽 — 上停横向', en: 'Forehead span' },
  loc_eyebrowType: { zh: '眉 — 情志外显', en: 'Brows' },
  loc_eyeType: { zh: '目 — 神采', en: 'Eyes' },
  loc_noseShape: { zh: '鼻 — 中岳', en: 'Nose' },
  loc_cheekBones: { zh: '颧 — 五岳', en: 'Cheekbones' },
  loc_nasolabialFolds: { zh: '法令 — 口角纹', en: 'Nasolabial' },
  loc_mouthType: { zh: '口 — 表达', en: 'Mouth' },
  loc_chin: { zh: '地阁 — 收束', en: 'Chin' },
  loc_earLobes: { zh: '耳垂', en: 'Ear lobes' },
  loc_handShape: { zh: '掌形', en: 'Palm shape' },
  loc_lifeLine: { zh: '生命线', en: 'Life line' },
  loc_headLine: { zh: '智慧线', en: 'Head line' },
  loc_heartLine: { zh: '感情线', en: 'Heart line' },
  loc_fateLine: { zh: '事业线', en: 'Fate line' },
  loc_mounts: { zh: '丘位', en: 'Mounts' },
  loc_specialMarks: { zh: '纹记', en: 'Special marks' },
}

/** featureKey → seal glyph for locus sheet header. */
export const LOCUS_GLYPH: Record<string, XingqiGlyphKey> = {
  tianTing: 'loc_tianTing',
  yinTang: 'loc_yinTang',
  shanGen: 'loc_shanGen',
  foreheadWidth: 'loc_foreheadWidth',
  eyebrowType: 'loc_eyebrowType',
  eyeType: 'loc_eyeType',
  noseShape: 'loc_noseShape',
  cheekBones: 'loc_cheekBones',
  nasolabialFolds: 'loc_nasolabialFolds',
  mouthType: 'loc_mouthType',
  chin: 'loc_chin',
  earLobes: 'loc_earLobes',
  handShape: 'loc_handShape',
  lifeLine: 'loc_lifeLine',
  headLine: 'loc_headLine',
  heartLine: 'loc_heartLine',
  fateLine: 'loc_fateLine',
  mounts: 'loc_mounts',
  specialMarks: 'loc_specialMarks',
}

export type LocusCanonGroup = 'face' | 'palm'

/** Symbols glossary + sheet — 19 star-capable loci (spatial keys only). */
export type LocusCanon = {
  featureKey: string
  glyph: XingqiGlyphKey
  group: LocusCanonGroup
  titleZh: string
  titleZhHant: string
  titleEn: string
  blurbZh: string
  blurbZhHant: string
  blurbEn: string
}

export const XINGQI_LOCUS_CANON: readonly LocusCanon[] = [
  {
    featureKey: 'tianTing',
    glyph: 'loc_tianTing',
    group: 'face',
    titleZh: '天庭',
    titleZhHant: '天庭',
    titleEn: 'Forehead (heaven court)',
    blurbZh: '额上停：气势、早年格局的可见轮廓',
    blurbZhHant: '額上停：氣勢、早年格局的可見輪廓',
    blurbEn: 'Upper court — early-life frame and presence.',
  },
  {
    featureKey: 'yinTang',
    glyph: 'loc_yinTang',
    group: 'face',
    titleZh: '印堂',
    titleZhHant: '印堂',
    titleEn: 'Glabella',
    blurbZh: '两眉间：神采聚散、运势敏感带',
    blurbZhHant: '兩眉間：神采聚散、運勢敏感帶',
    blurbEn: 'Between the brows — spirit gather / scatter.',
  },
  {
    featureKey: 'shanGen',
    glyph: 'loc_shanGen',
    group: 'face',
    titleZh: '山根',
    titleZhHant: '山根',
    titleEn: 'Nose-root',
    blurbZh: '鼻梁根：上下停衔接，气机是否贯通',
    blurbZhHant: '鼻梁根：上下停銜接，氣機是否貫通',
    blurbEn: 'Bridge root — upper/middle court join.',
  },
  {
    featureKey: 'foreheadWidth',
    glyph: 'loc_foreheadWidth',
    group: 'face',
    titleZh: '额宽',
    titleZhHant: '額寬',
    titleEn: 'Forehead span',
    blurbZh: '上停横向：开阔或收束的格局感',
    blurbZhHant: '上停橫向：開闊或收束的格局感',
    blurbEn: 'Lateral upper court — open or gathered frame.',
  },
  {
    featureKey: 'eyebrowType',
    glyph: 'loc_eyebrowType',
    group: 'face',
    titleZh: '眉',
    titleZhHant: '眉',
    titleEn: 'Brows',
    blurbZh: '情志与决断的外显',
    blurbZhHant: '情志與決斷的外顯',
    blurbEn: 'Affect and decisiveness made visible.',
  },
  {
    featureKey: 'eyeType',
    glyph: 'loc_eyeType',
    group: 'face',
    titleZh: '目',
    titleZhHant: '目',
    titleEn: 'Eyes',
    blurbZh: '神采、察人与自我呈现',
    blurbZhHant: '神采、察人與自我呈現',
    blurbEn: 'Spirit, reading others, self-presentation.',
  },
  {
    featureKey: 'noseShape',
    glyph: 'loc_noseShape',
    group: 'face',
    titleZh: '鼻',
    titleZhHant: '鼻',
    titleEn: 'Nose',
    blurbZh: '中岳：财气与中年承托的可见形',
    blurbZhHant: '中岳：財氣與中年承托的可見形',
    blurbEn: 'Central peak — midlife support and means.',
  },
  {
    featureKey: 'cheekBones',
    glyph: 'loc_cheekBones',
    group: 'face',
    titleZh: '颧骨',
    titleZhHant: '顴骨',
    titleEn: 'Cheekbones',
    blurbZh: '五岳东西：支撑感、外拓或内敛',
    blurbZhHant: '五岳東西：支撐感、外拓或內斂',
    blurbEn: 'East–west peaks — outward push or hold.',
  },
  {
    featureKey: 'nasolabialFolds',
    glyph: 'loc_nasolabialFolds',
    group: 'face',
    titleZh: '法令',
    titleZhHant: '法令',
    titleEn: 'Nasolabial',
    blurbZh: '口角纹：行动与取舍的痕迹感',
    blurbZhHant: '口角紋：行動與取捨的痕跡感',
    blurbEn: 'Folds by the mouth — action and choice marks.',
  },
  {
    featureKey: 'mouthType',
    glyph: 'loc_mouthType',
    group: 'face',
    titleZh: '口唇',
    titleZhHant: '口唇',
    titleEn: 'Mouth',
    blurbZh: '表达、食禄与人际出口',
    blurbZhHant: '表達、食祿與人際出口',
    blurbEn: 'Expression, intake, social outlet.',
  },
  {
    featureKey: 'chin',
    glyph: 'loc_chin',
    group: 'face',
    titleZh: '地阁',
    titleZhHant: '地閣',
    titleEn: 'Chin',
    blurbZh: '下巴：收束、晚运承托的可见形',
    blurbZhHant: '下巴：收束、晚運承托的可見形',
    blurbEn: 'Lower court — late-life settle and support.',
  },
  {
    featureKey: 'earLobes',
    glyph: 'loc_earLobes',
    group: 'face',
    titleZh: '耳垂',
    titleZhHant: '耳垂',
    titleEn: 'Ear lobes',
    blurbZh: '福厚感、旁宫辅助线索',
    blurbZhHant: '福厚感、旁宮輔助線索',
    blurbEn: 'Fullness cue — side-palace support.',
  },
  {
    featureKey: 'handShape',
    glyph: 'loc_handShape',
    group: 'palm',
    titleZh: '掌形',
    titleZhHant: '掌形',
    titleEn: 'Palm shape',
    blurbZh: '地/火/风/水等外形倾向',
    blurbZhHant: '地／火／風／水等外形傾向',
    blurbEn: 'Earth / fire / air / water form lean.',
  },
  {
    featureKey: 'lifeLine',
    glyph: 'loc_lifeLine',
    group: 'palm',
    titleZh: '生命线',
    titleZhHant: '生命線',
    titleEn: 'Life line',
    blurbZh: '活力与节奏（弧线中点）',
    blurbZhHant: '活力與節奏（弧線中點）',
    blurbEn: 'Vitality and tempo (arc midpoint).',
  },
  {
    featureKey: 'headLine',
    glyph: 'loc_headLine',
    group: 'palm',
    titleZh: '智慧线',
    titleZhHant: '智慧線',
    titleEn: 'Head line',
    blurbZh: '思虑与决断方式',
    blurbZhHant: '思慮與決斷方式',
    blurbEn: 'How thought and decision run.',
  },
  {
    featureKey: 'heartLine',
    glyph: 'loc_heartLine',
    group: 'palm',
    titleZh: '感情线',
    titleZhHant: '感情線',
    titleEn: 'Heart line',
    blurbZh: '亲密与情感出口',
    blurbZhHant: '親密與情感出口',
    blurbEn: 'Intimacy and emotional outlet.',
  },
  {
    featureKey: 'fateLine',
    glyph: 'loc_fateLine',
    group: 'palm',
    titleZh: '事业线',
    titleZhHant: '事業線',
    titleEn: 'Fate line',
    blurbZh: '方向感与事业轴线（有则标）',
    blurbZhHant: '方向感與事業軸線（有則標）',
    blurbEn: 'Direction axis when present.',
  },
  {
    featureKey: 'mounts',
    glyph: 'loc_mounts',
    group: 'palm',
    titleZh: '丘位',
    titleZhHant: '丘位',
    titleEn: 'Mounts',
    blurbZh: '主导丘中心（可点名多丘）',
    blurbZhHant: '主導丘中心（可點名多丘）',
    blurbEn: 'Dominant mount center.',
  },
  {
    featureKey: 'specialMarks',
    glyph: 'loc_specialMarks',
    group: 'palm',
    titleZh: '特殊纹记',
    titleZhHant: '特殊紋記',
    titleEn: 'Special marks',
    blurbZh: '岛纹/十字等显著记',
    blurbZhHant: '島紋／十字等顯著記',
    blurbEn: 'Islands, crosses, notable marks.',
  },
] as const

export function locusGlyphKey(featureKey: string): XingqiGlyphKey {
  return LOCUS_GLYPH[featureKey] ?? '象'
}

export function locusCanonByKey(featureKey: string): LocusCanon | undefined {
  return XINGQI_LOCUS_CANON.find((c) => c.featureKey === featureKey)
}

export function locusTitleForLocale(featureKey: string, locale: string): string {
  const c = locusCanonByKey(featureKey)
  if (!c) return featureKey
  if (isZhHant(locale)) return c.titleZhHant
  if (locale.startsWith('zh')) return c.titleZh
  return c.titleEn
}

export function locusBlurbForLocale(featureKey: string, locale: string): string {
  const c = locusCanonByKey(featureKey)
  if (!c) return ''
  if (isZhHant(locale)) return c.blurbZhHant
  if (locale.startsWith('zh')) return c.blurbZh
  return c.blurbEn
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
