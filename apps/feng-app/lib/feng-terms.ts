/**
 * 风水术语层 — the single source of truth for Fēng's terminology.
 *
 * Feeds two surfaces: the inline `FengTermBubble` (tap a dotted term in report
 * prose → plain-language definition) and the glossary screen. Mirrors Yuel's
 * "terms table is one source, shared by glossary + generation prompt" pattern,
 * but is feng-domain (玄空/八宅/峦头/格局/形理) and authored to be CORRECT — the
 * in-house 沈氏-grounded standard, not marketing copy.
 *
 * Definitions are zh + en. zh-Hant reuses zh (V1; convert later); ja falls back
 * to en (Yuel does the same for ja/ko). The synthesis prompt in
 * services/svc-feng can later import the same surface list to keep terms aligned.
 */

import type { Locale } from './i18n'

export type FengTermCategory = 'xuankong' | 'bazhai' | 'luantou' | 'gameju' | 'xingli'

export interface FengTerm {
  id: string
  /** Primary surface form matched in prose. */
  term: string
  /** Other surface forms that resolve to the same definition. */
  aliases?: string[]
  category: FengTermCategory
  zh: string
  en: string
  /** 出处 — classical source, shown as provenance. */
  source?: string
}

export const FENG_CATEGORY_LABEL: Record<FengTermCategory, { zh: string; en: string }> = {
  xuankong: { zh: '玄空飞星', en: 'Flying Stars (Xuankong)' },
  bazhai: { zh: '八宅', en: 'Eight Mansions (Bazhai)' },
  luantou: { zh: '峦头形势', en: 'Landform (Luantou)' },
  gameju: { zh: '格局', en: 'Chart Patterns' },
  xingli: { zh: '形理整合', en: 'Form & Principle' },
}

export const FENG_TERMS: readonly FengTerm[] = [
  // ── 玄空飞星 ──────────────────────────────────────────────
  {
    id: 'sanyuan_jiuyun',
    term: '三元九运',
    aliases: ['元运', '九运', '当元'],
    category: 'xuankong',
    zh: '风水将时间分上、中、下三元,每元三运,共九运;每运二十年,合一百八十年为一周期。当前 2024–2043 年为九运(离火当令)。元运决定全局气运背景。',
    en: 'Time is divided into three eras of three cycles each — nine 20-year cycles (180 years total). 2024–2043 is Cycle 9 (Li/fire). The era-cycle sets the baseline energy of the whole chart.',
    source: '《沈氏玄空学》',
  },
  {
    id: 'yunpan',
    term: '运盘',
    aliases: ['天盘', '地运'],
    category: 'xuankong',
    zh: '以当元运星入中宫顺飞九宫所得之盘,是整座宅的气运底盘,山盘、向盘皆由它起。',
    en: 'The base plate: the ruling cycle-star placed in the center and flown forward through the nine palaces. Both the mountain and facing plates are derived from it.',
  },
  {
    id: 'shanpan',
    term: '山盘',
    aliases: ['坐星', '山星'],
    category: 'xuankong',
    zh: '以坐山所临之运星定阴阳顺逆,飞布九宫。山星主人丁、健康、人际关系 —— "山管人丁"。',
    en: 'The mountain plate, flown from the star sitting at the rear. Mountain stars govern people, health and relationships — "the mountain rules people".',
  },
  {
    id: 'xiangpan',
    term: '向盘',
    aliases: ['向星'],
    category: 'xuankong',
    zh: '以向首所临之运星定阴阳顺逆,飞布九宫。向星主财禄 —— "水管财"。',
    en: 'The facing plate, flown from the star at the facing direction. Facing stars govern wealth — "the water rules money".',
  },
  {
    id: 'xiagua',
    term: '下卦',
    category: 'xuankong',
    zh: '立向落在一卦的中间度数时,直接以运盘飞星起山向盘的常规起法。',
    en: 'The standard method: when the facing sits squarely in the middle of a trigram, the mountain/facing plates are flown directly from the cycle plate.',
  },
  {
    id: 'tigua',
    term: '替卦',
    aliases: ['起星', '兼向'],
    category: 'xuankong',
    zh: '立向偏到一卦的边线(兼向)时,改用"替星诀"起山向星,以校正偏气。下卦与替卦起出的盘可能截然不同。',
    en: 'When the facing leans to the edge of a trigram (a "shared" facing), the replacement-star method is used instead, to correct the skewed energy. It can yield a very different chart from the standard method.',
    source: '《沈氏玄空学》',
  },
  {
    id: 'zibai',
    term: '紫白飞星',
    aliases: ['年紫白', '流年飞星', '年盘'],
    category: 'xuankong',
    zh: '每年有一颗星入中飞布(年盘),叠加在固定的宅盘之上,用以判断当年的流年吉凶。',
    en: 'Each year a star enters the center and flies out (the annual plate), layered over the fixed house chart to read that year’s fortune.',
  },
  {
    id: 'dangling',
    term: '当令',
    aliases: ['旺气', '旺星'],
    category: 'xuankong',
    zh: '与当前元运相符、正得其时的星(九运中以 9 为当令),主吉、主旺。',
    en: 'The star in season with the current era (in Cycle 9, the 9 is in season) — prosperous and auspicious.',
  },
  {
    id: 'shengqi_star',
    term: '生气',
    aliases: ['进气'],
    category: 'xuankong',
    zh: '比当令更进一步的未来旺气(九运中以 1 为生气),宜引动、宜布局以迎将来之运。',
    en: 'The next, rising prosperity beyond the in-season star (in Cycle 9, the 1) — worth activating to court the coming era.',
  },
  {
    id: 'tuiqi',
    term: '退气',
    aliases: ['死气', '衰气'],
    category: 'xuankong',
    zh: '已经过时的星,气力衰退或主衰败,宜静不宜动。',
    en: 'A past-its-season star: weakened or declining energy — better left undisturbed.',
  },
  {
    id: 'wuhuang',
    term: '五黄',
    aliases: ['廉贞', '正关煞'],
    category: 'xuankong',
    zh: '九星中最凶的煞星,主灾祸、重病、意外。所到之宫最忌动土、装修,宜静、宜金泄。',
    en: 'The most malefic of the nine stars — disaster, grave illness, accidents. Its palace must not be disturbed (no construction); keep it still, drain it with metal.',
  },
  {
    id: 'erhei',
    term: '二黑',
    aliases: ['病符'],
    category: 'xuankong',
    zh: '主疾病、慢性病的病符星。逢之宜静,可用金泄其土气。',
    en: 'The "sickness" star — illness and chronic ailments. Keep its palace quiet; drain its earth with metal.',
  },

  // ── 八宅 ──────────────────────────────────────────────────
  {
    id: 'mingua',
    term: '命卦',
    aliases: ['本命卦'],
    category: 'bazhai',
    zh: '依出生年与性别推出的本命卦,分东四命(坎离震巽)与西四命(乾坤艮兑),用以配宅定吉凶方位。',
    en: 'Your personal trigram, from birth year and gender. It splits people into East-Four (Kan/Li/Zhen/Xun) and West-Four (Qian/Kun/Gen/Dui) groups, used to match you to favorable directions.',
  },
  {
    id: 'dongxi_si',
    term: '东四命',
    aliases: ['西四命', '东四宅', '西四宅'],
    category: 'bazhai',
    zh: '命卦与宅卦各分东四、西四两组。东四命宜住东四宅,西四命宜住西四宅,同组为相配(吉)。',
    en: 'Both people and houses fall into an East-Four or West-Four group. A match (East person in an East house) is auspicious.',
  },
  {
    id: 'youdian',
    term: '游年',
    aliases: ['八宅九星', '游年九星'],
    category: 'bazhai',
    zh: '由命卦(或宅卦)翻出的八方吉凶星:四吉为生气、天医、延年、伏位;四凶为绝命、五鬼、六煞、祸害。',
    en: 'The eight directional stars derived from your trigram. Four are lucky (Vitality, Heavenly Doctor, Longevity, Stability); four unlucky (Severance, Five Ghosts, Six Curses, Mishap).',
  },
  {
    id: 'shengqi_dir',
    term: '生气方',
    aliases: ['生气位'],
    category: 'bazhai',
    zh: '八宅第一大吉方(贪狼),主活力、进取、名声。宜安大门、书桌、主要活动区。',
    en: 'The top auspicious direction (Vitality). It drives energy, ambition and reputation — best for the main door, desk and active spaces.',
  },
  {
    id: 'tianyi',
    term: '天医',
    category: 'bazhai',
    zh: '主健康、贵人、财气的吉方(巨门)。最宜安床头朝向与厨灶,养身招贵。',
    en: 'The "Heavenly Doctor" direction — health, benefactors and steady income. Best for the head of the bed and the stove.',
  },
  {
    id: 'yannian',
    term: '延年',
    category: 'bazhai',
    zh: '主感情、婚姻、人际与寿元的吉方(武曲)。利于关系经营。',
    en: 'The "Longevity" direction — relationships, marriage and lifespan. Favorable for nurturing bonds.',
  },
  {
    id: 'fuwei',
    term: '伏位',
    category: 'bazhai',
    zh: '小吉、主稳定与守成的方位(辅弼)。宜静、宜安定。',
    en: 'A minor-lucky direction of stability and consolidation — calm and steady.',
  },
  {
    id: 'jueming',
    term: '绝命',
    aliases: ['绝命方'],
    category: 'bazhai',
    zh: '八宅最凶之方(破军),主重大变故、健康财运受损。可反用为安灶之处,以"以煞制煞"。',
    en: 'The most malefic direction (Severance) — major upheaval, harm to health and wealth. Can be turned to use by placing the stove there, "fighting fire with fire".',
  },
  {
    id: 'wugui',
    term: '五鬼',
    aliases: ['六煞', '祸害'],
    category: 'bazhai',
    zh: '八宅三凶方:五鬼主是非火灾、六煞主口舌桃花破耗、祸害主官非疾病。宜避主要起居。',
    en: 'The three lesser-malefic directions: Five Ghosts (conflict, fire), Six Curses (gossip, loss), Mishap (litigation, illness). Keep main living areas away from them.',
  },

  // ── 峦头形势 ──────────────────────────────────────────────
  {
    id: 'luantou',
    term: '峦头',
    aliases: ['形势', '峦头形势'],
    category: 'luantou',
    zh: '看山水地形等有形结构的学问,与"理气"(无形数理)相对。峦头为体,理气为用,二者须合参。',
    en: 'The study of visible form — mountains, water, terrain — as opposed to "principle" (the invisible numerology). Form is the body, principle the function; both must be read together.',
  },
  {
    id: 'sha',
    term: '砂',
    aliases: ['砂体'],
    category: 'luantou',
    zh: '穴场周围的山体、楼宇等隆起之物。砂主人丁与贵贱,环抱有情为吉,尖射逼压为凶。',
    en: 'The raised forms around a site — hills, buildings. "Sand" governs people and status; embracing forms are good, sharp or oppressive ones bad.',
  },
  {
    id: 'shui',
    term: '水',
    aliases: ['水法'],
    category: 'luantou',
    zh: '河流、道路、低处、开阔地等。水主财,环抱、缓聚为吉,直冲、反弓为凶。',
    en: 'Rivers, roads, low ground, open space. "Water" governs wealth; embracing or pooling water is good, straight-rushing or back-bowed water bad.',
  },
  {
    id: 'mingtang',
    term: '明堂',
    category: 'luantou',
    zh: '宅(穴)前开阔聚气之地。宜平正、宽敞、藏风聚气,忌逼仄、倾泻、杂乱。',
    en: 'The open, energy-gathering space in front of a site. It should be level, broad and sheltered — not cramped, sloping-away or cluttered.',
  },
  {
    id: 'sisha',
    term: '四象',
    aliases: ['朱雀', '玄武', '青龙', '白虎'],
    category: 'luantou',
    zh: '宅之四方之砂:后玄武宜有靠,前朱雀宜开阔,左青龙、右白虎宜环抱。四象俱全则藏风聚气。',
    en: 'The four guardians: Black Tortoise (rear, a backing), Vermilion Bird (front, openness), Azure Dragon (left) and White Tiger (right) embracing the sides. Complete, they shelter and gather energy.',
  },
  {
    id: 'longmai',
    term: '龙脉',
    aliases: ['来龙'],
    category: 'luantou',
    zh: '山势起伏连绵而来的走势,是气之来源。龙真则穴的,来龙有力则生气旺。',
    en: 'The undulating run of the mountains delivering energy to a site — the source of qi. A true, vigorous "dragon" brings strong vitality.',
  },
  {
    id: 'xingsha',
    term: '形煞',
    category: 'luantou',
    zh: '尖角、直冲、反弓、天斩、壁刀等不利的有形冲射,主血光、口舌、破财等具体应验。',
    en: 'Harmful physical forms — sharp corners, straight roads aimed at you, back-bowed curves, sky-cleaving gaps — read as concrete misfortunes.',
  },

  // ── 格局 ──────────────────────────────────────────────────
  {
    id: 'wangshan_wangxiang',
    term: '旺山旺向',
    category: 'gameju',
    zh: '旺山星到坐、旺向星到向的最佳格局,丁财两旺。需坐后有山、向前有水以应之。',
    en: 'The ideal pattern — the prosperous mountain star reaches the sitting palace and the prosperous facing star reaches the facing. Both people and wealth flourish, given a mountain behind and water ahead.',
    source: '《沈氏玄空学》',
  },
  {
    id: 'shangshan_xiashui',
    term: '上山下水',
    category: 'gameju',
    zh: '旺向星到坐、旺山星到向的破败格局,主损丁破财。须靠峦头(坐空朝满)补救。',
    en: 'The ruinous pattern — the prosperous stars land in the wrong places (facing star to the rear, mountain star to the front). It harms people and wealth, and needs landform rescue (empty rear, full front).',
    source: '《沈氏玄空学》',
  },
  {
    id: 'shuangxing_huixiang',
    term: '双星会向',
    category: 'gameju',
    zh: '山星与向星的旺气俱到向首。主旺财,宜向首见水、见动;人丁稍弱需补。',
    en: 'Both prosperous stars meet at the facing. Strong for wealth (place water/activity at the facing); people-fortune is weaker and needs support.',
  },
  {
    id: 'shuangxing_huizuo',
    term: '双星会坐',
    category: 'gameju',
    zh: '山星与向星的旺气俱到坐山。主旺丁,宜坐后见山、见静;财气稍弱需补。',
    en: 'Both prosperous stars meet at the sitting palace. Strong for people (place a mountain/quiet at the rear); wealth is weaker and needs support.',
  },
  {
    id: 'sanban_gua',
    term: '三般卦',
    aliases: ['父母三般卦', '连珠三般卦'],
    category: 'gameju',
    zh: '全盘各宫成 147、258、369(父母三般)或连续三数(连珠三般)的特殊贵格,通三元之气,主能逢凶化吉、富贵绵远。',
    en: 'A rare noble pattern where every palace forms 1-4-7, 2-5-8 or 3-6-9 (or three consecutive numbers). It links all three eras’ energy — turning ill to good, with lasting fortune.',
  },
  {
    id: 'heshi',
    term: '合十',
    category: 'gameju',
    zh: '山盘(或向盘)与运盘各宫之数相加皆为十的格局,主气运圆满流通、诸事和合。',
    en: 'A pattern where the mountain (or facing) plate and the cycle plate sum to ten in every palace — complete, flowing energy and harmony.',
  },
  {
    id: 'qixing_dajie',
    term: '七星打劫',
    category: 'gameju',
    zh: '借未来三元的旺气提前催发的高级格局。真打劫成于离、震、乾方,假打劫成于坎、巽、兑方,布置得当主速发大财。',
    en: 'An advanced pattern that "robs" future eras’ prosperity ahead of time. The "true" form forms at Li/Zhen/Qian, the "false" at Kan/Xun/Dui; set up well, it brings fast wealth.',
    source: '《沈氏玄空学》',
  },
  {
    id: 'chengmen',
    term: '城门诀',
    aliases: ['城门'],
    category: 'gameju',
    zh: '向首两旁之宫有水口(去来之处)且与元运相合者,可立旁气以收旺星,是重要的救应与催财之法。',
    en: 'When a "water mouth" sits beside the facing and accords with the era, you can tap that side-energy to capture the prosperous star — a key rescue and wealth-activation method.',
    source: '《沈氏玄空学》',
  },
  {
    id: 'fanfuyin',
    term: '反吟伏吟',
    aliases: ['伏吟', '反吟'],
    category: 'gameju',
    zh: '飞星与洛书原位之数相同为伏吟,与对宫相冲为反吟。主哭泣、动荡、凶咎,逢之宜化解。',
    en: 'When flying stars repeat the Luoshu’s native numbers (locked) or clash with the opposite palace (reversed). It brings grief and turmoil — best mitigated.',
  },

  // ── 形理整合 ──────────────────────────────────────────────
  {
    id: 'liqi',
    term: '理气',
    category: 'xingli',
    zh: '以玄空、八宅等数理方位推断的无形之气,与"峦头"(有形形势)相对。理气定吉凶之"数",峦头验吉凶之"形"。',
    en: 'The invisible energy inferred from numerology and direction (Flying Stars, Eight Mansions), as opposed to visible landform. Principle gives the "number" of fortune; form confirms it.',
  },
  {
    id: 'shanguan_shuiguan',
    term: '山管人丁水管财',
    category: 'xingli',
    zh: '玄空断事的总纲:山星配实体高耸之物则旺人丁、健康、关系;向星配水或开阔低处则旺财。形理须相配。',
    en: 'The master rule: mountain stars paired with solid, raised forms prosper people, health and bonds; facing stars paired with water or open low ground prosper wealth. Form and principle must agree.',
  },
  {
    id: 'lingzheng',
    term: '零正',
    aliases: ['零神', '正神'],
    category: 'xingli',
    zh: '当元失运之方为零神(宜见水),得运之方为正神(宜见山)。正神方见水、零神方见山则零正颠倒,吉凶反转。',
    en: 'The out-of-power direction is the "zero spirit" (wants water); the in-power direction is the "true spirit" (wants mountain). Reverse them — water where there should be mountain — and fortune inverts.',
  },
  {
    id: 'huasha',
    term: '化煞',
    aliases: ['救应', '化解'],
    category: 'xingli',
    zh: '以五行生泄、形势调整、器物布置来化解凶星、凶格的方法,如以金泄五黄土气、以水通关等。',
    en: 'Mitigation: defusing malefic stars and patterns through five-element draining, landform adjustment and placed objects — e.g. metal to drain the Five Yellow’s earth, water to bridge a clash.',
  },
] as const

/**
 * Tone-marked pinyin per term — shown to non-CJK readers so the (untranslatable)
 * term is at least pronounceable. zh readers don't need it.
 */
const FENG_TERM_PINYIN: Record<string, string> = {
  sanyuan_jiuyun: 'Sānyuán Jiǔyùn',
  yunpan: 'Yùnpán',
  shanpan: 'Shānpán',
  xiangpan: 'Xiàngpán',
  xiagua: 'Xiàguà',
  tigua: 'Tìguà',
  zibai: 'Zǐbái Fēixīng',
  dangling: 'Dānglìng',
  shengqi_star: 'Shēngqì',
  tuiqi: 'Tuìqì',
  wuhuang: 'Wǔhuáng',
  erhei: 'Èrhēi',
  mingua: 'Mìngguà',
  dongxi_si: 'Dōngsì Mìng',
  youdian: 'Yóunián',
  shengqi_dir: 'Shēngqì Fāng',
  tianyi: 'Tiānyī',
  yannian: 'Yánnián',
  fuwei: 'Fúwèi',
  jueming: 'Juémìng',
  wugui: 'Wǔguǐ',
  luantou: 'Luántóu',
  sha: 'Shā',
  shui: 'Shuǐ',
  mingtang: 'Míngtáng',
  sisha: 'Sìxiàng',
  longmai: 'Lóngmài',
  xingsha: 'Xíngshà',
  wangshan_wangxiang: 'Wàng Shān Wàng Xiàng',
  shangshan_xiashui: 'Shàng Shān Xià Shuǐ',
  shuangxing_huixiang: 'Shuāngxīng Huì Xiàng',
  shuangxing_huizuo: 'Shuāngxīng Huì Zuò',
  sanban_gua: 'Sānbān Guà',
  heshi: 'Héshí',
  qixing_dajie: 'Qīxīng Dǎjié',
  chengmen: 'Chéngmén Jué',
  fanfuyin: 'Fǎnyín Fúyín',
  liqi: 'Lǐqì',
  shanguan_shuiguan: 'Shān Guǎn Réndīng · Shuǐ Guǎn Cái',
  lingzheng: 'Língzhèng',
  huasha: 'Huàshà',
}

const TERM_BY_ID = new Map(FENG_TERMS.map((t) => [t.id, t]))

/** All surface forms (term + aliases) → term id, longest-first for greedy match. */
const SURFACE_TO_ID: ReadonlyArray<readonly [string, string]> = FENG_TERMS.flatMap((t) =>
  [t.term, ...(t.aliases ?? [])].map((s) => [s, t.id] as const)
).sort((a, b) => b[0].length - a[0].length)

export function getFengTerm(id: string): FengTerm | undefined {
  return TERM_BY_ID.get(id)
}

/** Localized definition for a term. zh-Hant→zh; ja→en (Yuel parity). */
export function fengTermDef(term: FengTerm, locale: Locale): string {
  return locale === 'zh' || locale === 'zh-Hant' ? term.zh : term.en
}

/** Pinyin for non-CJK readers; null for zh/zh-Hant (the glyph is read directly). */
export function fengTermPinyin(term: FengTerm, locale: Locale): string | null {
  if (locale === 'zh' || locale === 'zh-Hant') return null
  return FENG_TERM_PINYIN[term.id] ?? null
}

export function fengCategoryLabel(category: FengTermCategory, locale: Locale): string {
  const l = FENG_CATEGORY_LABEL[category]
  return locale === 'zh' || locale === 'zh-Hant' ? l.zh : l.en
}

export interface FengTextSegment {
  text: string
  /** Present when this segment is a recognized term (renders as a tap target). */
  termId?: string
}

/**
 * Split prose into segments, marking recognized terms (greedy longest-match).
 * Terms are matched as substrings — fine for CJK; surfaces contain no regex
 * metacharacters so the alternation is built directly.
 */
export function segmentFengText(text: string): FengTextSegment[] {
  if (!text) return []
  if (SURFACE_TO_ID.length === 0) return [{ text }]
  const pattern = new RegExp(`(${SURFACE_TO_ID.map(([s]) => s).join('|')})`, 'g')
  const surfaceMap = new Map(SURFACE_TO_ID)
  const out: FengTextSegment[] = []
  let last = 0
  for (const m of text.matchAll(pattern)) {
    const idx = m.index ?? 0
    if (idx > last) out.push({ text: text.slice(last, idx) })
    out.push({ text: m[0], termId: surfaceMap.get(m[0]) })
    last = idx + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last) })
  return out
}
