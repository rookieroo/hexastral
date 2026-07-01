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
    aliases: ['衰气'],
    category: 'xuankong',
    zh: '刚过时的星,气力开始衰退,主守成、不宜动,尚未到死气、煞气的凶险程度。',
    en: 'A just-past-season star: energy beginning to wane — hold, don’t disturb. Milder than the fully "dead" or "malefic" phases.',
  },
  {
    id: 'siqi',
    term: '死气',
    category: 'xuankong',
    zh: '早已过时、气力枯竭的星,主衰败、停滞、暮气。所到之宫宜静养、宜生扶,不宜作主要活动区。',
    en: 'A long-past, spent star — decline, stagnation, dead energy. Its palace should be kept quiet and nourished, not used as a main living area.',
  },
  {
    id: 'shaqi',
    term: '煞气',
    category: 'xuankong',
    zh: '过时最远、由衰转煞的星,不只是衰弱,更会主动作祸(病、灾、口舌)。宜五行泄化,忌引动。',
    en: 'The most out-of-season phase, turned from merely weak to actively harmful — bringing illness, mishap and conflict. Drain it by the five elements; never activate it.',
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

  // ── 九星本名(贪狼…右弼)─────────────────────────────────
  {
    id: 'yibai',
    term: '一白',
    aliases: ['贪狼', '一白贪狼'],
    category: 'xuankong',
    zh: '一白贪狼水星,主智慧、文思、名声、桃花与官贵。得令时主科名与人缘,失令时防漂泊、耗散。',
    en: 'The 1 White (Tanlang), a water star — wisdom, writing, fame, romance and rank. In season it brings scholarly name and popularity; out of season, drifting and loss.',
  },
  {
    id: 'sanbi',
    term: '三碧',
    aliases: ['禄存', '三碧禄存'],
    category: 'xuankong',
    zh: '三碧禄存木星,主争斗、是非、官非。得令时主进取、创业之勇,失令时最易招惹口舌、官司、破财。',
    en: 'The 3 Jade (Lucun), a wood star — strife, disputes, lawsuits. In season it drives enterprise and boldness; out of season it invites quarrels, litigation and loss.',
  },
  {
    id: 'silv',
    term: '四绿',
    aliases: ['文曲', '四绿文曲'],
    category: 'xuankong',
    zh: '四绿文曲木星,主文昌、科名、读书考试与桃花。得令利功名、姻缘,失令则主感情纠葛、优柔。',
    en: 'The 4 Green (Wenqu), a wood star — scholarship, exams and romance. In season it favors study and marriage; out of season, romantic entanglement and indecision.',
  },
  {
    id: 'liubai',
    term: '六白',
    aliases: ['武曲', '六白武曲'],
    category: 'xuankong',
    zh: '六白武曲金星,主权威、官贵、驿马与偏财。得令主升迁、掌权、进财,失令则防刚愎、破耗、头颈之疾。',
    en: 'The 6 White (Wuqu), a metal star — authority, office, travel and windfall wealth. In season it brings promotion and power; out of season, stubbornness, loss and head/neck ailments.',
  },
  {
    id: 'qichi',
    term: '七赤',
    aliases: ['破军', '七赤破军'],
    category: 'xuankong',
    zh: '七赤破军金星,得令时主口才、进财、偏财兴旺;失令时反主劫盗、刀伤、火灾、是非与破耗。',
    en: 'The 7 Red (Pojun), a metal star — in season, eloquence and wealth (including windfalls); out of season, robbery, knife wounds, fire, disputes and loss.',
  },
  {
    id: 'bbai',
    term: '八白',
    aliases: ['左辅', '八白左辅'],
    category: 'xuankong',
    zh: '八白左辅土星,当运时是最吉的财星,主置业、进财、旺丁,人财两旺。为近三元最重要的旺财星之一。',
    en: 'The 8 White (Zuofu), an earth star — the most auspicious wealth star when in power: property, income and thriving family, prospering both people and money.',
  },
  {
    id: 'jiuzi',
    term: '九紫',
    aliases: ['右弼', '九紫右弼', '九紫离火'],
    category: 'xuankong',
    zh: '九紫右弼火星,当元(九运)当令,主喜庆、名声、婚姻、桃花与文明之气。得令主升迁添丁喜事,失令防火厄、眼疾、血光。',
    en: 'The 9 Purple (Youbi), a fire star — in season for Cycle 9: celebration, fame, marriage and romance. In power it brings promotion and happy events; out of power, fire, eye trouble and bloodshed.',
  },

  // ── 飞星组合的应事领域(是非/桃花/官/文/盗/灾)──────────
  {
    id: 'domain_shifei',
    term: '是非',
    category: 'xuankong',
    zh: '飞星组合的应事领域之一:口舌、争执、流言、官司。多由三碧、七赤或斗牛煞等组合引动,宜化不宜催。',
    en: 'A star-combination "theme": quarrels, gossip, litigation and disputes. Often triggered by the 3, 7 or the 2-3 clash — better defused than activated.',
  },
  {
    id: 'domain_taohua',
    term: '桃花',
    category: 'xuankong',
    zh: '飞星组合的应事领域之一:感情、姻缘、异性缘,亦含烂桃花、外遇之患。多由一白、四绿或其组合引动。',
    en: 'A star-combination "theme": romance, marriage prospects and attraction — also the risk of affairs. Often driven by the 1, 4 or their pairing.',
  },
  {
    id: 'domain_guan',
    term: '官',
    aliases: ['官贵', '官非'],
    category: 'xuankong',
    zh: '飞星组合的应事领域之一:双关的"官"——得令主官职、名位、贵人(官贵),失令则转为官司、诉讼(官非)。',
    en: 'A star-combination "theme": the double-edged "office" — in season, rank, position and patrons; out of season, it turns into lawsuits and official trouble.',
  },
  {
    id: 'domain_wen',
    term: '文',
    aliases: ['文星', '文运'],
    category: 'xuankong',
    zh: '飞星组合的应事领域之一:文昌、学业、考试、著述与思辨之气,多系于一白、四绿及四一同宫之组合。',
    en: 'A star-combination "theme": scholarship, study, exams and writing — carried chiefly by the 1, the 4 and the 1-4 pairing.',
  },
  {
    id: 'domain_dao',
    term: '盗',
    aliases: ['盗劫', '失盗'],
    category: 'xuankong',
    zh: '飞星组合的应事领域之一:盗窃、劫掠、破财失物。多由七赤破军或三七穿心等组合引动,宜静宜化。',
    en: 'A star-combination "theme": theft, robbery and loss of property. Often driven by the 7 or the 3-7 clash — keep such palaces quiet and drained.',
  },
  {
    id: 'domain_zai',
    term: '灾',
    aliases: ['灾祸'],
    category: 'xuankong',
    zh: '飞星组合的应事领域之一:意外、火灾、血光、伤病等具体灾咎,多与五黄、二黑、七九或二五等凶组合相应。',
    en: 'A star-combination "theme": accidents, fire, bloodshed and injury — associated with the 5, 2, the 7-9 and 2-5 malefic combinations.',
  },

  // ── 起盘机制(元旦盘/洛书/河图/中宫)─────────────────────
  {
    id: 'yuandan_pan',
    term: '元旦盘',
    aliases: ['先天盘'],
    category: 'xuankong',
    zh: '以洛书九数固定分布于九宫的标准底盘(坎一、坤二、震三…离九),是一切飞星起盘的参照原位。反伏吟即以它为据。',
    en: 'The base layout: the nine Luoshu numbers fixed in their standard palaces (1 at Kan, 2 at Kun, 3 at Zhen … 9 at Li). It is the reference "home" position for all flying-star charts — locked/reversed stars are judged against it.',
  },
  {
    id: 'luoshu',
    term: '洛书',
    category: 'xuankong',
    zh: '相传出于洛水神龟背上的九数图,纵横斜三线相加皆为十五的九宫魔方阵。是玄空飞星排布九宫的数理来源。',
    en: 'The Luoshu — the nine-number magic square (every row, column and diagonal sums to 15), traditionally from the pattern on a divine turtle’s back. It is the numerical basis for arranging the nine palaces.',
  },
  {
    id: 'hetu',
    term: '河图',
    category: 'xuankong',
    zh: '相传出于黄河龙马背上的数图,以一六、二七、三八、四九、五十两两相配,表五行生成之序。与洛书并为理气之源。',
    en: 'The Hetu — the number diagram (traditionally from a dragon-horse of the Yellow River) that pairs 1-6, 2-7, 3-8, 4-9 and 5-10, expressing how the five elements are generated. With the Luoshu, it is a root of principle.',
  },
  {
    id: 'zhonggong',
    term: '中宫',
    category: 'xuankong',
    zh: '九宫正中的一宫(五数之位)。飞星起盘时,运星、山星、向星皆先入中宫再顺逆飞布八方,故中宫定全局之枢。',
    en: 'The center palace (the "5" position) of the nine-palace grid. Every chart is flown by first placing the cycle, mountain and facing stars in the center, then dispersing to the eight directions — so the center sets the whole chart.',
  },

  // ── 坐向定位(坐山/向首/二十四山/三元龙)─────────────────
  {
    id: 'zuoshan',
    term: '坐山',
    aliases: ['坐'],
    category: 'xuankong',
    zh: '宅的背向(后方)所对的方位,是山盘飞星的起算之处,主人丁、健康。与"向首"相对,坐后宜有靠山。',
    en: 'The "sitting" direction — the rear the building backs onto. It anchors the mountain plate (people, health) and wants a backing behind it. The opposite of the facing.',
  },
  {
    id: 'xiangshou',
    term: '向首',
    aliases: ['向'],
    category: 'xuankong',
    zh: '宅的正面(前方)所朝的方位,是向盘飞星的起算之处,主财禄,也是判断城门诀的所在。向前宜见水、见明堂。',
    en: 'The "facing" direction — the front the building looks out toward. It anchors the facing plate (wealth) and is where the "city gate" method is judged. It wants water and an open bright hall ahead.',
  },
  {
    id: 'ershisi_shan',
    term: '二十四山',
    category: 'xuankong',
    zh: '将罗盘周天 360° 均分为二十四个 15° 的方位(每卦三山),用以精确定坐向。立向落在哪一山,决定用下卦还是替卦。',
    en: 'The 24 Mountains: the compass’s 360° split into twenty-four 15° sectors (three per trigram), used to fix orientation precisely. Which of the 24 the facing lands in decides standard vs replacement-star method.',
  },
  {
    id: 'sanyuan_long',
    term: '三元龙',
    aliases: ['天元龙', '人元龙', '地元龙', '天元', '人元', '地元'],
    category: 'xuankong',
    zh: '二十四山按天元、人元、地元三组划分(每卦三山各属一元)。三元龙决定飞星的阴阳顺逆,也决定可否兼向及兼向的取舍。',
    en: 'The three "dragon" groups — Heaven, Human and Earth — dividing the 24 mountains (one per trigram-triplet). The dragon group sets each star’s yin/yang forward-or-reverse flight and governs whether and how a facing may be "shared".',
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
    zh: '八宅最凶之方(游年破军所化),主重大变故、健康财运受损。可反用为安灶之处,以"以煞制煞"。',
    en: 'The most malefic direction (Severance, the 破军-derived star) — major upheaval, harm to health and wealth. Can be turned to use by placing the stove there, "fighting fire with fire".',
  },
  {
    id: 'wugui',
    term: '五鬼',
    aliases: ['六煞', '祸害'],
    category: 'bazhai',
    zh: '八宅三凶方:五鬼主是非火灾、六煞主口舌桃花破耗、祸害主官非疾病。宜避主要起居。',
    en: 'The three lesser-malefic directions: Five Ghosts (conflict, fire), Six Curses (gossip, loss), Mishap (litigation, illness). Keep main living areas away from them.',
  },
  {
    id: 'zhaigua',
    term: '宅卦',
    category: 'bazhai',
    zh: '以宅的坐山所定的房屋本命卦,同分东四宅(坎离震巽)与西四宅(乾坤艮兑)。宅卦翻出房屋自身的八方游年吉凶。',
    en: 'The building’s own trigram, taken from its sitting direction — it too falls into an East-Four or West-Four house group. The house trigram yields the building’s own eight-direction good/bad map.',
  },
  {
    id: 'zhaiming_hecan',
    term: '宅命合参',
    aliases: ['宅命相配', '宅命不配', '宅命'],
    category: 'bazhai',
    zh: '把宅卦与住者命卦合参,看二者是否同属东四或西四:同组为"宅命相配"(吉),异组为"不配"(需以布局补救)。',
    en: 'Reading the house trigram together with the occupant’s trigram to see if they share a group: same group ("house-fate match") is auspicious; different groups ("mismatch") needs layout remedies.',
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

  // ── 山向星组合(名局)──────────────────────────────────────
  {
    id: 'combo_wenchang',
    term: '文昌',
    aliases: ['四一同宫', '一四同宫', '文昌位'],
    category: 'gameju',
    zh: '一白与四绿同宫(四一同宫)的吉组合,主文思、科名、考试、著述之利。宜作书房、书桌,催文昌、利学业。',
    en: 'The 1 and 4 stars meeting in one palace (the "1-4 pairing") — an auspicious combination for scholarship, exams and writing. Ideal for a study or desk to boost academic luck.',
  },
  {
    id: 'combo_douniu',
    term: '斗牛煞',
    aliases: ['二三斗牛煞'],
    category: 'gameju',
    zh: '二黑与三碧同宫(2-3)的凶组合,土木相克,主口舌是非、争讼、家人不和、破财。宜以火通关、以静化之。',
    en: 'The 2 and 3 stars together (2-3) — an earth-wood clash bringing quarrels, lawsuits, family discord and loss. Bridge it with fire and keep the palace quiet.',
  },
  {
    id: 'combo_erwu',
    term: '二五交加',
    aliases: ['二五', '五二'],
    category: 'gameju',
    zh: '二黑病符与五黄廉贞同宫(2-5)的大凶组合,二五皆土、凶土叠加,主重病、大灾、损丁。最忌动土,宜厚金泄化。',
    en: 'The 2 and 5 stars stacked (2-5) — a gravely inauspicious double-earth clash: serious illness, disaster and loss of life. Never disturb the palace; drain it heavily with metal.',
  },
  {
    id: 'combo_chuanxin',
    term: '穿心煞',
    aliases: ['三七穿心', '七三穿心'],
    category: 'gameju',
    zh: '三碧与七赤同宫(3-7)的凶组合,木金交战,主劫盗、官讼、刀伤破财。宜静宜化,忌在此开门动水。',
    en: 'The 3 and 7 stars together (3-7) — a wood-metal war bringing robbery, lawsuits and injury with loss. Keep the palace still; don’t site a door or moving water here.',
  },
  {
    id: 'combo_jiaojian',
    term: '交剑煞',
    aliases: ['六七交剑', '七六交剑'],
    category: 'gameju',
    zh: '六白与七赤同宫(6-7)的凶组合,两金相战如剑相交,主夫妻不和、刀伤、争斗、失窃。宜以水泄金气化之。',
    en: 'The 6 and 7 stars together (6-7) — two metals crossing like blades: spousal strife, knife wounds, conflict and theft. Drain the metal with water to defuse it.',
  },
  {
    id: 'combo_zihuang',
    term: '紫黄毒药',
    aliases: ['紫黄毒药煞'],
    category: 'gameju',
    zh: '九紫(或七赤)与五黄同宫(5-9 / 5-7)的凶组合,火助毒土,主重病、恶疾、血光。最忌动、忌红,宜金水泄化。',
    en: 'The 9 (or 7) meeting the 5 (5-9 / 5-7) — the "purple-yellow toxin": fire feeding poisonous earth, bringing serious or malignant illness and bloodshed. Avoid disturbance and red; drain with metal and water.',
  },
  {
    id: 'combo_qijiu',
    term: '七九合辙',
    aliases: ['七九', '九七'],
    category: 'gameju',
    zh: '七赤与九紫同宫(7-9)的组合,火金相激。得令主先富之喜,失令则主火灾、血光、口舌争讼。宜以土水化之。',
    en: 'The 7 and 9 stars together (7-9) — fire striking metal. In season it can bring quick prosperity; out of season, fire, bloodshed and disputes. Temper it with earth and water.',
  },
  {
    id: 'combo_chiyou',
    term: '蚩尤',
    aliases: ['蚩尤煞'],
    category: 'gameju',
    zh: '三碧木星所主的凶应,尤见于 3-3 相叠或三七(3-7)相会,主争斗、暴戾、劫盗、官非。取上古战神蚩尤为名,以静化为宜。',
    en: 'The "Chiyou" affliction of the 3 Jade wood star, seen especially in 3-3 doubled or 3-7 — named for the ancient war-god: violence, strife, theft and litigation. Best quieted.',
  },
  {
    id: 'combo_bingfu',
    term: '二黑病符',
    aliases: ['二二同宫', '病符组合'],
    category: 'gameju',
    zh: '二黑病符星双叠(2-2)的凶组合,病符加重,主久病、慢性病、妇疾。所到之宫宜静养,忌动土,宜金泄土气。',
    en: 'The 2 sickness-star doubled (2-2) — an intensified "sickness-tally" combination bringing prolonged, chronic or gynecological illness. Keep the palace restful, avoid construction, drain the earth with metal.',
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
  {
    id: 'sunding',
    term: '损丁',
    category: 'xingli',
    zh: '形理合参的凶断之一:山星失位或衰死星配实体高耸之物,主人丁不旺——健康受损、家人稀少或不睦。与"旺丁"相反。',
    en: 'A form-and-principle negative verdict: a mis-placed or dead mountain star paired with a solid raised form harms people — poor health, few or discordant family. The opposite of "prospering people".',
  },
  {
    id: 'pocai',
    term: '破财',
    category: 'xingli',
    zh: '形理合参的凶断之一:向星失位或衰死星配水、配动、配空,主财运受损——漏财、耗散、破耗。与"旺财"相反。',
    en: 'A form-and-principle negative verdict: a mis-placed or dead facing star paired with water, movement or emptiness harms wealth — leaking, draining and loss of money. The opposite of "prospering wealth".',
  },
  {
    id: 'dongxiong',
    term: '动凶',
    category: 'xingli',
    zh: '形理合参的凶断之一:凶星所在之宫又逢开门、动土、见水、见路等"动"象引发,主实际应凶(病、灾、是非)。宜静宜化,忌再引动。',
    en: 'A form-and-principle negative verdict: a malefic-star palace that is further stirred by a door, construction, water or road — so the ill actually manifests (illness, mishap, disputes). Keep it still and drain it; never activate it further.',
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
  // 星气(退气拆分)
  siqi: 'Sǐqì',
  shaqi: 'Shàqì',
  // 九星本名
  yibai: 'Yībái · Tānláng',
  sanbi: 'Sānbì · Lùcún',
  silv: 'Sìlǜ · Wénqǔ',
  liubai: 'Liùbái · Wǔqǔ',
  qichi: 'Qīchì · Pòjūn',
  bbai: 'Bābái · Zuǒfǔ',
  jiuzi: 'Jiǔzǐ · Yòubì',
  // 应事领域
  domain_shifei: 'Shìfēi',
  domain_taohua: 'Táohuā',
  domain_guan: 'Guān',
  domain_wen: 'Wén',
  domain_dao: 'Dào',
  domain_zai: 'Zāi',
  // 起盘机制
  yuandan_pan: 'Yuándàn Pán',
  luoshu: 'Luòshū',
  hetu: 'Hétú',
  zhonggong: 'Zhōnggōng',
  // 坐向定位
  zuoshan: 'Zuòshān',
  xiangshou: 'Xiàngshǒu',
  ershisi_shan: 'Èrshísì Shān',
  sanyuan_long: 'Sānyuán Lóng',
  // 八宅宅卦
  zhaigua: 'Zháiguà',
  zhaiming_hecan: 'Zháimìng Hécān',
  // 山向星组合(名局)
  combo_wenchang: 'Wénchāng · Sìyī Tónggōng',
  combo_douniu: 'Dǒuniú Shà',
  combo_erwu: 'Èrwǔ Jiāojiā',
  combo_chuanxin: 'Chuānxīn Shà',
  combo_jiaojian: 'Jiāojiàn Shà',
  combo_zihuang: 'Zǐhuáng Dúyào',
  combo_qijiu: 'Qījiǔ Hézhé',
  combo_chiyou: 'Chīyóu',
  combo_bingfu: 'Èrhēi Bìngfú',
  // 形理凶断
  sunding: 'Sǔndīng',
  pocai: 'Pòcái',
  dongxiong: 'Dòngxiōng',
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
